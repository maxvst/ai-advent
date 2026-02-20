/**
 * Типы и интерфейсы для программы сравнения LLM моделей
 */

// ==================== Конфигурация ====================

export interface Pricing {
  input: number;   // Цена за 1M input токенов в USD
  output: number;  // Цена за 1M output токенов в USD
}

export interface ModelConfig {
  id: string;       // ID модели в OpenRouter
  name: string;     // Человекочитаемое название
  pricing: Pricing;
}

export interface OpenRouterConfig {
  baseUrl: string;
  apiKey: string;
}

export interface Config {
  openRouter: OpenRouterConfig;
  models: {
    strong: ModelConfig;
    medium: ModelConfig;
    weak: ModelConfig;
  };
  question: string;
  outputDir: string;
}

// ==================== Ответы моделей ====================

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface ModelResponse {
  modelId: string;
  modelName: string;
  modelLevel: ModelLevel;
  content: string;
  usage: TokenUsage;
  responseTimeMs: number;
  cost: number;
}

// ==================== Сравнение ====================

export interface ComparisonRating {
  score: number;      // Оценка от 1 до 10
  analysis: string;   // Текстовый анализ
}

/**
 * Оценка одного ответа от модели-оценщика
 */
export interface ResponseRating {
  responseNumber: number;  // Номер анонимного ответа (1, 2, 3)
  score: number;           // Оценка от 1 до 10
  analysis: string;        // Анализ ответа
}

/**
 * Результат сравнения от одной модели-оценщика
 * Содержит оценки всех трёх ответов
 */
export interface ModelComparison {
  modelId: string;
  modelName: string;
  modelLevel: ModelLevel;
  ratings: ResponseRating[];  // Оценки для всех трёх ответов
}

/**
 * Маппинг между анонимными номерами и реальными моделями
 */
export interface AnonymizationMapping {
  anonymizedNumber: number;  // Номер в анонимизированном списке (1, 2, 3)
  modelId: string;           // ID реальной модели
  modelName: string;         // Имя реальной модели
  modelLevel: ModelLevel;    // Уровень модели
}

/**
 * Результат анонимизации с маппингом
 */
export interface AnonymizationResult {
  responses: AnonymizedResponse[];  // Анонимизированные ответы
  mapping: AnonymizationMapping[];  // Маппинг для восстановления
}

// ==================== Итоговый отчёт ====================

export interface FinalConclusion {
  content: string;
  usage: TokenUsage;
  responseTimeMs: number;
  cost: number;
}

export interface Report {
  timestamp: string;
  question: string;
  responses: ModelResponse[];
  comparisons: ModelComparison[];
  finalConclusion: FinalConclusion;
  summary: {
    totalCost: number;
    totalTimeMs: number;
    totalInputTokens: number;
    totalOutputTokens: number;
  };
}

// ==================== API ====================

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// ==================== Утилиты ====================

export type ModelLevel = 'strong' | 'medium' | 'weak';

export interface AnonymizedResponse {
  number: number;
  content: string;
}
