/**
 * DI контейнер для сервисов
 * 
 * Обеспечивает централизованное управление зависимостями
 * и упрощает тестирование через инъекцию зависимостей.
 */

import { Config, IApiClient } from './types';
import { IModelService, IComparisonService, IReportService, ILogger } from './services/interfaces';
import { createModelService } from './services/ModelService';
import { createComparisonService } from './services/ComparisonService';
import { createReportService } from './services/ReportService';
import { createLogger, Logger, LoggerOptions } from './logger';
import { createApiClient } from './api';
import { PromptProvider } from './prompts/PromptProvider';

/**
 * Интерфейс контейнера зависимостей
 */
export interface IContainer {
  readonly apiClient: IApiClient;
  readonly modelService: IModelService;
  readonly comparisonService: IComparisonService;
  readonly reportService: IReportService;
  readonly logger: ILogger;
  readonly promptProvider: PromptProvider;
}

/**
 * Опции для создания контейнера
 */
export interface ContainerOptions {
  loggerOptions?: LoggerOptions;
  customApiClient?: IApiClient;
  customLogger?: ILogger;
}

/**
 * Создать DI контейнер с зависимостями
 */
export function createContainer(config: Config, options?: ContainerOptions): IContainer {
  // Создаём логгер (используем кастомный или создаём новый)
  const logger = options?.customLogger ?? createLogger(options?.loggerOptions);

  // Создаём API клиент (используем кастомный или создаём новый)
  const apiClient = options?.customApiClient ?? createApiClient(config);

  // Создаём провайдер промптов
  const promptProvider = new PromptProvider();

  // Создаём сервисы с инъекцией зависимостей
  const modelService = createModelService(apiClient, logger);
  const comparisonService = createComparisonService(apiClient, promptProvider, logger);
  const reportService = createReportService(logger);

  return {
    apiClient,
    modelService,
    comparisonService,
    reportService,
    logger,
    promptProvider
  };
}

/**
 * Создать контейнер для тестов с моками
 */
export function createTestContainer(mocks: {
  apiClient?: IApiClient;
  logger?: ILogger;
  modelService?: IModelService;
  comparisonService?: IComparisonService;
  reportService?: IReportService;
}): Partial<IContainer> {
  const logger = mocks.logger ?? createMockLogger();
  const apiClient = mocks.apiClient ?? createMockApiClient();
  const promptProvider = new PromptProvider();

  return {
    apiClient,
    logger,
    promptProvider,
    modelService: mocks.modelService ?? createModelService(apiClient, logger),
    comparisonService: mocks.comparisonService ?? createComparisonService(apiClient, promptProvider, logger),
    reportService: mocks.reportService ?? createReportService(logger)
  };
}

/**
 * Создать мок логгера для тестов
 */
function createMockLogger(): ILogger {
  return {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {}
  };
}

/**
 * Создать мок API клиента для тестов
 */
function createMockApiClient(): IApiClient {
  return {
    sendRequest: async () => ({}),
    sendRequestWithTiming: async () => ({ response: {}, responseTimeMs: 0 }),
    extractContent: () => '',
    extractUsage: () => ({ inputTokens: 0, outputTokens: 0 })
  };
}
