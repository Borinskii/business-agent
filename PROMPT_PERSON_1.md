# ПРОМПТ ДЛЯ PERSON 1 — Data & Intelligence Layer
### Вставить в Claude Code в первом сообщении

---

Ты реализуешь слой данных системы Phantom Pipeline.

Прочитай последовательно:
1. `CLAUDE.md` — общий контекст проекта
2. `SPEC_PERSON_1_DATA_INTELLIGENCE.md` — твоя полная спецификация
3. `.claude/rules/data-layer.md` — правила твоего слоя

Твои модули по приоритету:

**ПРИОРИТЕТ 1 — День 1 (сделай прямо сейчас, остальные ждут тебя):**

Создай и примени миграцию `supabase/migrations/20260325_001_create_companies_signals.sql` содержащую таблицы `companies`, `signals`, `upload_log` со всеми полями, CHECK constraints, индексами и RLS политиками точно по спецификации из `SPEC_PERSON_1_DATA_INTELLIGENCE.md`.

Затем создай файл `src/mocks/companies.json` с тремя компаниями имеющими полностью заполненные поля: id, name, domain, logo_url, industry, size, sdr_count, pain_score, monthly_loss_estimate, decision_maker (name/title/email/linkedin_url), tech_stack, signals (минимум один сигнал), status='profiled'.

Затем создай `src/types/company.ts` с TypeScript интерфейсами Company, Signal, DecisionMaker, UploadLog — точно соответствующими SQL схеме.

Сообщи Person 2 и Person 3 что мок-данные готовы.

**ПРИОРИТЕТ 2 — День 2–3:**

Реализуй `src/signal-hunter/index.ts` — модуль мониторинга сигналов боли. Начни с двух сигналов: `hiring_sdrs` (через Leadsforge API) и `funding` (через Crunchbase API). Для остальных трёх сигналов создай заглушки которые возвращают пустой массив и логируют "not implemented yet". Создай `src/signal-hunter/cli.ts` принимающий `--source linkedin|crunchbase|g2 --limit number`.

Реализуй `src/profiler/index.ts` — обогащение компании. Использует Leadsforge для базовых данных и поиска decision maker. Рассчитывает monthly_loss_estimate по формуле из CLAUDE.md. Проверяет enrichment_score и останавливает pipeline если < 60.

**ПРИОРИТЕТ 3 — День 4–5:**

Реализуй `src/salesforge-bridge/index.ts` — загрузка контакта в Salesforge. DNC check → email validation → bulk upload с custom_vars. Сохраняет salesforce_contact_id в Supabase.

Реализуй Signal 3 (G2 scraper) — HTTP scraper страниц отзывов Instantly/Apollo/Lemlist на G2.

**ПРИОРИТЕТ 4 — День 6–7:**

Интеграционный тест: прогони полный цикл на 5 реальных компаниях. В Supabase должно быть 20+ компаний со статусом `profiled` и заполненным `salesforce_contact_id`.

Не спрашивай уточнений — все ответы есть в спецификации. Если данных не хватает в конкретном API — используй разумные дефолты и задокументируй в комментарии.
