# SPEC — Person 1: Data & Intelligence Layer
### Phantom Pipeline · Слой 2 — Техническая спецификация
> Владелец: Person 1 · Зона: сигналы боли, профилирование, загрузка в Salesforge

---

## КОНТРАКТ С КОМАНДОЙ

**Ты производишь** → JSON профиль компании в таблицу `companies` со статусом `profiled`
**Person 2 читает** → `companies` где `status = profiled` → генерирует PDF + видео
**Person 3 читает** → `companies` где `status = content_generated` → запускает outreach

**День 1 обязательно:** создать таблицы + положить 3 мок-компании → разблокировать Person 2 и Person 3

---

## МОДУЛЬ 1 — SIGNAL HUNTER

### User Stories
- Как система, я хочу мониторить LinkedIn job postings, чтобы находить компании которые активно нанимают SDR-ов прямо сейчас
- Как система, я хочу мониторить Crunchbase, чтобы находить компании получившие Series A/B за последние 60 дней
- Как система, я хочу парсить G2 отзывы конкурентов (Instantly, Apollo, Lemlist), чтобы находить компании неудовлетворённые текущим решением
- Как система, я хочу избегать дублей, чтобы одна компания не попадала в pipeline дважды
- Как оператор, я хочу видеть список найденных компаний с pain_score, чтобы приоритизировать очередь обработки

### Модель данных
```sql
CREATE TABLE signals (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid REFERENCES companies(id) ON DELETE CASCADE,
  type          text NOT NULL CHECK (type IN (
                  'hiring_sdrs','funding','sdr_churn',
                  'g2_negative_review','competitor_ai_adoption')),
  detail        text NOT NULL,
  source        text NOT NULL,
  source_url    text,
  raw_data      jsonb DEFAULT '{}',
  pain_points   integer NOT NULL DEFAULT 0 CHECK (pain_points BETWEEN 0 AND 50),
  detected_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_signals_company ON signals(company_id);
CREATE INDEX idx_signals_type ON signals(type);
CREATE INDEX idx_signals_detected ON signals(detected_at DESC);
```

Pain points по типу сигнала:
```
hiring_sdrs              → 35 points
funding                  → 30 points
g2_negative_review       → 40 points
sdr_churn                → 25 points
competitor_ai_adoption   → 45 points
```

### API и серверная логика

```
POST /api/signals/scan
Body:    { source: 'linkedin' | 'crunchbase' | 'g2', limit: number }
Response 200: { scanned: number, found: number, queued: number }
Response 429: { error: 'rate_limit', retry_after: number }
Response 500: { error: string }

GET /api/signals
Query:   ?type=hiring_sdrs&from=2026-03-01&limit=50
Response 200: { signals: Signal[], total: number }
```

Внутренняя логика Scanner:
```typescript
// LinkedIn: поиск job postings через Leadsforge
POST https://api.leadsforge.ai/v1/search
Body: { query: 'Sales Development Representative', country: 'US', posted_within_days: 30 }
→ группируем по company_domain
→ фильтр: 2+ вакансии от одной компании
→ записываем сигнал типа hiring_sdrs

// Crunchbase: funding rounds
GET https://api.crunchbase.com/api/v4/searches/funding_rounds
Body: { funding_type: ['series_a','series_b'], announced_after: '60 days ago', location: 'USA' }
→ фильтр: B2B SaaS по описанию компании
→ записываем сигнал типа funding

// G2: scraper (нет официального API)
GET https://www.g2.com/products/{slug}/reviews?sort=recent&rating=1,2,3
→ парсим: reviewer_company_name, review_text, rating, date
→ записываем сигнал типа g2_negative_review
```

### Экраны и компоненты
Нет UI. Только CLI:
```bash
npx ts-node src/signal-hunter/cli.ts --source linkedin --limit 100
# Output:
# [10:00:01] Scanning LinkedIn...
# [10:00:04] Found 23 companies with 2+ SDR postings
# [10:00:04] New: 18 | Duplicate: 5 | Queued: 18
```

### Бизнес-логика
- Компания считается дублем если `domain` уже есть в таблице `companies` с `created_at > now() - 30 days`
- Если компания уже есть но старше 30 дней → добавляем новый сигнал, не создаём новую запись
- pain_score компании = сумма pain_points всех её сигналов, максимум 100
- Сигналы старше 90 дней автоматически архивируются (статус не меняется, только флаг `archived = true`)
- Запуск сканера: не чаще 1 раза в 6 часов на источник (rate limiting)

### Крайние случаи
- LinkedIn вернул 429 → exponential backoff: 30s, 60s, 120s, затем skip и log
- Crunchbase API недоступен → пропустить итерацию, записать в `scan_errors`, не крашить процесс
- G2 изменил HTML-структуру → scraper возвращает 0 результатов → алерт в Slack, fallback на кэш
- Компания найдена по двум источникам одновременно → два отдельных сигнала, один `company` record
- domain парсится некорректно (например `linkedin.com/company/stripe` вместо `stripe.com`) → нормализация через regex: `/company\/([^\/]+)/` → lookup Clearbit

---

## МОДУЛЬ 2 — COMPANY PROFILER

### User Stories
- Как система, я хочу обогатить компанию данными из Leadsforge, чтобы знать размер команды, индустрию и location
- Как система, я хочу найти decision maker (VP Sales / Head of Sales / Founder), чтобы Person 3 мог отправить письмо конкретному человеку
- Как система, я хочу определить tech stack компании из job descriptions, чтобы знать какой outreach инструмент они сейчас используют
- Как система, я хочу рассчитать monthly_loss_estimate, чтобы PDF и Live Counter показывали реальные цифры
- Как оператор, я хочу получить алерт если enrichment завершился с неполными данными, чтобы не отправлять письмо без email decision maker

### Модель данных
```sql
CREATE TABLE companies (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                   text NOT NULL,
  domain                 text UNIQUE NOT NULL,
  logo_url               text,
  industry               text,
  size                   integer,
  location               text,
  icp                    text,
  acv_estimate           integer,
  sdr_count              integer DEFAULT 1 CHECK (sdr_count > 0),
  pain_score             integer DEFAULT 0 CHECK (pain_score BETWEEN 0 AND 100),
  decision_maker         jsonb,
  -- { name: text, title: text, email: text, linkedin_url: text }
  tech_stack             jsonb DEFAULT '[]',
  -- ['Instantly', 'HubSpot', 'Apollo']
  competitor_using_ai    text,
  monthly_loss_estimate  integer,
  -- рассчитывается: sdr_count * 1903
  salesforce_contact_id  text,
  status                 text NOT NULL DEFAULT 'detected'
    CHECK (status IN (
      'detected','profiled','content_generated',
      'outreach_sent','page_opened','responded',
      'pilot_running','pilot_results_ready','demo_booked','dnc_blocked'
    )),
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_companies_domain  ON companies(domain);
CREATE INDEX idx_companies_status  ON companies(status);
CREATE INDEX idx_companies_created ON companies(created_at DESC);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON companies
  FOR ALL TO service_role USING (true);
```

### API и серверная логика

```
POST /api/companies/profile
Body:    { company_id: uuid }
Response 200: { company: Company, enrichment_score: number }
Response 404: { error: 'company_not_found' }
Response 422: { error: 'enrichment_failed', missing: string[] }

GET /api/companies
Query:   ?status=profiled&limit=20&offset=0
Response 200: { companies: Company[], total: number }

GET /api/companies/:id
Response 200: { company: Company, signals: Signal[] }
Response 404: { error: 'not_found' }
```

Внутренняя логика Profiler:
```typescript
async function profileCompany(companyId: string): Promise<Company> {
  // 1. Leadsforge — базовые данные
  POST https://api.leadsforge.ai/v1/companies/enrich
  Body: { domain: company.domain }
  → name, industry, size, location, logo_url

  // 2. Leadsforge — decision maker
  POST https://api.leadsforge.ai/v1/contacts/search
  Body: { domain, titles: ['VP of Sales','Head of Sales','CRO','Founder','CEO'], limit: 1 }
  → { name, title, email, linkedin_url }

  // 3. Tech stack из Leadsforge job descriptions
  GET https://api.leadsforge.ai/v1/jobs?domain={domain}&title=SDR
  → парсим body: ищем ['Instantly','Apollo','Lemlist','Outreach','Salesloft','HubSpot']

  // 4. Расчёт потерь
  monthly_loss = sdr_count * 1903
  // Формула: ($60k / 52 / 40) * 3h * 22 days = $1,903/SDR/month

  // 5. Сохраняем + обновляем статус
  UPDATE companies SET status = 'profiled', ...enriched_data WHERE id = companyId
}
```

### Экраны и компоненты
Нет UI. CLI:
```bash
npx ts-node src/profiler/cli.ts --company-id uuid
# [✓] Leadsforge: name=Acme, size=45, industry=HR Tech
# [✓] Decision maker: John Smith <john@acme.com> VP Sales
# [✓] Tech stack: ['Instantly', 'HubSpot']
# [✓] monthly_loss_estimate: $5,709
# [✓] Status → profiled
```

### Бизнес-логика
- enrichment_score: 0–100. Считается: email DM найден (+40), name/industry/size (+20), logo_url (+10), tech_stack (+10), icp (+10), location (+10)
- Если enrichment_score < 60 → статус остаётся `detected`, алерт оператору, не переходим к генерации
- sdr_count: если Leadsforge не вернул точное число → используем эвристику: size < 30 → 1 SDR, 30–100 → 3 SDR, 100–200 → 6 SDR
- decision_maker.email обязателен: без него компания не идёт дальше по pipeline
- logo_url: если Leadsforge не вернул → fallback `https://logo.clearbit.com/{domain}`

### Крайние случаи
- Leadsforge не нашёл decision maker → поискать через LinkedIn scraper по домену, если снова нет → enrichment_score < 60 → стоп
- email найден но невалиден (нет @, нет домена) → enrichment_score < 60 → стоп
- Компания — агентство или нанимает SDR для клиентов (признак: industry = 'Staffing') → пропустить, добавить в DNC
- domain содержит поддомен (blog.acme.com) → нормализовать до acme.com перед enrichment
- Leadsforge rate limit → очередь: обрабатываем не более 10 компаний в минуту

---

## МОДУЛЬ 3 — SALESFORGE CONTACTS BRIDGE

### User Stories
- Как система, я хочу проверить email в DNC-листе Salesforge перед загрузкой, чтобы не нарушить compliance
- Как система, я хочу загрузить контакт в Salesforge с custom variables, чтобы Person 3 мог вставить pdf_url и video_url в письмо
- Как система, я хочу сохранить salesforce_contact_id, чтобы Person 3 мог добавить контакт в sequence
- Как оператор, я хочу видеть что контакт успешно загружен, чтобы быть уверенным что pipeline не сломался

### Модель данных
```sql
-- Расширение таблицы companies (уже создана выше)
-- salesforce_contact_id: text — заполняется после успешной загрузки

CREATE TABLE upload_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid REFERENCES companies(id),
  action        text NOT NULL, -- 'dnc_check' | 'validation' | 'bulk_upload'
  status        text NOT NULL, -- 'success' | 'failed' | 'skipped'
  response_data jsonb,
  error_message text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
```

### API и серверная логика

```
POST /api/salesforge/upload
Body:    { company_id: uuid }
Response 200: { contact_id: string, status: 'uploaded' }
Response 409: { error: 'dnc_blocked', email: string }
Response 422: { error: 'validation_failed', reason: string }
Response 502: { error: 'salesforge_api_error', details: string }
```

Внутренняя логика:
```typescript
// Шаг 1: DNC check
POST https://api.salesforge.ai/public/v2/workspaces/{id}/dnc/check
Body: { emails: [decision_maker.email] }
→ если в DNC → статус компании = 'dnc_blocked' → стоп

// Шаг 2: Email validation
POST https://api.salesforge.ai/public/v2/workspaces/{id}/contacts/validation/start
Body: { emails: [decision_maker.email] }
→ ждём результат (polling каждые 5s, timeout 60s)
→ если invalid → стоп, log

// Шаг 3: Bulk upload с custom vars
POST https://api.salesforge.ai/public/v2/workspaces/{id}/contacts/bulk
Body: {
  contacts: [{
    email: decision_maker.email,
    firstName: decision_maker.name.split(' ')[0],
    lastName:  decision_maker.name.split(' ')[1] || '',
    linkedinUrl: decision_maker.linkedin_url,
    customVars: {
      company_name:        company.name,
      industry:            company.industry,
      monthly_loss:        company.monthly_loss_estimate,
      sdr_count:           company.sdr_count,
      pain_signal:         signals[0].detail,
      personal_page_url:   'https://phantom-pipeline.com/' + slug,
      pdf_url:             '',   // заполнит Person 2
      video_url:           ''    // заполнит Person 2
    }
  }]
}
→ сохраняем salesforce_contact_id
→ статус компании остаётся 'profiled' (меняет Person 2 на content_generated)
```

### Экраны и компоненты
Нет UI. CLI + logs:
```bash
npx ts-node src/salesforge-bridge/cli.ts --company-id uuid
# [✓] DNC check: clean
# [✓] Email validation: valid
# [✓] Uploaded to Salesforge: contact_id=cnt_abc123
# [✓] salesforce_contact_id saved
```

### Бизнес-логика
- DNC check обязателен перед каждой загрузкой — нельзя пропустить даже если "уверены"
- custom vars `pdf_url` и `video_url` загружаются пустыми — Person 2 обновит их через Salesforge API когда сгенерирует контент
- Если validation вернул `risky` (не `invalid`) → загружаем с флагом `skip_bounce_check: false` (Salesforge проверит при отправке)
- Один контакт = одна компания. Если несколько decision makers → загружаем только того с наивысшим scoring (VP > Head > Director > Founder)

### Крайние случаи
- Salesforge API вернул 429 → ждём 60s, повторяем, максимум 3 попытки, затем log + alert
- Email validation timeout (> 60s) → log warning, загружаем без валидации с флагом
- contact_id не вернулся в ответе → retry через 10s, если снова нет → alert оператору
- Компания уже загружена (salesforce_contact_id заполнен) → пропустить, не дублировать

---

## ПОРЯДОК ВЫПОЛНЕНИЯ

**День 1 (разблокировать команду):**
- [ ] Создать таблицы: `companies`, `signals`, `upload_log` (миграции в `supabase/migrations/`)
- [ ] Создать `src/mocks/companies.json` — 3 компании с полными данными
- [ ] Зафиксировать `src/types/company.ts` — интерфейсы Company, Signal
- [ ] Сообщить Person 2 и Person 3: "мок-данные готовы"

**День 2–3:**
- [ ] Signal Hunter: LinkedIn (Leadsforge) + Crunchbase
- [ ] Company Profiler: enrichment + расчёт monthly_loss
- [ ] Тест: 5 реальных компаний прошли полный Модуль 1 + 2

**День 4–5:**
- [ ] Salesforge Contacts Bridge: DNC + validation + bulk upload
- [ ] Signal Hunter: G2 scraper
- [ ] Тест сквозной: сигнал → профиль → Salesforge contact_id

**День 6–7:**
- [ ] Интеграция: Person 2 генерирует из твоих данных → проверить что поля совпадают
- [ ] Интеграция: Person 3 запускает sequence → проверить что contact_id корректный
- [ ] 20 реальных компаний в Supabase со статусом `profiled`

---

## ОКРУЖЕНИЕ

```env
SALESFORGE_WORKSPACE_ID=wks_7cksiak4q2sqw6mawjut
SALESFORGE_API_KEY=...
LEADSFORGE_API_KEY=...
CRUNCHBASE_API_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```
