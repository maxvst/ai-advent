/**
 * Точка входа: Сравнение LLM моделей
 * 
 * Программа:
 * 1. Отправляет один и тот же запрос трём моделям разного уровня
 * 2. Замеряет время, токены, стоимость
 * 3. Просит модели оценить ответы анонимно
 * 4. Сильная модель делает итоговый вывод
 * 5. Сохраняет результаты в Markdown
 */

import { Config, ModelResponse, ModelComparison, ModelConfig, AnonymizationResult, IApiClient } from './types';
import { loadConfig, getModelsList } from './config';
import { ApiClient, createApiClient } from './api';
import { getModelResponse, anonymizeResponses, getModelComparison, getFinalConclusion } from './compare';
import { createReport, saveReport, printReport } from './report';
import { 
  printModelResponse, 
  printComparison, 
  printFinalConclusion,
  info, 
  success, 
  error, 
  stage 
} from './output';

/**
 * Обработать одну модель - получить и вывести ответ
 */
async function processModel(
  apiClient: IApiClient,
  modelConfig: ModelConfig,
  level: 'strong' | 'medium' | 'weak',
  question: string
): Promise<ModelResponse> {
  info(`Отправка запроса ${level} модели (${modelConfig.name})...`);
  
  const response = await getModelResponse(apiClient, modelConfig, level, question);
  
  printModelResponse(response);
  
  return response;
}

/**
 * Получить сравнения от всех моделей
 */
async function processComparisons(
  apiClient: IApiClient,
  config: Config,
  responses: ModelResponse[],
  anonymizationResult: AnonymizationResult
): Promise<ModelComparison[]> {
  const comparisons: ModelComparison[] = [];
  const models = getModelsList(config);
  
  for (const model of models) {
    info(`Получение оценки от ${model.config.name}...`);
    
    const comparison = await getModelComparison(
      apiClient,
      model.config,
      model.level,
      config.question,
      anonymizationResult.responses
    );
    
    printComparison(comparison, anonymizationResult.mapping);
    
    comparisons.push(comparison);
  }
  
  return comparisons;
}

/**
 * Главная функция
 */
async function main(): Promise<void> {
  console.log('🚀 Запуск сравнения LLM моделей...\n');
  
  try {
    // 1. Загружаем конфигурацию
    stage('📁', 'Загрузка конфигурации...');
    const config = loadConfig();
    
    // 2. Инициализируем API клиент
    stage('🔌', 'Инициализация API клиента...');
    const apiClient = createApiClient(config);
    
    // 3. Получаем ответы от всех моделей
    stage('📝', 'Отправка вопроса моделям...');
    console.log(`   Вопрос: ${config.question}\n`);
    
    const responses: ModelResponse[] = [];
    const models = getModelsList(config);
    
    for (const model of models) {
      const response = await processModel(
        apiClient,
        model.config,
        model.level,
        config.question
      );
      responses.push(response);
    }
    
    // 4. Анонимизируем ответы
    stage('🔒', 'Анонимизация ответов...');
    const anonymizationResult = anonymizeResponses(responses);
    
    // 5. Получаем сравнение от каждой модели
    stage('📊', 'Получение оценок качества...');
    const comparisons = await processComparisons(apiClient, config, responses, anonymizationResult);
    
    // 6. Получаем итоговый вывод от сильной модели
    stage('🏆', 'Получение итогового вывода от сильной модели...');
    const finalConclusion = await getFinalConclusion(
      apiClient,
      config.models.strong,
      config.question,
      responses,
      comparisons,
      anonymizationResult.mapping
    );
    
    printFinalConclusion(finalConclusion);
    
    // 7. Создаём отчёт
    stage('📄', 'Генерация отчёта...');
    const report = createReport(config.question, responses, comparisons, finalConclusion);
    
    // 8. Выводим итоговую статистику
    printReport(report);
    
    // 9. Сохраняем в файл
    const savedPath = await saveReport(report, config.outputDir, anonymizationResult.mapping);
    success(`Отчёт сохранён: ${savedPath}`);
    
    console.log('\n✨ Сравнение завершено успешно!\n');
    
  } catch (err) {
    error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

// Запуск
main();
