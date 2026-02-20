/**
 * Мок-реализация API клиента для тестирования
 */

import { IApiClient, ChatMessage, TokenUsage } from './types';

/**
 * Мок-ответ API (имитация структуры OpenAI ChatCompletion)
 */
interface MockChatCompletion {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Мок-клиент API для тестирования без реальных запросов
 */
export class MockApiClient implements IApiClient {
  private delayMs: number;
  private requestCounter: number = 0;

  constructor(delayMs: number = 100) {
    this.delayMs = delayMs;
  }

  /**
   * Отправить запрос к модели (мок)
   */
  async sendRequest(
    modelId: string,
    messages: ChatMessage[]
  ): Promise<MockChatCompletion> {
    // Имитация задержки сети
    await this.delay(this.delayMs);
    
    this.requestCounter++;
    
    // Генерируем мок-ответ на основе последнего сообщения пользователя
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    const content = this.generateMockContent(modelId, lastUserMessage?.content || '');
    
    return {
      id: `mock-${this.requestCounter}-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: modelId,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content
          },
          finish_reason: 'stop'
        }
      ],
      usage: {
        prompt_tokens: 50,
        completion_tokens: 100,
        total_tokens: 150
      }
    };
  }

  /**
   * Отправить запрос с замером времени (мок)
   */
  async sendRequestWithTiming(
    modelId: string,
    messages: ChatMessage[]
  ): Promise<{ 
    response: MockChatCompletion; 
    responseTimeMs: number 
  }> {
    const startTime = Date.now();
    const response = await this.sendRequest(modelId, messages);
    const endTime = Date.now();
    
    return {
      response,
      responseTimeMs: endTime - startTime
    };
  }

  /**
   * Извлечь контент из ответа API
   */
  extractContent(response: MockChatCompletion): string {
    if (!response.choices || response.choices.length === 0) {
      throw new Error('Пустой ответ от API: отсутствуют choices');
    }
    
    const content = response.choices[0].message.content;
    if (!content || content.trim().length === 0) {
      throw new Error('Модель вернула пустой ответ');
    }
    
    return content;
  }

  /**
   * Извлечь использование токенов из ответа API
   */
  extractUsage(response: MockChatCompletion): TokenUsage {
    return {
      inputTokens: response.usage?.prompt_tokens ?? 50,
      outputTokens: response.usage?.completion_tokens ?? 100
    };
  }

  /**
   * Генерация мок-контента на основе модели и промпта
   */
  private generateMockContent(modelId: string, prompt: string): string {
    const promptLower = prompt.toLowerCase();
    
    // Определяем тип запроса по содержимому промпта
    if (promptLower.includes('оцени') || promptLower.includes('сравн')) {
      return this.generateComparisonResponse();
    }
    
    if (promptLower.includes('итоговый вывод') || promptLower.includes('заключение')) {
      return this.generateFinalConclusionResponse();
    }
    
    // Обычный ответ модели
    return this.generateModelResponse(modelId);
  }

  /**
   * Мок-ответ для обычного вопроса
   */
  private generateModelResponse(modelId: string): string {
    const modelType = this.detectModelType(modelId);
    
    const responses: Record<string, string> = {
      strong: `[MOCK] Ответ от сильной модели (${modelId}).

Это тестовый ответ для проверки работы программы без реальных API запросов.

Сильная модель предоставляет развёрнутый ответ с глубоким анализом вопроса, 
рассматривая его с различных сторон и приводя аргументированные выводы.

Ключевые моменты:
1. Первый важный аспект проблемы
2. Второй аспект с примерами
3. Итоговые выводы и рекомендации`,

      medium: `[MOCK] Ответ от средней модели (${modelId}).

Это тестовый ответ средней модели. 
Модель даёт хороший ответ, но менее детальный чем сильная.

Основные пункты:
- Важный аспект первый
- Важный аспект второй
- Краткий вывод`,

      weak: `[MOCK] Ответ от слабой модели (${modelId}).

Это простой тестовый ответ.
Модель даёт базовый ответ на вопрос.

Вывод: это тестовый ответ.`
    };
    
    return responses[modelType] || responses.medium;
  }

  /**
   * Мок-ответ для сравнения ответов
   */
  private generateComparisonResponse(): string {
    return `[MOCK] Оценка ответов от модели-оценщика.

### Ответ 1
- Оценка: 8
- Анализ: Это хороший ответ с правильной структурой и аргументацией. Присутствует логическая последовательность.

### Ответ 2
- Оценка: 7
- Анализ: Ответ приемлемый, но не хватает глубины анализа. Некоторые аргументы недостаточно раскрыты.

### Ответ 3
- Оценка: 6
- Анализ: Базовый ответ, покрывающий основные моменты. Недостаточно примеров и детализации.`;
  }

  /**
   * Мок-ответ для итогового вывода
   */
  private generateFinalConclusionResponse(): string {
    return `[MOCK] Итоговый вывод от сильной модели.

## Анализ результатов сравнения

На основе оценок всех моделей можно сделать следующие выводы:

### Лучший ответ
Ответ от сильной модели показал наилучшие результаты благодаря:
- Глубокому анализу проблемы
- Структурированному изложению
- Практическим примерам

### Рекомендации
1. Для сложных задач рекомендуется использовать сильные модели
2. Средние модели подходят для рутинных задач
3. Слабые модели можно использовать для простых операций

Это тестовый итоговый вывод для проверки работы программы.`;
  }

  /**
   * Определить тип модели по ID
   */
  private detectModelType(modelId: string): 'strong' | 'medium' | 'weak' {
    const id = modelId.toLowerCase();
    
    // Паттерны для определения типа модели
    if (id.includes('gpt-4') || id.includes('claude-3-opus') || id.includes('glm-5')) {
      return 'strong';
    }
    if (id.includes('gpt-3.5') || id.includes('claude-3-sonnet') || id.includes('qwen') || id.includes('80b')) {
      return 'medium';
    }
    if (id.includes('llama') || id.includes('7b') || id.includes('8b') || id.includes('small')) {
      return 'weak';
    }
    
    return 'medium';
  }

  /**
   * Задержка
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
