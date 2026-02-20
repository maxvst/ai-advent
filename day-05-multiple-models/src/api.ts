/**
 * Модуль для работы с OpenRouter API через OpenAI SDK
 */

import OpenAI from 'openai';
import { Config, ChatMessage } from './types';

let openaiClient: OpenAI | null = null;

/**
 * Инициализация OpenAI клиента для работы с OpenRouter
 */
export function initApiClient(config: Config): void {
  openaiClient = new OpenAI({
    apiKey: config.openRouter.apiKey,
    baseURL: config.openRouter.baseUrl,
    defaultHeaders: {
      'HTTP-Referer': 'https://github.com/ai-advent/day-05-multiple-models',
      'X-Title': 'LLM Models Comparison Tool'
    }
  });
}

/**
 * Получить инициализированный клиент
 */
function getClient(): OpenAI {
  if (!openaiClient) {
    throw new Error('API клиент не инициализирован. Вызовите initApiClient сначала.');
  }
  return openaiClient;
}

/**
 * Отправить запрос к модели
 */
export async function sendRequest(
  modelId: string,
  messages: ChatMessage[]
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  const client = getClient();
  
  const response = await client.chat.completions.create({
    model: modelId,
    messages: messages.map(m => ({
      role: m.role,
      content: m.content
    }))
  });
  
  return response;
}

/**
 * Отправить запрос с замером времени
 */
export async function sendRequestWithTiming(
  modelId: string,
  messages: ChatMessage[]
): Promise<{ 
  response: OpenAI.Chat.Completions.ChatCompletion; 
  responseTimeMs: number 
}> {
  const startTime = Date.now();
  const response = await sendRequest(modelId, messages);
  const endTime = Date.now();
  
  return {
    response,
    responseTimeMs: endTime - startTime
  };
}

/**
 * Извлечь контент из ответа API
 */
export function extractContent(
  response: OpenAI.Chat.Completions.ChatCompletion
): string {
  if (!response.choices || response.choices.length === 0) {
    throw new Error('Пустой ответ от API');
  }
  return response.choices[0].message.content ?? '';
}

/**
 * Извлечь использование токенов из ответа API
 */
export function extractUsage(
  response: OpenAI.Chat.Completions.ChatCompletion
): { inputTokens: number; outputTokens: number } {
  return {
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0
  };
}
