# Спецификация фичи: [НАЗВАНИЕ]

## Описание
[Что делает, для кого, зачем — 2–3 предложения]

## User Stories
- Как [роль], я хочу [действие], чтобы [результат]
- Как [роль], я хочу [действие], чтобы [результат]
- Как [роль], я хочу [действие], чтобы [результат]

## Модель данных
```sql
CREATE TABLE example (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_name text NOT NULL,
  status     text NOT NULL CHECK (status IN ('a','b','c')),
  created_at timestamptz NOT NULL DEFAULT now()
);
```

## API
```
POST /api/resource
Body:    { field: type }
Response 200: { id: uuid }
Response 400: { error: 'description' }
Response 404: { error: 'not_found' }
```

## Экраны и компоненты
[Страницы, компоненты, состояния: загрузка / ошибка / пусто / успех]

## Бизнес-логика
- Правило 1
- Правило 2
- Формула расчёта

## Крайние случаи
- Что если API недоступен?
- Что если данные неполные?
- Что если запрос дублируется?

## Приоритет / Зависимости
- Зависит от: [модуль]
- Блокирует: [модуль]
- Приоритет: High / Medium / Low
