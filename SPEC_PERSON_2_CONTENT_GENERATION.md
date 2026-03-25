# SPEC — Person 2: Content Generation Layer
### Phantom Pipeline · Слой 2 — Техническая спецификация
> Владелец: Person 2 · Зона: PDF отчёт, Sora-видео, живая страница счётчика

---

## КОНТРАКТ С КОМАНДОЙ

**Ты читаешь** → `companies` где `status = profiled` (Person 1 заполнил)
**Ты производишь** → `reports` с `pdf_url + video_url + personal_page_url` + обновляешь `status = content_generated`
**Person 3 читает** → `reports` где `status = ready` → берёт `pdf_url`, `video_url`, `personal_page_url` для писем

**День 1:** получить `src/mocks/companies.json` от Person 1 и сразу начать на мок-данных

---

## МОДУЛЬ 1 — PDF GENERATOR (Pipeline Autopsy Report)

### User Stories
- Как система, я хочу генерировать персонализированный PDF с логотипом компании и их цифрами, чтобы получатель видел отчёт именно о своей компании
- Как система, я хочу использовать Claude API для создания текста отчёта, чтобы каждый PDF был уникальным и конкретным
- Как система, я хочу загружать PDF в Supabase Storage и возвращать публичный URL, чтобы Person 3 мог вставить ссылку в письмо
- Как получатель, я хочу видеть конкретные цифры (не абстракции), чтобы понять реальный масштаб своих потерь
- Как оператор, я хочу чтобы PDF генерировался за < 30 секунд, чтобы pipeline не создавал bottleneck

### Модель данных
```sql
CREATE TABLE reports (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          uuid REFERENCES companies(id) UNIQUE NOT NULL,
  pdf_url             text,
  video_url           text,
  personal_page_slug  text UNIQUE NOT NULL,
  personal_page_url   text NOT NULL,
  win_card_url        text,
  status              text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','generating','ready','failed')),
  failure_reason      text,
  generated_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_reports_company ON reports(company_id);
CREATE INDEX idx_reports_status  ON reports(status);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON reports
  FOR ALL TO service_role USING (true);
```

### API и серверная логика

```
POST /api/reports/generate
Body:    { company_id: uuid }
Response 200: { report_id: uuid, status: 'generating' }
Response 404: { error: 'company_not_found' }
Response 409: { error: 'report_already_exists', report_id: uuid }
Response 422: { error: 'company_not_profiled' }

GET /api/reports/:company_id
Response 200: { report: Report }
Response 404: { error: 'not_found' }
```

Внутренняя логика генерации:

```typescript
// Шаг 1: Генерация контента через Claude API
POST https://api.anthropic.com/v1/messages
Headers: { 'x-api-key': ANTHROPIC_API_KEY }
Body: {
  model: 'claude-sonnet-4-20250514',
  max_tokens: 2000,
  system: `You are a senior B2B pipeline analyst.
           Generate a Pipeline Autopsy Report as JSON only.
           No markdown, no preamble. Pure JSON.`,
  messages: [{
    role: 'user',
    content: `Company: ${name}, Industry: ${industry},
              Size: ${size}, SDRs: ${sdr_count},
              Monthly loss: $${monthly_loss_estimate},
              Pain signal: ${signals[0].detail},
              Tech stack: ${tech_stack.join(', ')}
              
              Return exactly this JSON structure:
              {
                "headline": string (one shocking sentence, max 15 words),
                "diagnosis": string (2-3 sentences, specific to their situation),
                "monthly_loss_dollars": number,
                "annual_loss_dollars": number,
                "hours_wasted_monthly": number,
                "demos_missed_monthly": number,
                "competitor_insight": string (what companies in their space are doing),
                "solution_preview": string (what automated pipeline looks like for them),
                "cta_text": string (personalized call to action, max 20 words)
              }`
  }]
}
Response 200: content[0].text → JSON.parse()

// Шаг 2: Рендеринг HTML → PDF через Puppeteer
const browser = await puppeteer.launch({ args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.setContent(buildReportHTML(company, content), { waitUntil: 'networkidle0' })
const pdfBuffer = await page.pdf({
  format: 'A4',
  printBackground: true,
  margin: { top: '0', right: '0', bottom: '0', left: '0' }
})
await browser.close()

// Шаг 3: Загрузка в Supabase Storage
const { data } = await supabase.storage
  .from('reports')
  .upload(`${slug}.pdf`, pdfBuffer, { contentType: 'application/pdf', upsert: true })
const { data: { publicUrl } } = supabase.storage.from('reports').getPublicUrl(`${slug}.pdf`)
```

HTML шаблон PDF (5 страниц):
```html
<!-- Страница 1: Обложка -->
<div class="page cover">
  <img src="${logo_url}" class="company-logo">
  <h1>${name}</h1>
  <h2>Hidden Revenue Leak Report · Q1 2026</h2>
  <div class="headline-box">${content.headline}</div>
</div>

<!-- Страница 2: Цифры потерь -->
<div class="page metrics">
  <h3>The Diagnosis</h3>
  <p>${content.diagnosis}</p>
  <div class="metrics-grid">
    <div class="metric">${content.monthly_loss_dollars} <span>$/month lost</span></div>
    <div class="metric">${content.annual_loss_dollars} <span>$/year impact</span></div>
    <div class="metric">${content.hours_wasted_monthly}h <span>wasted monthly</span></div>
    <div class="metric">${content.demos_missed_monthly} <span>demos missed/mo</span></div>
  </div>
</div>

<!-- Страница 3: Что делают другие -->
<div class="page competitor">
  <h3>What's Happening in Your Space</h3>
  <p>${content.competitor_insight}</p>
</div>

<!-- Страница 4: Решение -->
<div class="page solution">
  <h3>What ${name}'s Pipeline Could Look Like</h3>
  <p>${content.solution_preview}</p>
</div>

<!-- Страница 5: CTA -->
<div class="page cta">
  <p>${content.cta_text}</p>
  <div class="reply-box">
    Reply <strong>YES</strong> — we'll show you how we calculated this in 8 minutes
  </div>
  <p class="page-link">Or visit: phantom-pipeline.com/${slug}</p>
</div>
```

### Экраны и компоненты
Нет UI. CLI:
```bash
npx ts-node src/pdf-generator/cli.ts --company-id uuid
# [✓] Claude API: content generated (2.3s)
# [✓] Puppeteer: PDF rendered, 5 pages (4.1s)
# [✓] Supabase Storage: uploaded
# [✓] URL: https://[project].supabase.co/storage/v1/object/public/reports/acme-corp.pdf
```

### Бизнес-логика
- `personal_page_slug` = `company.domain.replace(/\./g, '-')` → `stripe.com` → `stripe-com`
- `annual_loss_dollars` = `monthly_loss_dollars * 12`
- `hours_wasted_monthly` = `sdr_count * 3 * 22` (3 часа в день, 22 рабочих дня)
- `demos_missed_monthly` = `Math.round(hours_wasted_monthly / 2.5)` (среднее время на 1 demo = 2.5ч)
- Если `logo_url` недоступен (404) → fallback: текстовый логотип из первых букв названия
- PDF должен генерироваться за < 30 секунд иначе timeout + статус `failed`
- После успешной генерации: обновить `custom_vars` в Salesforge для этого контакта: `pdf_url = publicUrl`

### Крайние случаи
- Claude API вернул не JSON (пришёл текст) → `JSON.parse()` упадёт → retry с явным указанием "output ONLY valid JSON"
- Puppeteer не может загрузить logo_url (CORS, 404) → заменить на `data:image/svg+xml` с инициалами компании
- PDF > 5MB → сжать изображения через `sharp` перед вставкой в HTML
- Supabase Storage quota exceeded → alert оператору, статус `failed`
- Компания уже имеет отчёт (report exists) → не перегенерировать, вернуть 409 с существующим `report_id`

---

## МОДУЛЬ 2 — SORA VIDEO GENERATOR

### User Stories
- Как система, я хочу генерировать 90-секундный видеоролик про конкретную компанию через Sora AI, чтобы получатель увидел "кино о себе"
- Как система, я хочу сначала сгенерировать script через Claude, чтобы Sora получил чёткое описание каждой сцены
- Как система, я хочу загрузить видео в CDN и вернуть URL, чтобы Person 3 мог вставить превью в письмо
- Как система, я хочу иметь fallback на Heygen если Sora недоступен, чтобы pipeline не останавливался

### Модель данных
```sql
-- Добавляем поля в таблицу reports (уже создана выше)
ALTER TABLE reports ADD COLUMN IF NOT EXISTS video_script jsonb;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS video_provider text DEFAULT 'sora'
  CHECK (video_provider IN ('sora','heygen','skipped'));
```

### API и серверная логика

```
POST /api/video/generate
Body:    { company_id: uuid }
Response 200: { report_id: uuid, status: 'generating', provider: 'sora' | 'heygen' }
Response 404: { error: 'company_not_found' }
Response 503: { error: 'video_provider_unavailable', fallback: 'heygen' }
```

Внутренняя логика:

```typescript
// Шаг 1: Генерация script через Claude
POST https://api.anthropic.com/v1/messages
Body: {
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1500,
  system: 'Write a 90-second B2B video script for Sora AI. Output ONLY valid JSON.',
  messages: [{
    role: 'user',
    content: `Create script for ${company.name} (${company.industry}).
              ${company.sdr_count} SDRs, $${company.monthly_loss_estimate}/month loss.
              
              Return JSON:
              { "scenes": [
                { "duration_seconds": 15,
                  "visual": "detailed scene for Sora (max 50 words)",
                  "narration": "voiceover text",
                  "on_screen_text": "text overlay" }
              ]}`
  }]
}

// Шаг 2: Sora API (primary)
POST https://api.openai.com/v1/videos/generations
Headers: { Authorization: Bearer OPENAI_API_KEY }
Body: {
  model: 'sora-1.0',
  prompt: scenes.map(s => `${s.duration_seconds}s: ${s.visual}`).join('\n'),
  duration: 90,
  resolution: '1080p'
}
→ polling job_id до завершения (timeout: 5 минут)
→ download mp4 → upload Supabase Storage → return url

// Fallback: Heygen (если Sora 503 или timeout)
POST https://api.heygen.com/v2/video/generate
Body: { script: scenes[0].narration, ... }
→ video_provider = 'heygen'
```

### Экраны и компоненты
Нет UI. CLI:
```bash
npx ts-node src/video-generator/cli.ts --company-id uuid
# [✓] Script generated by Claude (1.8s) — 5 scenes
# [✓] Sora API: job_id=job_abc123
# [⏳] Waiting for render... (45s)
# [✓] Video ready: 90s, 1080p
# [✓] Uploaded: acme-corp-video.mp4
# [✓] URL saved to reports.video_url
```

### Бизнес-логика
Структура 5 сцен (фиксированная):
- Сцена 1 (0–15s): SDR за столом, ручная работа, часы тикают
- Сцена 2 (15–40s): счётчик денег падает, конкуренты растут
- Сцена 3 (40–65s): та же команда, автоматический pipeline, calendar заполняется
- Сцена 4 (65–80s): команда закрывает сделки
- Сцена 5 (80–90s): логотип компании + CTA

После успешной генерации: обновить `custom_vars` в Salesforge: `video_url = publicUrl`

### Крайние случаи
- Sora недоступен (503) → немедленный переход на Heygen, `video_provider = 'heygen'`
- Sora timeout > 5 минут → отменить job, переключиться на Heygen
- Heygen тоже недоступен → `video_provider = 'skipped'`, `video_url = null`, pipeline продолжается без видео
- Script от Claude содержит неподходящий контент (редко) → retry с более строгим system prompt
- Видео > 100MB → compress через `ffmpeg` до 50MB перед загрузкой

---

## МОДУЛЬ 3 — LIVE COUNTER PAGE

### User Stories
- Как получатель письма, я хочу видеть тикающий счётчик денег которые моя компания теряет прямо сейчас, чтобы физически ощутить масштаб проблемы
- Как получатель, я хочу видеть мой PDF отчёт и видео прямо на странице, чтобы не искать аттачменты в письме
- Как система, я хочу знать когда страница открыта, чтобы Person 3 мог ускорить follow-up
- Как получатель, я хочу одним кликом запустить 48H Free Pilot, чтобы не заполнять длинные формы
- Как жюри хакатона, я хочу увидеть как выглядит персональная страница компании, чтобы оценить продукт

### Модель данных
```sql
CREATE TABLE page_views (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid REFERENCES companies(id),
  ip_hash     text,
  user_agent  text,
  viewed_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_page_views_company ON page_views(company_id);
```

### API и серверная логика

```
GET /[slug]
→ Next.js getStaticProps: загружает company + report из Supabase
→ SSG с revalidate: 60 секунд
Response 200: HTML страница с данными компании
Response 404: страница "Company not found"

POST /api/page-opened
Body:    { company_id: uuid, slug: string }
Response 200: { ok: true }
→ Записывает в page_views
→ Обновляет companies.status = 'page_opened' если был 'outreach_sent'
→ Создаёт webhook event для Person 3 (он ускорит follow-up)

POST /api/start-pilot
Body:    { company_id: uuid, icp_description: string, email: string }
Response 200: { ok: true, message: 'Pilot starting within 1 hour' }
Response 400: { error: 'icp_description_required' }
→ Сохраняет запрос в pilot_requests
→ Обновляет companies.status = 'responded'
→ Триггерит Person 3 через webhook
```

Next.js getStaticProps:
```typescript
export async function getStaticProps({ params }) {
  const slug = params.slug as string
  const domain = slug.replace(/-/g, '.')  // stripe-com → stripe.com

  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('domain', domain)
    .single()

  if (!company) return { notFound: true }

  const { data: report } = await supabase
    .from('reports')
    .select('*')
    .eq('company_id', company.id)
    .single()

  return {
    props: { company, report },
    revalidate: 60
  }
}

export async function getStaticPaths() {
  const { data } = await supabase
    .from('reports')
    .select('personal_page_slug')
    .eq('status', 'ready')

  return {
    paths: data.map(r => ({ params: { slug: r.personal_page_slug } })),
    fallback: 'blocking'
  }
}
```

### Экраны и компоненты

**Компонент LiveCounter:**
```typescript
// props: monthlyLoss: number, sdrCount: number
const lossPerSecond = monthlyLoss / 30 / 24 / 3600

useEffect(() => {
  // Сообщаем бэкенду что страница открыта
  fetch('/api/page-opened', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ company_id, slug })
  })

  const interval = setInterval(() => {
    setCounter(prev => prev + lossPerSecond)
  }, 1000)
  return () => clearInterval(interval)
}, [])

// Рендер:
// $0.00 → $0.00 → ... тикает каждую секунду
// Based on: {sdrCount} SDRs × 3hrs/day manual outreach
```

**Страница целиком — секции:**
1. Hero: заголовок + тикающий счётчик + CTA "Book Demo"
2. PDF превью (встроенный iframe или кнопка Download)
3. Видео секция (autoplay muted, только если video_url не null)
4. Форма "Start 48H Free Pilot" (одно поле: icp_description + email)
5. Footer: "Powered by Salesforge · Agent Frank"

### Бизнес-логика
- Счётчик начинает с $0.00 в момент открытия страницы (не накопленные потери, а текущие)
- `page_opened` webhook срабатывает один раз на уникальный `ip_hash` (не на каждый refresh)
- Форма пилота: `icp_description` минимум 10 символов, иначе 400
- Если `report.video_url = null` → секция видео не отображается, не показываем сломанный плеер
- Slug нормализация: `stripe.com` → `stripe-com`, `my-company.io` → `my-company-io`

### Крайние случаи
- Slug не найден в БД → 404 с сообщением "This report has expired or doesn't exist"
- Supabase недоступен при getStaticProps → fallback на cached версию (next.js ISR), не крашить
- PDF URL expired (Supabase Storage signed URL) → использовать public URL (не signed)
- Пользователь открыл страницу с VPN/proxy → ip_hash всё равно считается, дубль не страшен
- `monthly_loss_estimate = null` (данные неполные) → показываем счётчик с дефолтным значением 1903 (1 SDR)

---

## ПОРЯДОК ВЫПОЛНЕНИЯ

**День 1:**
- [ ] Получить `src/mocks/companies.json` от Person 1
- [ ] Создать таблицу `reports` (миграция в `supabase/migrations/`)
- [ ] Настроить Next.js проект: `phantom-pipeline.com`
- [ ] HTML шаблон PDF — статичный (без Claude API пока)

**День 2–3:**
- [ ] PDF Generator: Claude API → JSON → Puppeteer → Supabase Storage
- [ ] Live Counter Page: тикает на мок-данных, `/api/page-opened` работает
- [ ] Тест: мок-компания → PDF сгенерирован → страница открывается

**День 4–5:**
- [ ] Sora Video Generator (или Heygen fallback)
- [ ] Live Counter: реальные данные из Supabase, форма пилота отправляет webhook
- [ ] Обновление custom_vars в Salesforge после генерации

**День 6–7:**
- [ ] Интеграция с Person 1: реальные компании → реальные PDF
- [ ] Интеграция с Person 3: он читает `pdf_url` и `video_url` из `reports`
- [ ] Проверить: `companies.status` меняется на `content_generated` после генерации

---

## ОКРУЖЕНИЕ

```env
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
HEYGEN_API_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_HUBSPOT_BOOKING_URL=https://meetings-eu1.hubspot.com/franksondors/
PERSON_3_WEBHOOK_URL=https://...   # Person 3 даст этот URL
```
