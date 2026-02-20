/**
 * Сервис для сравнения качества ответов моделей
 */

import {
  IApiClient,
  ModelConfig,
  ModelLevel,
  ModelResponse,
  ModelComparison,
  AnonymizedResponse,
  AnonymizationMapping,
  ChatMessage,
  FinalConclusion,
  ResponseRating
} from '../types';
import { IComparisonService, IPromptProvider, ILogger } from './interfaces';
import { calculateCost } from '../metrics';
import { ModelError, ParseError } from '../domain/errors';

/**
 * Реализация сервиса для сравнения моделей
 */
export class ComparisonService implements IComparisonService {
  constructor(
    private readonly apiClient: IApiClient,
    private readonly promptProvider: IPromptProvider,
    private readonly logger: ILogger
  ) {}

  /**
   * Анонимизировать ответы для сравнения с сохранением маппинга
   */
  anonymizeResponses(responses: ModelResponse[]): {
    responses: AnonymizedResponse[];
    mapping: AnonymizationMapping[];
  } {
    this.logger.debug('Анонимизация ответов для сравнения');

    // Создаём массив индексов и перемешиваем их (алгоритм Fisher-Yates)
    const indices = responses.map((_, i) => i);

    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    // Создаём анонимизированные ответы и маппинг
    const anonymizedResponses: AnonymizedResponse[] = [];
    const mapping: AnonymizationMapping[] = [];

    for (let i = 0; i < indices.length; i++) {
      const originalIndex = indices[i];
      const originalResponse = responses[originalIndex];

      anonymizedResponses.push({
        number: i + 1,
        content: originalResponse.content
      });

      mapping.push({
        anonymizedNumber: i + 1,
        modelId: originalResponse.modelId,
        modelName: originalResponse.modelName,
        modelLevel: originalResponse.modelLevel
      });
    }

    this.logger.debug(`Создано ${anonymizedResponses.length} анонимизированных ответов`);
    return { responses: anonymizedResponses, mapping };
  }

  /**
   * Получить сравнение от модели (анонимное)
   */
  async getComparison(
    modelConfig: ModelConfig,
    modelLevel: ModelLevel,
    question: string,
    anonymizedResponses: AnonymizedResponse[]
  ): Promise<ModelComparison> {
    this.logger.debug(`Получение оценки от ${modelConfig.name} (${modelLevel})`);

    const prompt = this.promptProvider.createComparisonPrompt(question, anonymizedResponses);

    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: prompt
      }
    ];

    try {
      const { response: apiResponse } = await this.apiClient.sendRequestWithTiming(
        modelConfig.id,
        messages
      );

      const content = this.apiClient.extractContent(apiResponse);

      // Парсим оценки из ответа модели
      const parsedRatings = this.promptProvider.parseAllRatings(content);

      // Преобразуем в массив ResponseRating
      const ratings: ResponseRating[] = [];

      for (let i = 1; i <= anonymizedResponses.length; i++) {
        const parsed = parsedRatings.get(i);

        if (!parsed) {
          this.logger.warn(
            `Не удалось распарсить оценку для Ответа ${i} от модели ${modelConfig.name}`
          );
        }

        ratings.push({
          responseNumber: i,
          score: parsed?.score ?? 0,
          analysis: parsed?.analysis ?? ''
        });
      }

      this.logger.debug(`Получены оценки от ${modelConfig.name}`);

      return {
        modelId: modelConfig.id,
        modelName: modelConfig.name,
        modelLevel,
        ratings
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new ModelError(modelConfig.id, modelConfig.name, error.message);
      }
      throw error;
    }
  }

  /**
   * Получить сравнения от всех моделей
   */
  async getAllComparisons(
    models: Array<{ config: ModelConfig; level: ModelLevel }>,
    question: string,
    anonymizedResponses: AnonymizedResponse[]
  ): Promise<ModelComparison[]> {
    this.logger.info(`Получение оценок от ${models.length} моделей...`);

    const comparisons = await Promise.all(
      models.map(m =>
        this.getComparison(m.config, m.level, question, anonymizedResponses)
      )
    );

    this.logger.info(`Получены оценки от всех ${models.length} моделей`);
    return comparisons;
  }

  /**
   * Получить финальный вывод от сильной модели
   */
  async getFinalConclusion(
    strongModel: ModelConfig,
    question: string,
    responses: ModelResponse[],
    comparisons: ModelComparison[],
    mapping: AnonymizationMapping[]
  ): Promise<FinalConclusion> {
    this.logger.info('Получение итогового вывода от сильной модели...');

    const prompt = this.promptProvider.createFinalConclusionPrompt(
      question,
      responses,
      comparisons,
      mapping
    );

    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: prompt
      }
    ];

    try {
      const { response: apiResponse, responseTimeMs } = await this.apiClient.sendRequestWithTiming(
        strongModel.id,
        messages
      );

      const usage = this.apiClient.extractUsage(apiResponse);
      const content = this.apiClient.extractContent(apiResponse);
      const cost = calculateCost(usage, strongModel.pricing);

      this.logger.debug('Получен итоговый вывод от сильной модели');

      return {
        content,
        usage,
        responseTimeMs,
        cost
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new ModelError(strongModel.id, strongModel.name, error.message);
      }
      throw error;
    }
  }
}

/**
 * Создать экземпляр ComparisonService
 */
export function createComparisonService(
  apiClient: IApiClient,
  promptProvider: IPromptProvider,
  logger: ILogger
): IComparisonService {
  return new ComparisonService(apiClient, promptProvider, logger);
}
