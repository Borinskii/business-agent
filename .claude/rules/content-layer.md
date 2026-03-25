# Rules: Content Layer (Person 2)
# Applies to: src/pdf-generator/**, src/video-generator/**, src/live-counter/**

## PDF Generator Rules
- Claude API system prompt ВСЕГДА включает "Output ONLY valid JSON. No markdown. No preamble."
- PDF timeout: 30 секунд — если превышен → статус 'failed', не крашить процесс
- personal_page_slug = domain.replace(/\./g, '-') — без исключений
- После генерации PDF: обновить custom_vars в Salesforge (pdf_url)
- Если logo_url 404 → SVG с инициалами компании (не ломаем PDF из-за логотипа)
- Не перегенерировать если report уже существует для company_id

## Video Generator Rules
- Sora timeout: 5 минут → немедленный fallback на Heygen
- Heygen тоже недоступен → video_provider='skipped', video_url=null, pipeline продолжается
- После генерации видео: обновить custom_vars в Salesforge (video_url)
- Структура сцен фиксированная: 5 сцен, 90 секунд, без отклонений

## Live Counter Rules
- Счётчик всегда начинает с $0.00 (не накопленные потери)
- lossPerSecond = monthlyLoss / 30 / 24 / 3600
- Если monthly_loss_estimate = null → дефолт 1903 (1 SDR)
- /api/page-opened дедуплицируется по ip_hash (не на каждый refresh)
- Slug нормализация: domain → replace(/\./g, '-')
- video section НЕ рендерится если video_url = null

## Status Rules
- После генерации PDF + video → companies.status = 'content_generated'
- После записи в reports → reports.status = 'ready'
- Если что-то failed → reports.status = 'failed' + failure_reason заполнен
