# Rules: Execution Layer (Person 3)
# Applies to: src/delivery-engine/**, src/pilot-runner/**, src/primebox/**

## Delivery Engine Rules
- Sequence создаётся ТОЛЬКО если report.status = 'ready' — без контента не стартуем
- Один workspace на одну кампанию — изоляция обязательна
- custom_vars {{pdf_url}} {{video_url}} {{personal_page_url}} подставляет Salesforge из контакта
- FOMO Trigger формулировка: "Companies in your industry are already scaling pipeline with AI SDRs — 8–16% reply rates vs 1–2% average" — без упоминания конкретных конкурентов
- После создания sequence → companies.status = 'outreach_sent'
- Sequence уже существует (409) → не дублировать, вернуть существующий ID

## 48H Pilot Rules
- Пилот запускается ТОЛЬКО при companies.status = 'responded'
- icp_description минимум 10 символов — валидация обязательна
- Максимум 1 активный пилот на компанию
- Если Leadsforge вернул < 10 лидов → остановить, написать компании что нужно уточнить ICP
- collectPilotResults cron: каждые 30 минут проверять pilots где status='running' AND started_at < now()-48h (защита от потери setTimeout)
- После результатов → companies.status = 'pilot_results_ready' (Person 2 генерирует Win Card)

## Agent Frank / Primebox Rules
- Webhook вместо polling — /integrations/webhooks настраивается при создании каждой sequence
- unsubscribe intent обрабатывается ПЕРВЫМ — до любой другой логики → DNC + companies.status='dnc_blocked'
- 'other' intent → НЕ отвечаем автоматически → alert оператору
- Дедупликация webhook по email_id (Salesforge может слать дважды)
- Out-of-office (primebox-label='ooo') → игнорировать, не отвечать
- Ответ должен быть отправлен в течение 5 минут от получения webhook

## Status Update Rules
- Person 3 ВЛАДЕЕТ обновлением этих статусов:
  outreach_sent, page_opened (реакция на webhook), responded,
  pilot_running, pilot_results_ready, demo_booked, dnc_blocked
