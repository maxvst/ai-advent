/**
 * Конфигурация OpenAI API
 */
export interface OpenAIConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
}

/**
 * Конфигурация задачи
 */
export interface TaskConfig {
  description: string;
}

/**
 * Полная конфигурация приложения
 */
export interface Config {
  openai: OpenAIConfig;
  task: TaskConfig;
}

/**
 * Результат выполнения стратегии
 */
export interface StrategyResult {
  strategyName: string;
  prompt: string;
  response: string;
  executionTimeMs: number;
}

/**
 * Интерфейс стратегии промптинга
 */
export interface PromptingStrategy {
  name: string;
  description: string;
  execute(task: string, client: OpenAIClient): Promise<StrategyResult>;
}

/**
 * Тип для OpenAI клиента (импортируется из библиотеки)
 */
export type { OpenAI } from 'openai';

/**
 * Интерфейс для OpenAI клиента
 */
export interface OpenAIClient {
  chatCompletion(prompt: string): Promise<string>;
  getModel(): string;
}
