# ПРОМПТ ДЛЯ PERSON 2 — Content Generation Layer
### Вставить в Claude Code в первом сообщении

---

Ты реализуешь слой генерации контента системы Phantom Pipeline.

Прочитай последовательно:
1. `CLAUDE.md` — общий контекст проекта
2. `SPEC_PERSON_2_CONTENT_GENERATION.md` — твоя полная спецификация
3. `.claude/rules/content-layer.md` — правила твоего слоя

Твои модули по приоритету:

**ПРИОРИТЕТ 1 — День 1:**

Получи от Person 1 файлы `src/mocks/companies.json` и `src/types/company.ts`. Если их нет — подожди, они критичны.

Создай и примени миграцию `supabase/migrations/20260325_002_create_reports.sql` содержащую таблицу `reports`, `page_views` со всеми полями, CHECK constraints, индексами и RLS политиками точно по спецификации.

Создай Next.js проект в `src/live-counter/` с конфигурацией для домена `phantom-pipeline.com`. Убедись что `next.config.js` настроен и `npx next dev` запускается без ошибок.

**ПРИОРИТЕТ 2 — День 2–3:**

Реализуй `src/pdf-generator/index.ts`. Генерирует контент через Claude API (строго JSON), рендерит через Puppeteer, загружает в Supabase Storage bucket 'reports', возвращает публичный URL. HTML шаблон — 5 страниц точно по спецификации. Создай `src/pdf-generator/cli.ts` принимающий `--company-id`.

Реализуй `src/live-counter/app/[slug]/page.tsx` — персональная страница компании. getStaticProps загружает company + report из Supabase. LiveCounter компонент тикает с первой секунды. `/api/page-opened` webhook срабатывает один раз на визит.

**ПРИОРИТЕТ 3 — День 4–5:**

Реализуй `src/video-generator/index.ts`. Генерирует script через Claude API, отправляет в Sora AI API. Если Sora недоступен (503 или timeout 5 минут) — немедленный fallback на Heygen. Если Heygen тоже недоступен — `video_provider='skipped'`, pipeline продолжается. Создай `src/video-generator/cli.ts`.

Реализуй POST `/api/start-pilot` в live-counter — принимает icp_description + email, сохраняет в `pilot_requests`, обновляет `companies.status = 'responded'`, отправляет webhook на URL из `process.env.PERSON_3_WEBHOOK_URL`.

После генерации PDF и видео: обновляй `custom_vars` в Salesforge для контакта — поля `pdf_url` и `video_url`.

**ПРИОРИТЕТ 4 — День 6–7:**

Интеграция: убедись что при изменении `companies.status` на `content_generated` Person 3 получает уведомление. Проверь что `pdf_url` и `video_url` корректно подставляются в письма через Salesforge custom_vars.

Не спрашивай уточнений — все ответы есть в спецификации. Если ANTHROPIC_API_KEY не задан — выбрасывай ошибку при старте с сообщением какая переменная отсутствует.
