import OpenAI from 'openai';
import { OpenAIConfig, OpenAIClient as IOpenAIClient } from './types';

/**
 * Клиент для работы с OpenAI API
 */
export class OpenAIClient implements IOpenAIClient {
  private client: OpenAI;
  private model: string;

  constructor(config: OpenAIConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
    this.model = config.model;
  }

  /**
   * Отправляет запрос к Chat Completion API
   * @param prompt Текст промпта
   * @returns Ответ модели
   */
  async chatCompletion(prompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('Пустой ответ от модели');
    }

    return content;
  }

  /**
   * Возвращает имя используемой модели
   */
  getModel(): string {
    return this.model;
  }
}
