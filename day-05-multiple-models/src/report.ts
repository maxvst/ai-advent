/**
 * Модуль для генерации Markdown отчёта
 */

import * as fs from 'fs';
import * as path from 'path';
import { Report, ModelResponse, ModelComparison, AnonymizationMapping, FinalConclusion } from './types';
import { formatCost, formatTime, formatTokens, calculateSummary } from './metrics';

/**
 * Сгенерировать Markdown отчёт
 */
export function generateMarkdownReport(report: Report, mapping?: AnonymizationMapping[]): string {
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
  
  // Группируем оценки по ответам
  if (mapping && mapping.length > 0) {
    for (const mapInfo of mapping) {
      lines.push(`### Ответ ${mapInfo.anonymizedNumber} (${mapInfo.modelName} - ${mapInfo.modelLevel})`);
      lines.push('');
      
      // Собираем оценки от всех моделей для этого ответа
      const scores: string[] = [];
      let totalScore = 0;
      let count = 0;
      
      for (const comparison of report.comparisons) {
        const rating = comparison.ratings.find(r => r.responseNumber === mapInfo.anonymizedNumber);
        if (rating) {
          scores.push(`- **${comparison.modelName}:** ${rating.score}/10`);
          totalScore += rating.score;
          count++;
        }
      }
      
      if (count > 0) {
        lines.push(`**Средняя оценка:** ${(totalScore / count).toFixed(1)}/10`);
        lines.push('');
        lines.push('**Оценки от моделей:**');
        lines.push('');
        lines.push(scores.join('\n'));
        lines.push('');
      }
      
      lines.push('**Детальные анализы:**');
      lines.push('');
      
      for (const comparison of report.comparisons) {
        const rating = comparison.ratings.find(r => r.responseNumber === mapInfo.anonymizedNumber);
        if (rating) {
          lines.push(`#### От ${comparison.modelName}`);
          lines.push('');
          lines.push(rating.analysis);
          lines.push('');
        }
      }
      
      lines.push('---');
      lines.push('');
    }
  } else {
    // Fallback - старый формат без маппинга
    for (const comparison of report.comparisons) {
      lines.push(`### Оценка от ${comparison.modelName}`);
      lines.push('');
      for (const rating of comparison.ratings) {
        lines.push(`**Ответ ${rating.responseNumber}:** ${rating.score}/10`);
        lines.push('');
        lines.push(rating.analysis);
        lines.push('');
      }
    }
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
export async function saveReport(report: Report, outputDir: string, mapping?: AnonymizationMapping[]): Promise<string> {
  // Создаём директорию, если не существует
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Генерируем имя файла с timestamp
  const timestamp = report.timestamp.replace(/[:.]/g, '-');
  const filename = `comparison-${timestamp}.md`;
  const filepath = path.join(outputDir, filename);
  
  // Генерируем и сохраняем отчёт
  const markdown = generateMarkdownReport(report, mapping);
  fs.writeFileSync(filepath, markdown, 'utf-8');
  
  return filepath;
}

/**
 * Вывести итоговую статистику в консоль
 * (ответы и оценки уже выведены по мере получения)
 */
export function printReport(report: Report): void {
  console.log('\n' + '='.repeat(80));
  console.log('                    📈 ИТОГОВАЯ СТАТИСТИКА');
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
  
  console.log('\n' + '='.repeat(80));
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
  finalConclusion: FinalConclusion
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
