/**
 * Оркестратор процесса сравнения LLM моделей
 * 
 * Координирует все этапы сравнения:
 * 1. Получение ответов от моделей
 * 2. Анонимизация ответов
 * 3. Получение оценок от моделей
 * 4. Итоговый анализ
 * 5. Генерация отчёта
 */

import { Config, IApiClient } from './types';
import { IModelService, IComparisonService, IReportService, ILogger } from './services/interfaces';
import { createContainer, IContainer, ContainerOptions } from './container';
import { 
  printModelResponse, 
  printComparison, 
  printFinalConclusion,
  info, 
  success, 
  stage 
} from './output';
import { getModelsList } from './config/index';

/**
 * Результат сравнения моделей
 */
export interface ComparisonResult {
  success: boolean;
  reportPath?: string;
  error?: Error;
  partialResults?: {
    responsesCount: number;
    comparisonsCount: number;
  };
}

/**
 * Оркестратор процесса сравнения
 * 
 * Использует DI контейнер для получения сервисов,
 * что упрощает тестирование и обеспечивает гибкость.
 */
export class Orchestrator {
  private readonly modelService: IModelService;
  private readonly comparisonService: IComparisonService;
  private readonly reportService: IReportService;
  private readonly logger: ILogger;

  /**
   * Создать оркестратор с DI контейнером
   */
  static create(config: Config, options?: ContainerOptions): Orchestrator {
    const container = createContainer(config, options);
    return new Orchestrator(config, container);
  }

  /**
   * Создать оркестратор с готовым контейнером
   */
  constructor(
    private readonly config: Config,
    private readonly container: IContainer
  ) {
    this.modelService = container.modelService;
    this.comparisonService = container.comparisonService;
    this.reportService = container.reportService;
    this.logger = container.logger;
  }

  /**
   * Запустить процесс сравнения
   */
  async run(): Promise<ComparisonResult> {
    this.logger.info('Запуск сравнения LLM моделей');

    try {
      // 1. Получаем ответы от всех моделей
      stage('📝', 'Отправка вопроса моделям...');
      console.log(`   Вопрос: ${this.config.question}\n`);

      const models = getModelsList(this.config);
      const responses = await this.modelService.getAllResponses(
        models,
        this.config.question
      );

      // Выводим ответы по мере получения
      for (const response of responses) {
        printModelResponse(response);
      }

      // 2. Анонимизируем ответы
      stage('🔒', 'Анонимизация ответов...');
      const anonymizationResult = this.comparisonService.anonymizeResponses(responses);

      // 3. Получаем сравнение от каждой модели
      stage('📊', 'Получение оценок качества...');
      const comparisons = await this.comparisonService.getAllComparisons(
        models,
        this.config.question,
        anonymizationResult.responses
      );

      // Выводим оценки
      for (const comparison of comparisons) {
        printComparison(comparison, anonymizationResult.mapping);
      }

      // 4. Получаем итоговый вывод от сильной модели
      stage('🏆', 'Получение итогового вывода от сильной модели...');
      const finalConclusion = await this.comparisonService.getFinalConclusion(
        this.config.models.strong,
        this.config.question,
        responses,
        comparisons,
        anonymizationResult.mapping
      );

      printFinalConclusion(finalConclusion);

      // 5. Создаём отчёт
      stage('📄', 'Генерация отчёта...');
      const report = this.reportService.createReport(
        this.config.question,
        responses,
        comparisons,
        finalConclusion
      );

      // 6. Выводим итоговую статистику
      this.reportService.printReport(report);

      // 7. Сохраняем в файл
      const savedPath = await this.reportService.saveReport(
        report,
        this.config.outputDir,
        anonymizationResult.mapping
      );
      success(`Отчёт сохранён: ${savedPath}`);

      console.log('\n✨ Сравнение завершено успешно!\n');

      return {
        success: true,
        reportPath: savedPath
      };

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Ошибка при сравнении: ${err.message}`);

      return {
        success: false,
        error: err
      };
    }
  }

  /**
   * Запустить процесс сравнения с обработкой ошибок (graceful degradation)
   */
  async runSafe(): Promise<ComparisonResult> {
    this.logger.info('Запуск сравнения LLM моделей (безопасный режим)');

    try {
      // 1. Получаем ответы от всех моделей с обработкой ошибок
      stage('📝', 'Отправка вопроса моделям...');
      console.log(`   Вопрос: ${this.config.question}\n`);

      const models = getModelsList(this.config);
      const { successful: responses, failed } = await this.modelService.getAllResponsesSafe(
        models,
        this.config.question
      );

      // Логируем неудачные запросы
      if (failed.length > 0) {
        console.warn(`\n⚠️  ${failed.length} модель(и) не ответили:`);
        failed.forEach(f => {
          console.warn(`   - ${f.model.name}: ${f.error.message}`);
        });
        console.log('');
      }

      // Проверяем, что есть хотя бы один ответ
      if (responses.length === 0) {
        throw new Error('Ни одна модель не ответила на запрос');
      }

      // Выводим успешные ответы
      for (const response of responses) {
        printModelResponse(response);
      }

      // 2. Анонимизируем ответы
      stage('🔒', 'Анонимизация ответов...');
      const anonymizationResult = this.comparisonService.anonymizeResponses(responses);

      // 3. Получаем сравнение от каждой модели
      stage('📊', 'Получение оценок качества...');
      
      // Фильтруем модели, которые успешно ответили
      const successfulModels = models.filter(m =>
        responses.some(r => r.modelId === m.config.id)
      );

      const comparisons = await this.comparisonService.getAllComparisons(
        successfulModels,
        this.config.question,
        anonymizationResult.responses
      );

      // Выводим оценки
      for (const comparison of comparisons) {
        printComparison(comparison, anonymizationResult.mapping);
      }

      // 4. Получаем итоговый вывод от сильной модели
      stage('🏆', 'Получение итогового вывода от сильной модели...');
      
      // Используем сильную модель если она ответила, иначе первую доступную
      const strongModel = this.config.models.strong;
      const availableStrongModel = responses.some(r => r.modelId === strongModel.id)
        ? strongModel
        : successfulModels[0].config;

      const finalConclusion = await this.comparisonService.getFinalConclusion(
        availableStrongModel,
        this.config.question,
        responses,
        comparisons,
        anonymizationResult.mapping
      );

      printFinalConclusion(finalConclusion);

      // 5. Создаём отчёт
      stage('📄', 'Генерация отчёта...');
      const report = this.reportService.createReport(
        this.config.question,
        responses,
        comparisons,
        finalConclusion
      );

      // 6. Выводим итоговую статистику
      this.reportService.printReport(report);

      // 7. Сохраняем в файл
      const savedPath = await this.reportService.saveReport(
        report,
        this.config.outputDir,
        anonymizationResult.mapping
      );
      success(`Отчёт сохранён: ${savedPath}`);

      console.log('\n✨ Сравнение завершено успешно!\n');

      return {
        success: true,
        reportPath: savedPath,
        partialResults: {
          responsesCount: responses.length,
          comparisonsCount: comparisons.length
        }
      };

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Ошибка при сравнении: ${err.message}`);

      return {
        success: false,
        error: err
      };
    }
  }
}

/**
 * Запустить сравнение моделей
 */
export async function runComparison(config: Config): Promise<ComparisonResult> {
  const orchestrator = Orchestrator.create(config);
  return orchestrator.run();
}

/**
 * Запустить сравнение моделей в безопасном режиме
 */
export async function runComparisonSafe(config: Config): Promise<ComparisonResult> {
  const orchestrator = Orchestrator.create(config);
  return orchestrator.runSafe();
}
