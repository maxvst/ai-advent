/**
 * Интерфейсы сервисов для dependency injection
 */

import {
  ModelConfig,
  ModelLevel,
  ModelResponse,
  ModelComparison,
  AnonymizedResponse,
  AnonymizationMapping,
  FinalConclusion,
  Report,
  IApiClient
} from '../types';

/**
 * Интерфейс для провайдера промптов
 */
export interface IPromptProvider {
  /**
   * Создать промпт для сравнения ответов
   */
  createComparisonPrompt(question: string, responses: AnonymizedResponse[]): string;

  /**
   * Создать промпт для итогового вывода
   */
  createFinalConclusionPrompt(
    question: string,
    responses: ModelResponse[],
    comparisons: ModelComparison[],
    mapping: AnonymizationMapping[]
  ): string;

  /**
   * Распарсить оценки из ответа модели
   */
  parseAllRatings(content: string): Map<number, { score: number; analysis: string }>;
}

/**
 * Интерфейс для сервиса работы с моделями
 */
export interface IModelService {
  /**
   * Получить ответ от одной модели
   */
  getResponse(
    modelConfig: ModelConfig,
    modelLevel: ModelLevel,
    question: string
  ): Promise<ModelResponse>;

  /**
   * Получить ответы от всех моделей параллельно
   */
  getAllResponses(
    models: Array<{ config: ModelConfig; level: ModelLevel }>,
    question: string
  ): Promise<ModelResponse[]>;

  /**
   * Получить ответы с обработкой ошибок (graceful degradation)
   */
  getAllResponsesSafe(
    models: Array<{ config: ModelConfig; level: ModelLevel }>,
    question: string
  ): Promise<{
    successful: ModelResponse[];
    failed: Array<{ model: ModelConfig; level: ModelLevel; error: Error }>;
  }>;
}

/**
 * Интерфейс для сервиса сравнения
 */
export interface IComparisonService {
  /**
   * Анонимизировать ответы
   */
  anonymizeResponses(responses: ModelResponse[]): {
    responses: AnonymizedResponse[];
    mapping: AnonymizationMapping[];
  };

  /**
   * Получить сравнение от модели
   */
  getComparison(
    modelConfig: ModelConfig,
    modelLevel: ModelLevel,
    question: string,
    anonymizedResponses: AnonymizedResponse[]
  ): Promise<ModelComparison>;

  /**
   * Получить сравнения от всех моделей
   */
  getAllComparisons(
    models: Array<{ config: ModelConfig; level: ModelLevel }>,
    question: string,
    anonymizedResponses: AnonymizedResponse[]
  ): Promise<ModelComparison[]>;

  /**
   * Получить итоговый вывод от сильной модели
   */
  getFinalConclusion(
    strongModel: ModelConfig,
    question: string,
    responses: ModelResponse[],
    comparisons: ModelComparison[],
    mapping: AnonymizationMapping[]
  ): Promise<FinalConclusion>;
}

/**
 * Интерфейс для генератора отчётов
 */
export interface IReportGenerator {
  /**
   * Сгенерировать содержимое отчёта
   */
  generate(report: Report, mapping?: AnonymizationMapping[]): string;

  /**
   * Получить расширение файла
   */
  getFileExtension(): string;
}

/**
 * Интерфейс для сервиса отчётов
 */
export interface IReportService {
  /**
   * Создать объект отчёта
   */
  createReport(
    question: string,
    responses: ModelResponse[],
    comparisons: ModelComparison[],
    finalConclusion: FinalConclusion
  ): Report;

  /**
   * Сохранить отчёт в файл
   */
  saveReport(
    report: Report,
    outputDir: string,
    mapping?: AnonymizationMapping[]
  ): Promise<string>;

  /**
   * Вывести отчёт в консоль
   */
  printReport(report: Report): void;
}

/**
 * Интерфейс для логгера
 */
export interface ILogger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * Интерфейс для загрузчика конфигурации
 */
export interface IConfigLoader {
  load(configPath?: string): import('../types').Config;
  validate(config: unknown): config is import('../types').Config;
}

/**
 * Зависимости для оркестратора
 */
export interface OrchestratorDeps {
  apiClient: IApiClient;
  modelService: IModelService;
  comparisonService: IComparisonService;
  reportService: IReportService;
  logger: ILogger;
}
