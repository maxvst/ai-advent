# Simple CLI LLM Agent

Консольное приложение на Node.js с TypeScript, реализующее текстовый LLM агент в виде CLI чата с поддержкой OpenAI-совместимых API (OpenRouter, MiniMax и др.).

## Назначение

Приложение позволяет общаться с LLM через командную строку, сохраняя полный контекст сессии между запросами.

## Требования

- Node.js 18+
- TypeScript 5.3+

## Установка

```bash
npm install
```

## Сборка

```bash
npm run build
```

## Запуск

```bash
npm start
```

или в режиме разработки:

```bash
npm run dev
```

## Конфигурация

Настройки подключения к LLM хранятся в файле `config.json`:

```json
{
  "apiUrl": "https://openrouter.ai/api/v1/chat/completions",
  "model": "deepseek/deepseek-v3.2",
  "apiKey": "your-api-key-here"
}
```

| Параметр | Описание |
|----------|----------|
| `apiUrl` | URL API эндпоинта |
| `model` | Имя модели/агента |
| `apiKey` | API ключ для аутентификации |

## Модули

### src/agent/index.ts - LLMAgent

Основной класс агента, инкапсулирующий логику взаимодействия с LLM.

#### Методы

- **`sendMessage(userMessage: string): Promise<string>`** - отправляет сообщение пользователя и возвращает ответ ассистента
- **`setSystemPrompt(prompt: string): void`** - устанавливает системный промпт
- **`getHistory(): Message[]`** - возвращает историю сообщений
- **`clearHistory(): void`** - очищает историю сообщений

#### Пример использования

```typescript
import { LLMAgent } from './src/agent/index.js';
import { ConfigLoader } from './src/config/index.js';

const configLoader = new ConfigLoader();
const agent = new LLMAgent(configLoader.getConfig());

const response = await agent.sendMessage('Привет!');
console.log(response);
```

### src/config/index.ts - ConfigLoader

Класс для загрузки и валидации конфигурации из JSON файла.

### src/index.ts - CLIChat

Точка входа CLI приложения с обработкой пользовательского ввода.

## Команды чата

- `/exit` - выход из приложения
- `/clear` - очистить историю сообщений
- `/history` - показать историю разговора
- `Ctrl+D` - выход (EOF)

## Примеры использования

```
=== Simple CLI LLM Agent ===
Type your messages and press Enter to send.
Type /exit to quit.

You: Привет! Как дела?
Thinking...
Assistant: Привет! Я готов помочь вам. Чем могу быть полезен?

You: Напиши функцию на Python
Thinking...
Assistant: Конечно! Какую именно функцию вам нужно написать?..

You: /exit
Goodbye!
```

## Структура проекта

```
simple-cli-agent/
├── config.json          # Конфигурация подключения
├── package.json         # Зависимости
├── tsconfig.json        # Конфигурация TypeScript
├── .gitignore          # Исключения git
└── src/
    ├── index.ts         # Точка входа
    ├── agent/
    │   └── index.ts     # Модуль агента
    └── config/
        └── index.ts     # Модуль конфигурации
```
