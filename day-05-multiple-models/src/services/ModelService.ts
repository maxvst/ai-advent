/**
 * Сервис для работы с LLM моделями
 */

import { IApiClient, ModelConfig, ModelLevel, ModelResponse, ChatMessage } from '../types';
import { IModelService, ILogger } from './interfaces';
import { calculateCost } from '../metrics';
import { ModelError, ApiError } from '../domain/errors';

/**
 * Реализация сервиса для работы с моделями
 */
export class ModelService implements IModelService {
  constructor(
    private readonly apiClient: IApiClient,
    private readonly logger: ILogger
  ) {}

  /**
   * Получить ответ от одной модели
   */
  async getResponse(
    modelConfig: ModelConfig,
    modelLevel: ModelLevel,
    question: string
  ): Promise<ModelResponse> {
    this.logger.debug(`Отправка запроса к модели ${modelConfig.name} (${modelLevel})`);

    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: question
      }
    ];

    try {
      const { response: apiResponse, responseTimeMs } = await this.apiClient.sendRequestWithTiming(
        modelConfig.id,
        messages
      );

      const usage = this.apiClient.extractUsage(apiResponse);
      const content = this.apiClient.extractContent(apiResponse);
      const cost = calculateCost(usage, modelConfig.pricing);

      this.logger.debug(
        `Получен ответ от ${modelConfig.name}: ${usage.inputTokens} input, ${usage.outputTokens} output токенов`
      );

      return {
        modelId: modelConfig.id,
        modelName: modelConfig.name,
        modelLevel,
        content,
        usage,
        responseTimeMs,
        cost
      };
    } catch (error) {
      // Оборачиваем ошибку в ModelError для контекста
      if (error instanceof Error) {
        throw new ModelError(
          modelConfig.id,
          modelConfig.name,
          error.message
        );
      }
      throw error;
    }
  }

  /**
   * Получить ответы от всех моделей параллельно
   */
  async getAllResponses(
    models: Array<{ config: ModelConfig; level: ModelLevel }>,
    question: string
  ): Promise<ModelResponse[]> {
    this.logger.info(`Отправка запросов к ${models.length} моделям параллельно...`);

    const responses = await Promise.all(
      models.map(m => this.getResponse(m.config, m.level, question))
    );

    this.logger.info(`Получены ответы от всех ${models.length} моделей`);
    return responses;
  }

  /**
   * Получить ответы с обработкой ошибок (graceful degradation)
   */
  async getAllResponsesSafe(
    models: Array<{ config: ModelConfig; level: ModelLevel }>,
    question: string
  ): Promise<{
    successful: ModelResponse[];
    failed: Array<{ model: ModelConfig; level: ModelLevel; error: Error }>;
  }> {
    this.logger.info(`Отправка запросов к ${models.length} моделям (с обработкой ошибок)...`);

    const results = await Promise.allSettled(
      models.map(m => this.getResponse(m.config, m.level, question))
    );

    const successful: ModelResponse[] = [];
    const failed: Array<{ model: ModelConfig; level: ModelLevel; error: Error }> = [];

    results.forEach((result, index) => {
      const model = models[index];

      if (result.status === 'fulfilled') {
        successful.push(result.value);
        this.logger.debug(`Модель ${model.config.name} успешно ответила`);
      } else {
        const error = result.reason instanceof Error ? result.reason : new Error(String(result.reason));
        failed.push({
          model: model.config,
          level: model.level,
          error
        });
        this.logger.warn(`Модель ${model.config.name} не ответила: ${error.message}`);
      }
    });

    this.logger.info(
      `Получено ${successful.length} успешных ответов, ${failed.length} ошибок`
    );

    return { successful, failed };
  }
}

/**
 * Создать экземпляр ModelService
 */
export function createModelService(apiClient: IApiClient, logger: ILogger): IModelService {
  return new ModelService(apiClient, logger);
}
