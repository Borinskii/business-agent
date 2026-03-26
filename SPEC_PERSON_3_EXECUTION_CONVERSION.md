# SPEC — Person 3: Execution & Conversion Layer
### Phantom Pipeline · Слой 2 — Техническая спецификация
> Владелец: Person 3 · Зона: Salesforge sequences, 48H пилот, Agent Frank через Primebox

---

## КОНТРАКТ С КОМАНДОЙ

**Ты читаешь** → `companies` где `status = content_generated` (Person 2 заполнил)
**Ты читаешь** → `reports` где `status = ready` → берёшь `pdf_url`, `video_url`, `personal_page_url`
**Ты пишешь** → `sequences`, `pilots` + обновляешь `companies.status` на каждом шаге
**Person 2 получает от тебя** → `companies.status = pilot_results_ready` → генерирует Win Card

**День 1:** настроить Salesforge API клиент + проверить доступ к workspace → разблокировать тесты

---

## МОДУЛЬ 1 — DELIVERY ENGINE (Salesforge Sequences)

### User Stories
- Как система, я хочу создавать мультиканальную sequence (Email + LinkedIn) для каждой компании через Salesforge API, чтобы outreach запускался автоматически без ручного труда
- Как система, я хочу вставить pdf_url и video_url в тело письма через custom_vars, чтобы каждое письмо содержало персонализированный контент
- Как система, я хочу настроить ветку "FOMO Trigger" если нет ответа 48 часов, чтобы увеличить конверсию без лжи
- Как система, я хочу получать webhook когда страница компании открыта (от Person 2), чтобы немедленно ускорить follow-up
- Как оператор, я хочу видеть статус каждой sequence (активна / остановлена / завершена), чтобы контролировать pipeline

### Модель данных
```sql
CREATE TABLE sequences (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id               uuid REFERENCES companies(id) UNIQUE NOT NULL,
  workspace_id             text NOT NULL,
  salesforge_sequence_id   text NOT NULL,
  type                     text NOT NULL DEFAULT 'outreach'
    CHECK (type IN ('outreach','pilot')),
  status                   text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','paused','completed','failed')),
  nodes_count              integer DEFAULT 0,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sequences_company ON sequences(company_id);
CREATE INDEX idx_sequences_status  ON sequences(status);

ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON sequences
  FOR ALL TO service_role USING (true);
```

### API и серверная логика

```
POST /api/sequences/create
Body:    { company_id: uuid }
Response 200: { sequence_id: uuid, salesforge_sequence_id: string }
Response 404: { error: 'company_not_found' }
Response 409: { error: 'sequence_already_exists' }
Response 422: { error: 'report_not_ready' }
Response 502: { error: 'salesforge_api_error', details: string }

POST /api/webhooks/page-opened
Body:    { company_id: uuid, slug: string }
Response 200: { ok: true, action: 'follow_up_accelerated' }
→ Добавляет immediate follow-up node в существующую sequence

GET /api/sequences/:company_id/analytics
Response 200: {
  sent: number, opened: number, open_rate: number,
  clicked: number, replied: number, reply_rate: number,
  positive_replies: number
}
Response 404: { error: 'not_found' }
```

Внутренняя логика createSequence:
```typescript
// Шаг 1: Создать workspace (изолированная среда для кампании)
POST https://api.salesforge.ai/public/v2/workspaces
Body: { name: `Phantom_${company.domain}_${Date.now()}` }
→ { id: workspace_id }

// Шаг 2: Создать multichannel sequence
POST https://api.salesforge.ai/public/v2/multichannel/sequences
Body: {
  workspaceId: workspace_id,
  name: `Phantom_${company.name}`,
  status: 'active'
}
→ { id: salesforge_sequence_id }

// Шаг 3: Получить sender profile
GET https://api.salesforge.ai/public/v2/multichannel/sender-profiles
→ выбираем первый активный

// Шаг 4: Добавить nodes (ветки последовательности)
// Node 1: Email Day 1
POST https://api.salesforge.ai/public/v2/multichannel/nodes/actions
Body: {
  sequenceId: salesforge_sequence_id,
  type: 'send_email',
  day: 1,
  subject: `${firstName}, I made something about ${company.name}`,
  body: EMAIL_TEMPLATE_DAY1(company, report)
}

// Node 2: LinkedIn DM Day 3 (если нет ответа)
POST https://api.salesforge.ai/public/v2/multichannel/nodes/actions
Body: {
  sequenceId: salesforge_sequence_id,
  type: 'send_linkedin_message',
  day: 3,
  body: LINKEDIN_TEMPLATE(company, report)
}

// Node 3: Condition — нет ответа 48ч
POST https://api.salesforge.ai/public/v2/multichannel/nodes/conditions
Body: {
  sequenceId: salesforge_sequence_id,
  type: 'no_reply',
  after_hours: 48,
  true_branch: 'fomo_email_node',
  false_branch: 'stop'
}

// Node 4: FOMO Email Day 5
POST https://api.salesforge.ai/public/v2/multichannel/nodes/actions
Body: {
  id: 'fomo_email_node',
  type: 'send_email',
  subject: `${company.name} — quick update`,
  body: EMAIL_TEMPLATE_FOMO(company)
}

// Шаг 5: Enroll контакт в sequence
POST https://api.salesforge.ai/public/v2/multichannel/enrollments
Body: {
  sequenceId: salesforge_sequence_id,
  contactId: company.salesforce_contact_id
}

// Шаг 6: Настроить webhook для ответов
POST https://api.salesforge.ai/public/v2/workspaces/{workspace_id}/integrations/webhooks
Body: {
  url: `${APP_URL}/api/webhooks/reply`,
  events: ['email.replied', 'email.opened', 'linkedin.replied']
}
```

Шаблоны писем:
```typescript
function EMAIL_TEMPLATE_DAY1(company, report): string {
  return `Hi ${firstName},

I made something for you.

While looking at ${company.industry} companies scaling their sales teams,
I noticed ${company.name} has been actively growing — and ran some numbers.

→ [Pipeline Autopsy Report for ${company.name}]({{pdf_url}})
→ [60-second video about ${company.name}]({{video_url}})

Short version: your team is leaving ~$${formatK(company.monthly_loss_estimate)}/month
on the table. Full breakdown is in the report.

Reply YES and I'll show you how we calculated this in 8 minutes.

{{personal_page_url}}`
}

function LINKEDIN_TEMPLATE(company, report): string {
  return `Hi ${firstName},

Made this for ${company.name} — thought it might be relevant given your growth.

{{personal_page_url}}

Worth a look.`
}

function EMAIL_TEMPLATE_FOMO(company): string {
  return `Quick update — companies in ${company.industry} using AI SDR outreach
are averaging 8–16% reply rates vs 1–2% for manual outreach.

The gap is widening every week.

Still happy to show you what this looks like for ${company.name}.

Reply YES.`
}
```

### Экраны и компоненты
Нет UI. CLI:
```bash
npx ts-node src/delivery-engine/cli.ts --company-id uuid
# [✓] Workspace created: wks_abc123
# [✓] Sequence created: seq_xyz789
# [✓] Nodes built: Email Day1 | LinkedIn Day3 | Condition | FOMO Day5
# [✓] Contact enrolled: cnt_def456
# [✓] Reply webhook registered
# [✓] companies.status → outreach_sent
```

### Бизнес-логика
- Один workspace на одну кампанию (изоляция)
- Sequence создаётся только если `report.status = 'ready'` — без контента не стартуем
- custom_vars `{{pdf_url}}`, `{{video_url}}`, `{{personal_page_url}}` подставляются Salesforge автоматически из контакта
- После создания sequence: `companies.status = 'outreach_sent'`
- При получении webhook `page_opened` от Person 2: добавляем immediate email node в текущую sequence

### Крайние случаи
- Salesforge API вернул 429 → exponential backoff: 30s, 60s, 120s, максимум 3 попытки
- `salesforce_contact_id` отсутствует (Person 1 не загрузил) → ошибка 422, не создавать sequence
- `report.pdf_url = null` → ошибка 422, ждём пока Person 2 завершит генерацию
- Sequence уже существует для этой компании → вернуть 409, не дублировать
- Enrollment упал → retry через 30s, если снова ошибка → alert оператору, статус 'failed'
- LinkedIn account disconnected → пропустить LinkedIn nodes, продолжить только email

---

## МОДУЛЬ 2 — 48H FREE PILOT

### User Stories
- Как система, я хочу запустить 48-часовой пилот Agent Frank для компании ответившей YES, чтобы они получили реальные результаты ещё до demo
- Как система, я хочу найти 50 лидов под ICP компании через Leadsforge, чтобы пилот был релевантным
- Как система, я хочу запустить outreach от имени компании через Agent Frank, чтобы они видели как это работает на их аудитории
- Как система, я хочу собрать результаты через 48 часов и отправить summary letter, чтобы человек пришёл на demo уже с доказательствами в руках
- Как оператор, я хочу видеть статус каждого активного пилота, чтобы контролировать нагрузку на Salesforge

### Модель данных
```sql
CREATE TABLE pilots (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          uuid REFERENCES companies(id) UNIQUE NOT NULL,
  workspace_id        text NOT NULL,
  sequence_id         text NOT NULL,
  icp_description     text NOT NULL,
  contacts_count      integer DEFAULT 0,
  contacts_reached    integer DEFAULT 0,
  open_rate           numeric(5,2),
  positive_replies    integer DEFAULT 0,
  reply_rate          numeric(5,2),
  demos_booked        integer DEFAULT 0,
  live_conversations  jsonb DEFAULT '[]',
  -- [{ prospect_name, company, reply_preview (max 100 chars) }]
  status              text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','running','completed','failed')),
  started_at          timestamptz,
  completed_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE pilot_requests (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       uuid REFERENCES companies(id),
  icp_description  text NOT NULL,
  requester_email  text,
  requested_at     timestamptz NOT NULL DEFAULT now(),
  processed        boolean DEFAULT false
);

CREATE INDEX idx_pilots_company ON pilots(company_id);
CREATE INDEX idx_pilots_status  ON pilots(status);
```

### API и серверная логика

```
POST /api/pilots/start
Body:    { company_id: uuid, icp_description: string }
Response 200: { pilot_id: uuid, status: 'running', eta_hours: 48 }
Response 400: { error: 'icp_description_too_short' }  -- min 10 chars
Response 404: { error: 'company_not_found' }
Response 409: { error: 'pilot_already_running' }

GET /api/pilots/:company_id
Response 200: { pilot: Pilot }
Response 404: { error: 'not_found' }

POST /api/webhooks/reply  (принимает webhook от Salesforge)
Body:    { event: 'email.replied', contact_id: string, workspace_id: string, sentiment: string }
Response 200: { ok: true }
→ Если sentiment = 'positive' | 'interested' → запускаем пилот
→ Обновляем companies.status = 'responded'
```

Внутренняя логика startPilot:
```typescript
async function startPilot(companyId: string, icp: string) {
  // Шаг 1: Новый workspace для пилота
  const pilotWorkspace = await sf.post('/workspaces', {
    name: `PILOT_${company.domain}_${Date.now()}`
  })

  // Шаг 2: Загрузить knowledge base о продукте компании
  await sf.post(`/workspaces/${pilotWorkspace.id}/products`, {
    name: company.name,
    description: `${company.name} helps ${company.icp}.
                  Key problem solved: ${company.signals[0]?.detail}.`,
    targetAudience: icp
  })

  // Шаг 3: Найти 50 лидов через Leadsforge
  const leads = await leadsforge.post('/v1/contacts/search', {
    query: icp,
    country: 'US',
    limit: 50,
    filters: { has_email: true }
  })

  // Шаг 4: Загрузить лидов в пилотный workspace
  await sf.post(`/workspaces/${pilotWorkspace.id}/contacts/bulk`, {
    contacts: leads.map(l => ({
      email: l.email,
      firstName: l.firstName,
      lastName: l.lastName,
      companyName: l.company,
      linkedinUrl: l.linkedin_url
    }))
  })

  // Шаг 5: Создать sequence от имени компании
  const pilotSeq = await sf.post(`/workspaces/${pilotWorkspace.id}/sequences`, {
    name: `Pilot_${company.name}`,
    senderName: company.decision_maker.name,
    type: 'email'
  })

  // Шаг 6: Добавить лидов в sequence
  for (const lead of leads) {
    await sf.put(`/workspaces/${pilotWorkspace.id}/sequences/${pilotSeq.id}/import-lead`, {
      email: lead.email
    })
  }

  // Шаг 7: Сохранить данные пилота
  await supabase.from('pilots').insert({
    company_id: companyId,
    workspace_id: pilotWorkspace.id,
    sequence_id: pilotSeq.id,
    icp_description: icp,
    contacts_count: leads.length,
    status: 'running',
    started_at: new Date()
  })

  await supabase.from('companies').update({ status: 'pilot_running' })
    .eq('id', companyId)

  // Шаг 8: Запланировать сбор результатов через 48ч
  setTimeout(() => collectPilotResults(companyId), 48 * 3600 * 1000)
}
```

Сбор результатов через 48ч:
```typescript
async function collectPilotResults(companyId: string) {
  const pilot = await getPilot(companyId)

  // Аналитика sequence
  const analytics = await sf.get(
    `/workspaces/${pilot.workspace_id}/sequences/${pilot.sequence_id}/analytics`
  )

  // Живые ответы из Primebox
  const threads = await sf.get(
    `/workspaces/${pilot.workspace_id}/threads?label=action_required`
  )

  const results = {
    contacts_reached:  analytics.sent,
    open_rate:         analytics.openRate,
    positive_replies:  analytics.positiveReplies,
    reply_rate:        analytics.replyRate,
    demos_booked:      threads.filter(t => t.label === 'meeting_requested').length,
    live_conversations: threads.slice(0, 3).map(t => ({
      prospect_name: t.contactName,
      company:       t.contactCompany,
      reply_preview: t.lastMessage?.substring(0, 100)
    }))
  }

  // Сохраняем результаты
  await supabase.from('pilots')
    .update({ ...results, status: 'completed', completed_at: new Date() })
    .eq('company_id', companyId)

  await supabase.from('companies')
    .update({ status: 'pilot_results_ready' })
    .eq('id', companyId)

  // Отправляем summary email
  await sendPilotResultsEmail(companyId, results)
}
```

### Экраны и компоненты
Нет UI. Webhook + CLI:
```bash
npx ts-node src/pilot-runner/cli.ts --company-id uuid --icp "HR software for 50-200 person companies"
# [✓] Pilot workspace: wks_pilot_123
# [✓] Knowledge base loaded for Acme Corp
# [✓] Leadsforge: found 50 leads matching ICP
# [✓] Bulk upload: 50 contacts
# [✓] Sequence created, leads enrolled
# [✓] Pilot running — results in 48h
# [⏰] Scheduled: collectPilotResults at 2026-03-27 12:00:00
```

### Бизнес-логика
- Пилот запускается только при `companies.status = 'responded'`
- `icp_description` минимум 10 символов, максимум 200
- Максимум 1 активный пилот на компанию (409 если пытаются запустить второй)
- Timeout сбора результатов: если через 48ч Salesforge API недоступен → retry через 15 минут, максимум 5 раз
- Summary email отправляется через Salesforge `/mailboxes/{id}/emails/{id}/reply` на тред с which YES пришёл

### Крайние случаи
- Leadsforge вернул < 10 лидов для ICP → остановить пилот, написать компании с просьбой уточнить ICP
- Все лиды невалидны (bounce) → статус `failed`, уведомить оператора
- collectPilotResults вызвана до 48ч истекших → проверить `started_at + 48h < now()`, если нет — skip
- `setTimeout` потерян при рестарте сервера → cron job каждые 30 минут проверяет `pilots` где `status = running AND started_at < now() - 48h`

---

## МОДУЛЬ 3 — AGENT FRANK ЧЕРЕЗ PRIMEBOX

### User Stories
- Как система, я хочу обрабатывать все входящие ответы из Primebox через webhook (не polling), чтобы реагировать на ответы мгновенно
- Как система, я хочу категоризировать намерение ответа (pricing / demo_request / positive / info), чтобы Agent Frank давал релевантный ответ
- Как система, я хочу генерировать ответ через Claude API используя актуальный knowledge base Salesforge, чтобы ответы были точными и своевременными
- Как система, я хочу отправлять ответ через Salesforge `/mailboxes/.../reply` в течение 5 минут, чтобы лид не остывал
- Как оператор, я хочу видеть все ответы которые обработал Agent Frank, чтобы проверять качество ответов

### Модель данных
```sql
CREATE TABLE frank_replies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid REFERENCES companies(id),
  thread_id       text NOT NULL,
  mailbox_id      text NOT NULL,
  email_id        text NOT NULL,
  incoming_text   text NOT NULL,
  intent          text NOT NULL CHECK (intent IN (
                    'pricing_question','demo_request',
                    'positive_intent','info_request',
                    'pilot_request','unsubscribe','other')),
  reply_text      text NOT NULL,
  sent_at         timestamptz,
  status          text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','sent','failed')),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_frank_replies_company ON frank_replies(company_id);
CREATE INDEX idx_frank_replies_status  ON frank_replies(status);
```

### API и серверная логика

```
POST /api/webhooks/primebox   (webhook от Salesforge)
Body:    {
  event: 'email.replied',
  threadId: string,
  workspaceId: string,
  mailboxId: string,
  emailId: string,
  contactId: string,
  messageText: string,
  sentiment: string   -- Salesforge primebox-label
}
Response 200: { ok: true, intent: string, reply_queued: true }
Response 200: { ok: true, intent: 'unsubscribe', action: 'added_to_dnc' }

GET /api/frank-replies
Query:   ?status=sent&limit=20
Response 200: { replies: FrankReply[], total: number }
```

Внутренняя логика обработки ответа:
```typescript
async function handleIncomingReply(event: PrimeboxWebhookEvent) {
  // Шаг 1: Определить intent
  const intent = classifyIntent(event.messageText)

  // Если unsubscribe — добавить в DNC и выйти
  if (intent === 'unsubscribe') {
    await sf.post(`/workspaces/${event.workspaceId}/dnc/bulk`, {
      emails: [event.contactEmail]
    })
    await supabase.from('companies')
      .update({ status: 'dnc_blocked' })
      .eq('salesforce_contact_id', event.contactId)
    return
  }

  // Если positive / pilot_request — запустить пилот
  if (intent === 'positive_intent' || intent === 'pilot_request') {
    await supabase.from('companies')
      .update({ status: 'responded' })
      .eq('salesforce_contact_id', event.contactId)
  }

  // Шаг 2: Получить knowledge base
  const products = await sf.get(`/workspaces/${event.workspaceId}/products`)
  const productInfo = products[0]

  // Шаг 3: Генерировать ответ через Claude
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      system: `You are a sales rep for Salesforge.
               Be helpful, concise, human. Max 4 sentences.
               Always end with one soft CTA toward booking a demo.
               Product context: ${JSON.stringify(productInfo)}
               NEVER mention you are AI.`,
      messages: [{
        role: 'user',
        content: `Prospect message: "${event.messageText}"
                  Intent: ${intent}
                  Write a reply.`
      }]
    })
  })
  const data = await response.json()
  const replyText = data.content[0].text

  // Шаг 4: Отправить ответ через Primebox
  await sf.post(
    `/workspaces/${event.workspaceId}/mailboxes/${event.mailboxId}/emails/${event.emailId}/reply`,
    { body: replyText }
  )

  // Шаг 5: Сохранить в frank_replies
  await supabase.from('frank_replies').insert({
    thread_id: event.threadId, mailbox_id: event.mailboxId,
    email_id: event.emailId, incoming_text: event.messageText,
    intent, reply_text: replyText, status: 'sent', sent_at: new Date()
  })
}

function classifyIntent(text: string): string {
  const t = text.toLowerCase()
  if (t.match(/unsubscribe|remove|stop|opt.?out/))          return 'unsubscribe'
  if (t.match(/price|cost|how much|pricing|plan/))          return 'pricing_question'
  if (t.match(/demo|call|meeting|schedule|book/))           return 'demo_request'
  if (t.match(/pilot|try|test|48|free/))                    return 'pilot_request'
  if (t.match(/yes|interested|sounds good|tell me more/))  return 'positive_intent'
  if (t.match(/how|what|explain|tell|works/))               return 'info_request'
  return 'other'
}
```

### Экраны и компоненты
Нет UI. Webhook endpoint + logs:
```
[12:03:45] Webhook received: email.replied from john@acme.com
[12:03:45] Intent classified: positive_intent
[12:03:46] Claude API: reply generated (1.2s)
[12:03:47] Primebox: reply sent to thread_123
[12:03:47] frank_replies: saved (status=sent)
```

### Бизнес-логика
- Webhook вместо polling — `/integrations/webhooks` настраивается один раз при создании sequence
- `unsubscribe` обрабатывается в первую очередь, до любой другой логики
- Если `intent = 'pilot_request'` или `'positive_intent'` → сразу обновить `companies.status = 'responded'`
- Ответ генерируется максимум за 5 минут от получения webhook (SLA для demo)
- `other` intent → сохраняем тред, не отвечаем автоматически → alert оператору для ручного ответа

### Крайние случаи
- Claude API timeout (> 10s) → retry один раз, затем fallback: шаблонный ответ по intent
- Salesforge `/reply` вернул 404 (email не найден) → log, пометить `frank_replies.status = 'failed'`
- Дублированный webhook (Salesforge может присылать дважды) → дедупликация по `email_id`
- Out-of-office ответ (autoresponder) → `primebox-labels` вернёт `ooo` → игнорировать, не отвечать
- Ответ пришёл после завершения пилота (неактивный workspace) → проверить `sequences.status`, если `completed` → skip

---

## ПОРЯДОК ВЫПОЛНЕНИЯ

**День 1:**
- [ ] Настроить Salesforge API клиент (`src/lib/salesforge.ts`)
- [ ] Проверить доступ к workspace `wks_7cksiak4q2sqw6mawjut`
- [ ] Создать таблицы: `sequences`, `pilots`, `pilot_requests`, `frank_replies`
- [ ] Тест: GET /me → возвращает аккаунт → подтвердить команде что API работает

**День 2–3:**
- [ ] Delivery Engine: createSequence + buildNodes + enroll contact (на мок-данных)
- [ ] Webhook `/api/webhooks/page-opened` принимает events от Person 2
- [ ] Webhook `/api/webhooks/reply` принимает events от Salesforge (Primebox)
- [ ] Тест: sequence создаётся, контакт enrolled, webhook зарегистрирован

**День 4–5:**
- [ ] 48H Free Pilot: startPilot + collectPilotResults + summary email
- [ ] Agent Frank через Primebox: classifyIntent + Claude reply + /mailboxes/.../reply
- [ ] Тест сквозной: YES ответ → пилот запущен → через 48ч результаты

**День 6–7:**
- [ ] Интеграция с Person 1: sequence создаётся только когда `salesforce_contact_id` заполнен
- [ ] Интеграция с Person 2: `pdf_url` и `video_url` из reports попадают в письма
- [ ] Обновить `companies.status` на каждом шаге → Person 1 видит в своей таблице
- [ ] Финальный тест: 3 компании прошли полный цикл до `pilot_results_ready`

---

## ОКРУЖЕНИЕ

```env
SALESFORGE_WORKSPACE_ID=wks_7cksiak4q2sqw6mawjut
SALESFORGE_API_KEY=...
SALESFORGE_SENDER_ID=...
SALESFORGE_MAIN_MAILBOX_ID=...
ANTHROPIC_API_KEY=...
LEADSFORGE_API_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
APP_URL=https://phantom-pipeline.com
HUBSPOT_BOOKING_URL=https://meetings-eu1.hubspot.com/franksondors/
```
