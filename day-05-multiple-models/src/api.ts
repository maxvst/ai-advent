/**
 * Модуль для работы с OpenRouter API через OpenAI SDK
 */

import OpenAI from 'openai';
import { Config, ChatMessage, IApiClient, TokenUsage } from './types';
import { MockApiClient } from './api-mock';

/**
 * Класс для работы с API
 */
export class ApiClient implements IApiClient {
  private client: OpenAI;
  private maxRetries: number;
  private retryDelayMs: number;

  constructor(config: Config, maxRetries = 3, retryDelayMs = 1000) {
    this.client = new OpenAI({
      apiKey: config.openRouter.apiKey,
      baseURL: config.openRouter.baseUrl,
      defaultHeaders: {
        'HTTP-Referer': 'https://github.com/ai-advent/day-05-multiple-models',
        'X-Title': 'LLM Models Comparison Tool'
      }
    });
    this.maxRetries = maxRetries;
    this.retryDelayMs = retryDelayMs;
  }

  /**
   * Создать клиент из конфигурации
   */
  static fromConfig(config: Config): ApiClient {
    return new ApiClient(config);
  }

  /**
   * Отправить запрос к модели с retry
   */
  async sendRequest(
    modelId: string,
    messages: ChatMessage[]
  ): Promise<OpenAI.Chat.Completions.ChatCompletion> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.client.chat.completions.create({
          model: modelId,
          messages: messages.map(m => ({
            role: m.role,
            content: m.content
          }))
        });
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        
        // Если это последняя попытка, выбрасываем ошибку
        if (attempt === this.maxRetries) {
          break;
        }
        
        // Ждём перед следующей попыткой
        await this.delay(this.retryDelayMs * attempt);
      }
    }
    
    throw lastError || new Error('Неизвестная ошибка при отправке запроса');
  }

  /**
   * Отправить запрос с замером времени
   */
  async sendRequestWithTiming(
    modelId: string,
    messages: ChatMessage[]
  ): Promise<{ 
    response: OpenAI.Chat.Completions.ChatCompletion; 
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
  extractContent(response: OpenAI.Chat.Completions.ChatCompletion): string {
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
  extractUsage(response: OpenAI.Chat.Completions.ChatCompletion): { inputTokens: number; outputTokens: number } {
    return {
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0
    };
  }

  /**
   * Задержка
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ==================== Функции для обратной совместимости ====================

let defaultClient: ApiClient | null = null;

/**
 * Инициализировать API клиент (для обратной совместимости)
 * @deprecated Используйте ApiClient.fromConfig()
 */
export function initApiClient(config: Config): void {
  defaultClient = ApiClient.fromConfig(config);
}

/**
 * Получить клиент
 */
function getClient(): ApiClient {
  if (!defaultClient) {
    throw new Error('API клиент не инициализирован. Вызовите initApiClient сначала.');
  }
  return defaultClient;
}

/**
 * Отправить запрос к модели (для обратной совместимости)
 */
export async function sendRequest(
  modelId: string,
  messages: ChatMessage[]
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  return getClient().sendRequest(modelId, messages);
}

/**
 * Отправить запрос с замером времени (для обратной совместимости)
 */
export async function sendRequestWithTiming(
  modelId: string,
  messages: ChatMessage[]
): Promise<{ 
  response: OpenAI.Chat.Completions.ChatCompletion; 
  responseTimeMs: number 
}> {
  return getClient().sendRequestWithTiming(modelId, messages);
}

/**
 * Извлечь контент из ответа API (для обратной совместимости)
 */
export function extractContent(
  response: OpenAI.Chat.Completions.ChatCompletion
): string {
  return getClient().extractContent(response);
}

/**
 * Извлечь использование токенов из ответа API (для обратной совместимости)
 */
export function extractUsage(
  response: OpenAI.Chat.Completions.ChatCompletion
): { inputTokens: number; outputTokens: number } {
  return getClient().extractUsage(response);
}

// ==================== Фабрика API клиентов ====================

/**
 * Проверить, включён ли режим моков
 */
export function isMockMode(): boolean {
  return process.env.USE_MOCK_API === 'true' || process.env.USE_MOCK_API === '1';
}

/**
 * Создать API клиент (реальный или мок)
 */
export function createApiClient(config: Config): IApiClient {
  if (isMockMode()) {
    console.log('📋 Используется MOCK режим API (тестовые данные)\n');
    return new MockApiClient(100); // 100ms задержка для реалистичности
  }
  
  return ApiClient.fromConfig(config);
}
