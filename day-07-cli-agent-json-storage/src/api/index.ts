import OpenAI from 'openai';
import { AppConfig, ChatMessage, MessageRole, APIError, RateLimitError, NetworkError } from '../types';
import { logger } from '../utils/logger';

/**
 * Класс для взаимодействия с OpenAI API
 */
export class OpenAIClient {
  private client: OpenAI;
  private config: AppConfig;

  constructor(config: AppConfig) {
    this.config = config;
    this.client = new OpenAI({
      baseURL: config.apiBaseUrl,
      apiKey: config.apiKey,
    });
    
    logger.info(`Инициализирован OpenAI клиент с моделью: ${config.model}`);
  }

  /**
   * Отправляет сообщение и получает ответ от LLM
   */
  async sendMessage(messages: ChatMessage[]): Promise<string> {
    logger.info('Отправка запроса к LLM');
    
    // Форматируем сообщения для API (убираем timestamp)
    const apiMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    try {
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: apiMessages as OpenAI.Chat.ChatCompletionMessageParam[],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      });

      const assistantMessage = response.choices[0]?.message?.content;
      
      if (!assistantMessage) {
        logger.error('Пустой ответ от LLM');
        throw new APIError('Пустой ответ от LLM');
      }

      logger.info('Получен ответ от LLM');
      return assistantMessage;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Обрабатывает ошибки API
   */
  private handleError(error: unknown): never {
    // Проверяем, является ли ошибка ошибкой OpenAI
    if (error && typeof error === 'object' && 'status' in error) {
      const apiError = error as { status: number; message: string; headers?: Record<string, string> };
      
      // Обработка rate limit
      if (apiError.status === 429) {
        const retryAfter = apiError.headers?.['retry-after'];
        logger.error(`Rate limit превышен. Повторите через ${retryAfter || 'некоторое время'}`);
        throw new RateLimitError(
          'Превышен лимит запросов (rate limit)',
          retryAfter ? parseInt(retryAfter) : undefined
        );
      }

      // Другие ошибки API
      logger.error(`Ошибка API: ${apiError.message} (статус: ${apiError.status})`);
      throw new APIError(`Ошибка API: ${apiError.message}`, apiError.status);
    }

    // Обработка ошибок сети (fetch/axios)
    if (error && typeof error === 'object' && 'cause' in error) {
      const networkError = error as { cause: Error };
      logger.error(`Ошибка сети: ${networkError.cause}`);
      throw new NetworkError(`Ошибка сети: ${networkError.cause}`);
    }

    // Неизвестные ошибки
    logger.error(`Неизвестная ошибка: ${error}`);
    throw new APIError(`Неизвестная ошибка: ${error}`);
  }

  /**
   * Возвращает текущую конфигурацию
   */
  getConfig(): AppConfig {
    return this.config;
  }
}

/**
 * Создает экземпляр клиента
 */
export function createOpenAIClient(config: AppConfig): OpenAIClient {
  return new OpenAIClient(config);
}
