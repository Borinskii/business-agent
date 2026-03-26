# ПРОМПТ ДЛЯ PERSON 3 — Execution & Conversion Layer
### Вставить в Claude Code в первом сообщении

---

Ты реализуешь слой исполнения и конверсии системы Phantom Pipeline.

Прочитай последовательно:
1. `CLAUDE.md` — общий контекст проекта
2. `SPEC_PERSON_3_EXECUTION_CONVERSION.md` — твоя полная спецификация
3. `.claude/rules/execution-layer.md` — правила твоего слоя

Твои модули по приоритету:

**ПРИОРИТЕТ 1 — День 1:**

Создай `src/lib/salesforge.ts` — Salesforge API клиент с методами `get`, `post`, `put`. Включи exponential backoff для 429: задержки 30s → 60s → 120s, максимум 3 попытки. Типизируй все методы строго.

Проверь доступ к Salesforge API: `GET /me` должен вернуть аккаунт. Выведи результат в терминал. Сообщи команде что API работает.

Создай и примени миграцию `supabase/migrations/20260325_003_create_sequences_pilots.sql` содержащую таблицы `sequences`, `pilots`, `pilot_requests`, `frank_replies` со всеми полями, CHECK constraints, индексами и RLS политиками точно по спецификации.

**ПРИОРИТЕТ 2 — День 2–3:**

Реализуй `src/delivery-engine/index.ts` — создание Salesforge sequence. Создаёт workspace → multichannel sequence → 4 nodes (Email Day1, LinkedIn Day3, Condition no_reply_48h, FOMO Email Day5) → enrolls contact → регистрирует webhook для ответов. Шаблоны писем точно по спецификации (FOMO без упоминания конкретных конкурентов). Создай `src/delivery-engine/cli.ts`.

Реализуй webhook endpoints:
- `POST /api/webhooks/page-opened` — получает от Person 2, добавляет immediate follow-up node
- `POST /api/webhooks/reply` — получает от Salesforge Primebox, детектирует intent, запускает pilot если positive/pilot_request

**ПРИОРИТЕТ 3 — День 4–5:**

Реализуй `src/pilot-runner/index.ts` — 48H Free Pilot. Создаёт изолированный workspace, загружает knowledge base, ищет 50 лидов через Leadsforge, создаёт sequence от имени компании, enrolls лидов. Через 48ч собирает аналитику через `/sequences/{id}/analytics` и живые треды через `/threads`. Отправляет summary email с результатами.

ВАЖНО: реализуй cron-защиту — каждые 30 минут проверяй `pilots` где `status='running' AND started_at < now()-48h` и вызывай `collectPilotResults` (защита от потери setTimeout при рестарте).

Реализуй `src/primebox/index.ts` — Agent Frank через Primebox. `classifyIntent` по regex паттернам. Claude API генерирует ответ (system: не упоминать что AI, max 4 предложения). Отправляет через `/mailboxes/{id}/emails/{id}/reply`. Unsubscribe → DNC → `dnc_blocked`. Дедупликация по email_id.

**ПРИОРИТЕТ 4 — День 6–7:**

Реализуй главный orchestrator `src/orchestrator/index.ts` — TypeScript CLI который запускает полный цикл: читает компании со статусом `content_generated` → создаёт sequence → обновляет статус. Запускается командой `npm run orchestrate`.

Интеграционный тест: 3 компании от Person 1 должны пройти полный цикл до статуса `pilot_results_ready`.

Не спрашивай уточнений — все ответы есть в спецификации. Если Salesforge API возвращает неожиданный формат — логируй полный response и продолжай с graceful degradation.
