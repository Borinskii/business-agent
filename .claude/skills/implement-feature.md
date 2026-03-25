# Skill: implement-feature
# Использовать когда: нужно реализовать новый модуль по спецификации

## Workflow
1. Прочитай CLAUDE.md для понимания общей архитектуры
2. Прочитай соответствующую SPEC_PERSON_*.md секцию модуля
3. Прочитай правило из .claude/rules/ для своего слоя
4. Создай файл в правильной директории `src/{module}/`
5. Реализуй с полной обработкой ошибок
6. Создай CLI скрипт `src/{module}/cli.ts` с `--company-id` аргументом
7. Проверь что Supabase статус обновляется корректно

## Структура модуля
```
src/{module}/
  index.ts      ← основная логика (экспортирует функцию)
  cli.ts        ← CLI wrapper (npx ts-node src/{module}/cli.ts --company-id uuid)
  types.ts      ← TypeScript интерфейсы специфичные для модуля
  __tests__/
    index.test.ts
```

## Шаблон CLI
```typescript
// cli.ts
import { parseArgs } from 'node:util'
import { mainFunction } from './index'

const { values } = parseArgs({
  options: { 'company-id': { type: 'string' } }
})
if (!values['company-id']) {
  console.error('Usage: --company-id <uuid>')
  process.exit(1)
}
mainFunction(values['company-id'])
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1) })
```

## Проверка перед завершением
- [ ] Нет any типов
- [ ] Все внешние вызовы в try/catch
- [ ] Supabase статус обновляется
- [ ] CLI работает: `npx ts-node src/{module}/cli.ts --company-id test-uuid`
- [ ] Console.log с timestamp prefix
