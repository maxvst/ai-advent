/**
 * Модуль для вывода в консоль
 */

import { ModelResponse, ModelComparison, FinalConclusion, Report, AnonymizationMapping, TokenUsage } from './types';
import { formatCost, formatTime, formatTokens } from './metrics';

const SEPARATOR = '═'.repeat(60);
const SUB_SEPARATOR = '─'.repeat(60);

/**
 * Форматировать метрики модели для вывода
 */
export function formatModelMetrics(usage: TokenUsage, responseTimeMs: number, cost: number): string[] {
  return [
    `   ⏱️  Время: ${formatTime(responseTimeMs)}`,
    `   📊 Токены: ${formatTokens(usage.inputTokens)} input, ${formatTokens(usage.outputTokens)} output`,
    `   💰 Стоимость: ${formatCost(cost)}`
  ];
}

/**
 * Вывести метрики модели в консоль
 */
export function printModelMetrics(usage: TokenUsage, responseTimeMs: number, cost: number): void {
  const lines = formatModelMetrics(usage, responseTimeMs, cost);
  lines.forEach(line => console.log(line));
}

/**
 * Вывести заголовок
 */
export function printHeader(title: string): void {
  console.log(`\n${SEPARATOR}`);
  console.log(`📌 ${title}`);
  console.log(SUB_SEPARATOR);
}

/**
 * Вывести ответ модели
 */
export function printModelResponse(response: ModelResponse): void {
  printHeader(`ОТВЕТ ${response.modelLevel.toUpperCase()} МОДЕЛИ: ${response.modelName}`);
  printModelMetrics(response.usage, response.responseTimeMs, response.cost);
  console.log(SUB_SEPARATOR);
  console.log(response.content);
  console.log(`${SEPARATOR}\n`);
}

/**
 * Вывести оценку от модели
 */
export function printComparison(comparison: ModelComparison, mapping: AnonymizationMapping[]): void {
  printHeader(`ОЦЕНКА ОТ МОДЕЛИ: ${comparison.modelName}`);
  
  // Выводим оценки для каждого ответа с указанием реальной модели
  for (const rating of comparison.ratings) {
    const modelInfo = mapping.find(m => m.anonymizedNumber === rating.responseNumber);
    const modelLabel = modelInfo ? `${modelInfo.modelName} (${modelInfo.modelLevel})` : `Ответ ${rating.responseNumber}`;
    
    console.log(`\n📌 Ответ ${rating.responseNumber} (${modelLabel}):`);
    console.log(`   Оценка: ${rating.score}/10`);
    console.log(`   Анализ: ${rating.analysis.substring(0, 200)}${rating.analysis.length > 200 ? '...' : ''}`);
  }
  
  console.log(`\n${SEPARATOR}\n`);
}

/**
 * Вывести итоговый вывод
 */
export function printFinalConclusion(conclusion: FinalConclusion): void {
  printHeader('ИТОГОВЫЙ ВЫВОД (от сильной модели)');
  console.log(conclusion.content);
  console.log(`${SEPARATOR}\n`);
}

/**
 * Вывести итоговую статистику
 */
export function printSummary(report: Report): void {
  console.log('\n' + '═'.repeat(80));
  console.log('                    📈 ИТОГОВАЯ СТАТИСТИКА');
  console.log('═'.repeat(80));
  console.log(`\n📅 Дата: ${report.timestamp}`);
  console.log(`\n❓ Вопрос: ${report.question}`);
  
  console.log('\n' + SUB_SEPARATOR);
  console.log('📊 МЕТРИКИ ОТВЕТОВ');
  console.log(SUB_SEPARATOR);
  
  for (const response of report.responses) {
    console.log(`\n🔹 ${response.modelName} (${response.modelLevel})`);
    printModelMetrics(response.usage, response.responseTimeMs, response.cost);
  }
  
  console.log('\n' + SEPARATOR);
  console.log(`   💰 Общая стоимость: ${formatCost(report.summary.totalCost)}`);
  console.log(`   ⏱️  Общее время: ${formatTime(report.summary.totalTimeMs)}`);
  console.log(`   📊 Всего токенов: ${formatTokens(report.summary.totalInputTokens)} input, ${formatTokens(report.summary.totalOutputTokens)} output`);
  console.log(SEPARATOR + '\n');
}

/**
 * Вывести информационное сообщение
 */
export function info(message: string): void {
  console.log(`🔹 ${message}`);
}

/**
 * Вывести сообщение об успехе
 */
export function success(message: string): void {
  console.log(`✅ ${message}`);
}

/**
 * Вывести сообщение об ошибке
 */
export function error(message: string): void {
  console.error(`❌ ${message}`);
}

/**
 * Вывести заголовок этапа
 */
export function stage(emoji: string, message: string): void {
  console.log(`\n${emoji} ${message}`);
}
