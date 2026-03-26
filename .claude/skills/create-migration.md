# Skill: create-migration
# Использовать когда: нужно создать или изменить таблицу в Supabase

## Workflow
1. Прочитай существующие миграции в `supabase/migrations/`
2. Определи следующий номер: `20260325_00N_description.sql`
3. Создай файл миграции с полным SQL
4. Создай rollback: `20260325_00N_rollback.sql`
5. Проверь: `npx supabase db push --dry-run`

## Обязательные элементы каждой таблицы
```sql
id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
created_at timestamptz NOT NULL DEFAULT now()
```

## Обязательные элементы для таблиц с обновлением
```sql
updated_at timestamptz NOT NULL DEFAULT now()
-- + trigger update_updated_at
```

## RLS (обязательна для всех таблиц)
```sql
ALTER TABLE {t} ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON {t}
  FOR ALL TO service_role USING (true);
```

## Индексы (обязательны)
```sql
-- FK columns
CREATE INDEX idx_{t}_{fk_col} ON {t}({fk_col});
-- Status columns (часто в WHERE)
CREATE INDEX idx_{t}_status ON {t}(status);
-- Timestamp columns (часто в ORDER BY)
CREATE INDEX idx_{t}_created ON {t}(created_at DESC);
```

## Применение
```bash
npx supabase db push              # применить все миграции
npx supabase db push --dry-run    # проверить без применения
npx supabase gen types typescript # обновить TypeScript типы
```
