# LLM Prompting Strategies Comparison Tool

Приложение на Node.js + TypeScript для сравнения различных стратегий промптинга LLM моделей через OpenAI API.

## Описание

Приложение отправляет одну и ту же задачу LLM модели четырьмя различными способами:

1. **Прямой запрос** - отправка задачи без дополнительных инструкций
2. **Пошаговое решение** - добавление инструкции "решай пошагово"
3. **Мета-промпт** - модель сначала создаёт оптимальный промпт, затем использует его
4. **Группа экспертов** - промпт с ролями: аналитик, инженер, критик

## Установка

```bash
# Установка зависимостей
npm install
```

## Конфигурация

1. Скопируйте файл `config.example.json` в `config.json`:

```bash
cp config.example.json config.json
```

2. Отредактируйте `config.json` и укажите свой API ключ:

```json
{
  "openai": {
    "apiKey": "YOUR_API_KEY_HERE",
    "model": "deepseek/deepseek-v3.2",
    "baseUrl": "https://openrouter.ai/api/v1"
  },
  "task": {
    "description": "Есть две ёмкости: 5 литров и 3 литра. Как отмерить ровно 4 литра воды, используя только эти ёмкости? Воды неограниченное количество."
  }
}
```

> ⚠️ **Важно**: Никогда не коммитьте файл `config.json` с реальным API ключом в репозиторий!

### Параметры конфигурации:

| Параметр | Описание |
|----------|----------|
| `openai.apiKey` | Ваш API ключ OpenAI |
| `openai.model` | Модель для использования (gpt-4, gpt-3.5-turbo и др.) |
| `openai.baseUrl` | Базовый URL API (опционально, для прокси или альтернативных API) |
| `task.description` | Текст задачи для решения |

## Запуск

```bash
# Режим разработки (через ts-node)
npm start

# Или сборка и запуск
npm run build
npm run start:prod
```

## Пример вывода

Смотрите пример работы программы в файле [`results.example.md`](./results.example.md).

## Структура проекта

```
day-03-glm5/
├── src/
│   ├── index.ts              # Точка входа
│   ├── config.ts             # Загрузка конфигурации
│   ├── openai-client.ts      # Клиент OpenAI API
│   ├── types.ts              # TypeScript типы
│   └── strategies/
│       ├── index.ts          # Экспорт всех стратегий
│       ├── direct.ts         # Стратегия 1: Прямой запрос
│       ├── step-by-step.ts   # Стратегия 2: Пошаговое решение
│       ├── meta-prompt.ts    # Стратегия 3: Мета-промпт
│       └── expert-group.ts   # Стратегия 4: Группа экспертов
├── config.json               # Конфигурационный файл (не коммитить!)
├── config.example.json       # Пример конфигурации
├── package.json
├── tsconfig.json
└── README.md
```

## Добавление новых стратегий

1. Создайте новый файл в `src/strategies/`:

```typescript
import { PromptingStrategy, StrategyResult, OpenAIClient } from '../types';

export class MyStrategy implements PromptingStrategy {
  name = 'Моя стратегия';
  description = 'Описание стратегии';

  async execute(task: string, client: OpenAIClient): Promise<StrategyResult> {
    const prompt = `...`;
    
    const startTime = Date.now();
    const response = await client.chatCompletion(prompt);
    const executionTimeMs = Date.now() - startTime;

    return {
      strategyName: this.name,
      prompt,
      response,
      executionTimeMs,
    };
  }
}
```

2. Добавьте стратегию в `src/strategies/index.ts`:

```typescript
import { MyStrategy } from './my-strategy';

export const strategies: PromptingStrategy[] = [
  // ... существующие стратегии
  new MyStrategy(),
];
```

## Лицензия

ISC
