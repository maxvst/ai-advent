/**
 * Модуль для генерации Markdown отчёта
 */

import * as fs from 'fs';
import * as path from 'path';
import { Report, ModelResponse, ModelComparison } from './types';
import { formatCost, formatTime, formatTokens, calculateSummary } from './metrics';

/**
 * Сгенерировать Markdown отчёт
 */
export function generateMarkdownReport(report: Report): string {
  const lines: string[] = [];
  
  // Заголовок
  lines.push('# Сравнение LLM моделей');
  lines.push('');
  lines.push(`**Дата:** ${report.timestamp}`);
  lines.push('');
  
  // Вопрос
  lines.push('## Вопрос');
  lines.push('');
  lines.push(report.question);
  lines.push('');
  
  // Метрики
  lines.push('## Метрики ответов');
  lines.push('');
  lines.push(createMetricsTable(report.responses));
  lines.push('');
  
  // Ответы моделей
  lines.push('## Ответы моделей');
  lines.push('');
  
  for (let i = 0; i < report.responses.length; i++) {
    const response = report.responses[i];
    lines.push(`### ${response.modelName} (${response.modelLevel})`);
    lines.push('');
    lines.push(`- **Время:** ${formatTime(response.responseTimeMs)}`);
    lines.push(`- **Токены:** ${formatTokens(response.usage.inputTokens)} input, ${formatTokens(response.usage.outputTokens)} output`);
    lines.push(`- **Стоимость:** ${formatCost(response.cost)}`);
    lines.push('');
    lines.push('**Ответ:**');
    lines.push('');
    lines.push(response.content);
    lines.push('');
    lines.push('---');
    lines.push('');
  }
  
  // Сравнение качества
  lines.push('## Оценки качества');
  lines.push('');
  lines.push('Модели оценивали ответы анонимно (без знания автора).');
  lines.push('');
  
  for (const comparison of report.comparisons) {
    lines.push(`### Оценка от ${comparison.modelName}`);
    lines.push('');
    lines.push(`**Оценка:** ${comparison.rating.score}/10`);
    lines.push('');
    lines.push('**Анализ:**');
    lines.push('');
    lines.push(comparison.rating.analysis);
    lines.push('');
  }
  
  // Итоговый вывод
  lines.push('## Итоговый вывод');
  lines.push('');
  lines.push('Сильная модель проанализировала все данные и сделала вывод:');
  lines.push('');
  lines.push(report.finalConclusion.content);
  lines.push('');
  
  // Итоговая статистика
  lines.push('## Итоговая статистика');
  lines.push('');
  lines.push(`- **Общая стоимость:** ${formatCost(report.summary.totalCost)}`);
  lines.push(`- **Общее время:** ${formatTime(report.summary.totalTimeMs)}`);
  lines.push(`- **Всего токенов:** ${formatTokens(report.summary.totalInputTokens)} input, ${formatTokens(report.summary.totalOutputTokens)} output`);
  lines.push('');
  
  return lines.join('\n');
}

/**
 * Создать таблицу метрик
 */
function createMetricsTable(responses: ModelResponse[]): string {
  const lines: string[] = [];
  
  lines.push('| Модель | Уровень | Время | Input | Output | Стоимость |');
  lines.push('|--------|---------|-------|-------|--------|-----------|');
  
  for (const response of responses) {
    lines.push(
      `| ${response.modelName} | ${response.modelLevel} | ${formatTime(response.responseTimeMs)} | ` +
      `${formatTokens(response.usage.inputTokens)} | ` +
      `${formatTokens(response.usage.outputTokens)} | ` +
      `${formatCost(response.cost)} |`
    );
  }
  
  return lines.join('\n');
}

/**
 * Сохранить отчёт в файл
 */
export async function saveReport(report: Report, outputDir: string): Promise<string> {
  // Создаём директорию, если не существует
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Генерируем имя файла с timestamp
  const timestamp = report.timestamp.replace(/[:.]/g, '-');
  const filename = `comparison-${timestamp}.md`;
  const filepath = path.join(outputDir, filename);
  
  // Генерируем и сохраняем отчёт
  const markdown = generateMarkdownReport(report);
  fs.writeFileSync(filepath, markdown, 'utf-8');
  
  return filepath;
}

/**
 * Вывести отчёт в консоль
 */
export function printReport(report: Report): void {
  console.log('\n' + '='.repeat(80));
  console.log('                    СРАВНЕНИЕ LLM МОДЕЛЕЙ');
  console.log('='.repeat(80));
  console.log(`\n📅 Дата: ${report.timestamp}`);
  console.log(`\n❓ Вопрос: ${report.question}`);
  
  console.log('\n' + '-'.repeat(80));
  console.log('📊 МЕТРИКИ ОТВЕТОВ');
  console.log('-'.repeat(80));
  
  for (const response of report.responses) {
    console.log(`\n🔹 ${response.modelName} (${response.modelLevel})`);
    console.log(`   ⏱️  Время: ${formatTime(response.responseTimeMs)}`);
    console.log(`   📊 Токены: ${formatTokens(response.usage.inputTokens)} input, ${formatTokens(response.usage.outputTokens)} output`);
    console.log(`   💰 Стоимость: ${formatCost(response.cost)}`);
  }
  
  console.log('\n' + '-'.repeat(80));
  console.log('📝 ОТВЕТЫ МОДЕЛЕЙ');
  console.log('-'.repeat(80));
  
  for (const response of report.responses) {
    console.log(`\n${'─'.repeat(40)}`);
    console.log(`📌 ${response.modelName}:`);
    console.log(`${'─'.repeat(40)}`);
    console.log(response.content);
  }
  
  console.log('\n' + '-'.repeat(80));
  console.log('⭐ ОЦЕНКИ КАЧЕСТВА');
  console.log('-'.repeat(80));
  
  for (const comparison of report.comparisons) {
    console.log(`\n🔹 Оценка от ${comparison.modelName}: ${comparison.rating.score}/10`);
    console.log(`   ${comparison.rating.analysis}`);
  }
  
  console.log('\n' + '-'.repeat(80));
  console.log('🏆 ИТОГОВЫЙ ВЫВОД (от сильной модели)');
  console.log('-'.repeat(80));
  console.log('\n' + report.finalConclusion.content);
  
  console.log('\n' + '='.repeat(80));
  console.log('📈 ИТОГОВАЯ СТАТИСТИКА');
  console.log('='.repeat(80));
  console.log(`   💰 Общая стоимость: ${formatCost(report.summary.totalCost)}`);
  console.log(`   ⏱️  Общее время: ${formatTime(report.summary.totalTimeMs)}`);
  console.log(`   📊 Всего токенов: ${formatTokens(report.summary.totalInputTokens)} input, ${formatTokens(report.summary.totalOutputTokens)} output`);
  console.log('='.repeat(80) + '\n');
}

/**
 * Создать объект отчёта
 */
export function createReport(
  question: string,
  responses: ModelResponse[],
  comparisons: ModelComparison[],
  finalConclusion: import('./types').FinalConclusion
): Report {
  const report: Report = {
    timestamp: new Date().toISOString(),
    question,
    responses,
    comparisons,
    finalConclusion,
    summary: {
      totalCost: 0,
      totalTimeMs: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0
    }
  };
  
  report.summary = calculateSummary(report);
  
  return report;
}
