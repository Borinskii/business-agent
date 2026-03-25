# PROJECT_IDEA.md — Phantom Pipeline
### Hackathon: Double The Pipe, Double The Bacon — Salesforge
> Цель: вырасти с 500+ demos/mo до 1,000+ demos/mo без удвоения бюджета и усилий

---

## 1. ПРОБЛЕМА

Salesforge получает 500+ demo-запросов в месяц — но целевой рынок в США насчитывает десятки тысяч компаний которые **никогда не слышали о Salesforge** и никогда не придут сами.

Конкретная боль в цифрах:
- Типичная B2B SaaS компания (10–200 сотрудников) тратит 3–5 часов SDR-времени в день на ручной outreach
- При средней зарплате SDR $60K/год — это $18,000–$30,000 в год потерянного времени на одного сотрудника
- 73% компаний которые нанимают 2+ SDR за месяц сгорают в течение 6 месяцев без автоматизации
- Конверсия холодного outreach без персонализации: 1–2%. С AI-персонализацией: 8–16%

Текущие demo-запросы приходят от людей которые **уже знают о проблеме и уже ищут решение**. Phantom Pipeline атакует аудиторию которая ещё не сформулировала боль — но боль уже есть.

---

## 2. РЕШЕНИЕ

**Phantom Pipeline** — автономная AI-система которая находит компании в США по сигналам боли, создаёт персонализированный PDF-отчёт + Sora AI-видео про их конкретную ситуацию и доставляет это им **до того как они знают о Salesforge**.

Пошаговый процесс:

1. **Мониторинг сигналов боли** — система находит компании по триггерам: найм SDR, инвестиции, текучка команды, негативные G2-отзывы на конкурентов
2. **Автоматическое профилирование** — сбор данных через Leadsforge + LinkedIn + Crunchbase: размер команды, ICP, tech stack, decision maker, расчёт потерь в деньгах
3. **Генерация PDF Pipeline Autopsy Report** — персонализированный отчёт с их логотипом, их цифрами, их потерями. Создаётся Claude API + Puppeteer
4. **Генерация Sora-видео** — 60–90 секунд: кино про их компанию, их боль, их конкурента и решение
5. **Тройная доставка** — Email (Day 1) + LinkedIn DM (Day 3) + Slack-комьюнити. Всё через Salesforge Multichannel API
6. **Живой счётчик потерь** — персональная страница `phantom-pipeline.com/[company]` с тикающим счётчиком денег которые утекают каждую секунду
7. **48-Hour Free Pilot** — при ответе YES: Agent Frank 48 часов работает на их pipeline, находит 50 лидов, запускает outreach, показывает живые ответы
8. **FOMO Trigger** — если нет ответа 48ч: "Companies in your industry are already scaling pipeline with AI SDRs — 8–16% reply rates vs 1–2% average" + анонимные результаты индустрии
9. **Agent Frank через Primebox** — автоответы на все входящие 24/7: читает ответы, категоризирует намерение, отвечает за 5 минут
10. **Demo Booking** — человек приходит на demo с реальными результатами пилота в руках
11. **Pipeline Win Card** — вирусный цикл: карточка с метриками → LinkedIn share → новые лиды

---

## 3. ПОЧЕМУ СЕЙЧАС

**Технологический тайминг:**
- Sora AI (генерация видео) стала доступна в 2025 — персонализированное видео под каждую компанию за минуты
- Salesforge API полностью открыт — весь цикл от загрузки контакта до ответа Agent Frank автоматизируется программно
- Стоимость LLM упала в 10x за 2 года — генерация PDF-отчёта на каждую компанию стоит центы

**Рыночный тайминг:**
- AI SDR рынок растёт 340% год к году (2024–2025)
- 60% компаний планируют внедрить AI SDR к 2026 — окно первопроходца закрывается
- Конкуренты (Instantly, Apollo, Lemlist) не имеют Sora-видео персонализации — уникальное окно 6–12 месяцев

**Конкурентная среда:**
- Ни один outbound инструмент сегодня не приходит к клиенту с готовым доказательством до demo
- Phantom Pipeline создаёт категорию "pre-demo value delivery" которой не существует

---

## 4. ЦЕЛЕВАЯ АУДИТОРИЯ

**Основная (США):**
- B2B SaaS компании, 10–200 сотрудников
- Есть sales-команда: 1–10 SDR/AE
- ARR: $500K — $10M
- Индустрии: HR Tech, FinTech, MarTech, Sales Tech, DevTools
- Текущий стек: Instantly / Apollo / Lemlist / HubSpot Sequences

**Триггеры таргетинга:**
- 2+ SDR вакансии за последние 30 дней
- Series A/B за последние 60 дней
- Негативный отзыв на конкурирующий инструмент на G2
- 3+ SDR покинули компанию за квартал
- Прямой конкурент уже использует AI SDR

**Вторичная:**
- Sales agencies (Salesforge Whitelabel — мультиплицирует эффект)
- VP Sales / Head of Sales которые лично отвечают за pipeline growth

---

## 5. АРХИТЕКТУРА

```
┌─────────────────────────────────────────────────────────┐
│                    СЛОЙ ДАННЫХ                          │
│   Leadsforge API · LinkedIn · Crunchbase · G2 scraper   │
└──────────────────────────┬──────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│           СЛОЙ ОБОГАЩЕНИЯ И ПРОФИЛИРОВАНИЯ              │
│   /contacts/bulk · /dnc/bulk · /custom-vars             │
│   Расчёт monthly_loss · Decision maker · Tech stack     │
└──────────────────────────┬──────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│             СЛОЙ ГЕНЕРАЦИИ КОНТЕНТА                     │
│   Claude API → PDF Pipeline Autopsy Report (Puppeteer)  │
│   Sora AI → персонализированное видео 60–90 сек         │
│   Next.js → phantom-pipeline.com/[slug] живая страница  │
└──────────────────────────┬──────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│          СЛОЙ ДОСТАВКИ И ПОСЛЕДОВАТЕЛЬНОСТИ             │
│   /multichannel/sequences · /nodes/actions · /conditions│
│   Email (Day 1) → LinkedIn DM (Day 3) → FOMO (Day 5)   │
│   /integrations/webhooks → real-time триггеры           │
└──────────────────────────┬──────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                СЛОЙ КОНВЕРСИИ                           │
│   YES → 48H Free Pilot (/sequences + /import-lead)      │
│   NO  → FOMO Trigger: анонимные результаты индустрии    │
│   Agent Frank через Primebox → автоответы 24/7          │
│   /mailboxes/.../reply → ответ за 5 минут               │
└──────────────────────────┬──────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                СЛОЙ ВИРУСНОСТИ                          │
│   /sequences/{id}/analytics → Pipeline Win Card         │
│   LinkedIn Share → новый цикл                           │
└─────────────────────────────────────────────────────────┘
```

**Технологический стек (единый TypeScript монорепо):**

| Слой | Технология |
|---|---|
| Данные | Leadsforge API, LinkedIn API, Crunchbase API, G2 scraper |
| Генерация PDF | Claude API (контент) + Puppeteer (HTML → PDF рендер) |
| Генерация видео | Sora AI API |
| Живая страница | Next.js + WebSocket (тикающий счётчик) |
| Outreach | Salesforge Multichannel API (/multichannel/sequences, /nodes) |
| Reply handling | Agent Frank (AI SDR) через Salesforge Primebox |
| База данных | Supabase (PostgreSQL + Storage) |
| Оркестрация | TypeScript CLI (хакатон) → n8n (продакшен Фаза 1+) |

---

## 6. FORGE STACK — ЧТО ИСПОЛЬЗУЕМ

| Продукт | Роль в системе |
|---|---|
| **Leadsforge** | Поиск 500M+ контактов для сигналов боли и 48H пилота |
| **Salesforge** | Запуск Email + LinkedIn sequences через Multichannel engine |
| **Agent Frank** | Автономный AI SDR: ведёт 48H пилот, отвечает через Primebox 24/7 |
| **Warmforge** | Deliverability — письма попадают в inbox, не в спам |
| **Primebox** | Единый inbox для всех ответов + авто-категоризация намерений |

---

## 7. SALESFORGE API — КЛЮЧЕВЫЕ ЭНДПОИНТЫ

Salesforge имеет два движка: **Multichannel engine** (`/multichannel/...`) и **Standard engine** (`/workspaces/...`). Phantom Pipeline использует оба.

```
── FOUNDATION ──
GET  /me                                          → проверка авторизации
POST /workspaces                                  → новый workspace на кампанию

── CONTACTS & DATA ──
POST /workspaces/{id}/contacts/bulk               → загрузка профилей
GET  /custom-vars                                 → {{pdf_url}} {{video_url}} в письма
POST /workspaces/{id}/dnc/bulk                    → стоп-лист (compliance)
POST /workspaces/{id}/contacts/validation/start   → валидация emails

── MULTICHANNEL ENGINE ──
POST /multichannel/sequences                      → мультиканальная sequence
POST /multichannel/nodes/actions                  → шаги: Email, LinkedIn DM
POST /multichannel/nodes/conditions               → ветки: if replied → do X
POST /multichannel/enrollments                    → добавить контакт в flow
GET  /multichannel/sender-profiles                → email + LinkedIn аккаунты

── STANDARD ENGINE ──
PUT  /workspaces/{id}/sequences/{id}/import-lead  → 🔥 бросить лида в sequence
GET  /workspaces/{id}/sequences/{id}/analytics    → open/click/reply → Win Card

── AGENT FRANK / PRIMEBOX ──
GET  /workspaces/{id}/threads                     → живые переписки
GET  /primebox-labels                             → Interested / Not Now / OOO
POST /mailboxes/{id}/emails/{id}/reply            → 🔥 Agent Frank отвечает
GET  /workspaces/{id}/products                    → knowledge base для Frank

── INTEGRATIONS ──
POST /workspaces/{id}/integrations/webhooks       → real-time пинг (не polling)
```

**4 эндпоинта покрывают 90% системы:**
- `/contacts/bulk` → загрузить лида
- `/sequences/{id}/import-lead` → запустить outreach
- `/integrations/webhooks` → поймать ответ мгновенно
- `/mailboxes/.../reply` → Agent Frank отвечает

---

## 8. МОНЕТИЗАЦИЯ

Phantom Pipeline — это система которая продаёт Salesforge.

| Метрика | Расчёт |
|---|---|
| Demo → close rate | ~20% |
| 1,000 demos/mo × 20% | 200 новых клиентов/mo |
| Growth план $80/mo | +$16,000 MRR ежемесячно |
| Agent Frank $499/mo × 20% | +$9,980 MRR ежемесячно |
| **Итого прирост** | **~$26,000 MRR каждый месяц** |

---

## 9. КОНКУРЕНТЫ

| Конкурент | Что делает | Чего не хватает |
|---|---|---|
| Instantly | Cold email sequences | Нет AI-видео, нет pre-demo value, нет сигналов боли |
| Apollo.io | Prospecting + sequences | Нет персонализированного отчёта, нет Sora-видео |
| Lemlist | Email + LinkedIn outreach | Нет автономного агента, нет 48H пилота |
| Outreach.io | Enterprise sales execution | Дорого, нет AI-генерации контента |
| Clay | Data enrichment + workflows | Нет execution layer, нет видео |
| **Phantom Pipeline** | **Pre-demo value delivery + autonomous execution** | **первый в категории** |

---

## 10. ПЛАН ЗАПУСКА

**MVP — Хакатон (14 дней):**
- Шаги 1–5: сигналы + профилирование + PDF + Sora-видео + email через Salesforge API
- Живая страница с тикающим счётчиком
- 48H Free Pilot flow
- Цель: работающая цепочка на 10–20 реальных компаниях

**Фаза 1 — Post-hackathon (30 дней):**
- Все 5 сигналов боли полностью реализованы
- Тройной канал: Email + LinkedIn + Slack
- Agent Frank через Primebox — автоответы 24/7
- Цель: +200 новых demos/mo

**Фаза 2 (60 дней):**
- Competitor Hijack (G2 мониторинг)
- Phantom Conference (парсинг attendees конференций)
- Pipeline Win Card + вирусный цикл
- Цель: +500 новых demos/mo → 1,000+ total

**Фаза 3 (90 дней):**
- AI News Hijack
- Sales Team Takeover
- Phantom Board (публичный дашборд adoption)
- Цель: 1,400+ demos/mo

**Метрики успеха:**

| Метрика | Цель |
|---|---|
| Demo bookings | 500 → 1,000+/mo |
| Reply rate на outreach | >8% |
| 48H Pilot → Demo conversion | >80% |
| Demo → Close rate | >20% |

---

## 11. РИСКИ

| Риск | Вероятность | Митигация |
|---|---|---|
| Sora API недоступен | Средняя | Fallback: Heygen API или Loom персонализация |
| Низкое качество сигналов | Средняя | A/B тест, начать с funding (сильнейший сигнал) |
| Email deliverability | Низкая | Salesforge + Warmforge решают |
| GDPR/CAN-SPAM | Средняя | Только США, opt-out, /dnc/bulk |
| Конкуренты копируют | Низкая (6–12 мес) | Скорость + данные как moat |

---

## 12. ТЕХДЕТАЛИ

**Структура репозитория:**
```
phantom-pipeline/
├── CLAUDE.md
├── PROJECT_IDEA.md
├── .claude/
│   ├── agents/
│   ├── rules/
│   └── skills/
├── src/
│   ├── signal-hunter/       # мониторинг сигналов боли
│   ├── profiler/            # обогащение данных
│   ├── pdf-generator/       # Claude API + Puppeteer
│   ├── video-generator/     # Sora AI
│   ├── delivery-engine/     # Salesforge Multichannel API
│   ├── pilot-runner/        # 48H Free Pilot
│   ├── primebox/            # Agent Frank автоответы
│   ├── live-counter/        # Next.js страница
│   └── orchestrator/        # TypeScript CLI
├── supabase/
│   ├── migrations/
│   └── functions/
└── package.json
```

**Ключевые таблицы Supabase:**
```sql
companies:  id, name, domain, logo_url, industry, size, sdr_count,
            icp, acv_estimate, pain_score, signals (jsonb),
            decision_maker (jsonb), monthly_loss_estimate,
            tech_stack (jsonb), status, salesforce_contact_id

            -- статусы: detected → profiled → content_generated →
            --          outreach_sent → page_opened → responded →
            --          pilot_running → pilot_results_ready → demo_booked

signals:    id, company_id, type, detail, source, raw_data (jsonb), detected_at

reports:    id, company_id, pdf_url, video_url,
            personal_page_slug, personal_page_url,
            win_card_url, status, generated_at

sequences:  id, company_id, workspace_id, salesforge_sequence_id, type, status

pilots:     id, company_id, workspace_id, icp_description,
            contacts_reached, positive_replies, reply_rate,
            demos_booked, live_conversations (jsonb), status
```

**Формула расчёта потерь (Live Counter + PDF):**
```
hourlyRate       = $60,000 / 52 / 40  = $28.85/hour
dailyWaste       = $28.85 × 3 hours   = $86.54/day
monthlyWaste     = $86.54 × 22 days   = $1,903/SDR/month
totalMonthlyLoss = $1,903 × sdrCount

lossPerSecond    = totalMonthlyLoss / 30 / 24 / 3600
```
