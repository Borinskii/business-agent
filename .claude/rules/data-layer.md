# Rules: Data Layer (Person 1)
# Applies to: src/signal-hunter/**, src/profiler/**, src/salesforge-bridge/**

## Signal Hunter Rules
- Запускать сканер не чаще 1 раза в 6 часов на источник
- Дедупликация по domain: если компания уже есть в companies с created_at > now()-30d → только новый сигнал
- pain_score = сумма pain_points всех сигналов, максимум 100
- Порядок приоритетов сигналов: competitor_ai_adoption(45) > g2_negative_review(40) > hiring_sdrs(35) > funding(30) > sdr_churn(25)

## Profiler Rules
- enrichment_score < 60 → статус остаётся 'detected', не переходим к content generation
- decision_maker.email обязателен: без него компания не идёт дальше
- sdr_count эвристика: size<30→1, 30-100→3, 100-200→6
- logo_url fallback: `https://logo.clearbit.com/${domain}`
- monthly_loss_estimate = sdr_count * 1903 (всегда эта формула)

## Salesforge Bridge Rules
- DNC check ВСЕГДА первым делом — до любой загрузки
- Email validation обязательна (timeout 60s → загружаем без неё с предупреждением)
- custom_vars pdf_url и video_url оставляем пустыми — Person 2 обновит
- Один контакт = один decision maker (самый высокий по иерархии)

## Supabase Rules
- Всегда используй supabase service_role key для server-side операций
- Никогда не используй anon key в CLI скриптах
