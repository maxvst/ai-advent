/**
 * Сервис для генерации и сохранения отчётов
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  Report,
  ModelResponse,
  ModelComparison,
  AnonymizationMapping,
  FinalConclusion
} from '../types';
import { IReportService, IReportGenerator, ILogger } from './interfaces';
import { formatCost, formatTime, formatTokens, calculateSummary } from '../metrics';

/**
 * Генератор Markdown отчётов
 */
export class MarkdownReportGenerator implements IReportGenerator {
  generate(report: Report, mapping?: AnonymizationMapping[]): string {
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
    lines.push(this.createMetricsTable(report.responses));
    lines.push('');

    // Ответы моделей
    lines.push('## Ответы моделей');
    lines.push('');

    for (const response of report.responses) {
      lines.push(`### ${response.modelName} (${response.modelLevel})`);
      lines.push('');
      lines.push(`- **Время:** ${formatTime(response.responseTimeMs)}`);
      lines.push(
        `- **Токены:** ${formatTokens(response.usage.inputTokens)} input, ` +
        `${formatTokens(response.usage.outputTokens)} output`
      );
      lines.push(`- **Стоимость:** ${formatCost(response.cost)}`);
      lines.push('');
      lines.push('**Ответ:**');
      lines.push('');
      lines.push(response.content);
      lines.push('');
      lines.push('---');
      lines.push('');
    }

    // Оценки качества
    lines.push('## Оценки качества');
    lines.push('');
    lines.push('Модели оценивали ответы анонимно (без знания автора).');
    lines.push('');

    if (mapping && mapping.length > 0) {
      this.addRatingsSection(lines, report, mapping);
    } else {
      this.addRatingsSectionFallback(lines, report);
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
    lines.push(
      `- **Всего токенов:** ${formatTokens(report.summary.totalInputTokens)} input, ` +
      `${formatTokens(report.summary.totalOutputTokens)} output`
    );
    lines.push('');

    return lines.join('\n');
  }

  getFileExtension(): string {
    return 'md';
  }

  private createMetricsTable(responses: ModelResponse[]): string {
    const lines: string[] = [];

    lines.push('| Модель | Уровень | Время | Input | Output | Стоимость |');
    lines.push('|--------|---------|-------|-------|--------|-----------|');

    for (const response of responses) {
      lines.push(
        `| ${response.modelName} | ${response.modelLevel} | ` +
        `${formatTime(response.responseTimeMs)} | ` +
        `${formatTokens(response.usage.inputTokens)} | ` +
        `${formatTokens(response.usage.outputTokens)} | ` +
        `${formatCost(response.cost)} |`
      );
    }

    return lines.join('\n');
  }

  private addRatingsSection(
    lines: string[],
    report: Report,
    mapping: AnonymizationMapping[]
  ): void {
    for (const mapInfo of mapping) {
      lines.push(
        `### Ответ ${mapInfo.anonymizedNumber} (${mapInfo.modelName} - ${mapInfo.modelLevel})`
      );
      lines.push('');

      const scores: string[] = [];
      let totalScore = 0;
      let count = 0;

      for (const comparison of report.comparisons) {
        const rating = comparison.ratings.find(
          r => r.responseNumber === mapInfo.anonymizedNumber
        );
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
        const rating = comparison.ratings.find(
          r => r.responseNumber === mapInfo.anonymizedNumber
        );
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
  }

  private addRatingsSectionFallback(lines: string[], report: Report): void {
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
}

/**
 * Реализация сервиса отчётов
 */
export class ReportService implements IReportService {
  private readonly generator: IReportGenerator;

  constructor(
    private readonly logger: ILogger,
    generator?: IReportGenerator
  ) {
    this.generator = generator ?? new MarkdownReportGenerator();
  }

  /**
   * Создать объект отчёта
   */
  createReport(
    question: string,
    responses: ModelResponse[],
    comparisons: ModelComparison[],
    finalConclusion: FinalConclusion
  ): Report {
    this.logger.debug('Создание объекта отчёта');

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

    this.logger.debug(
      `Отчёт создан: общая стоимость ${formatCost(report.summary.totalCost)}`
    );

    return report;
  }

  /**
   * Сохранить отчёт в файл
   */
  async saveReport(
    report: Report,
    outputDir: string,
    mapping?: AnonymizationMapping[]
  ): Promise<string> {
    this.logger.debug(`Сохранение отчёта в директорию ${outputDir}`);

    // Создаём директорию, если не существует
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Генерируем имя файла с timestamp
    const timestamp = report.timestamp.replace(/[:.]/g, '-');
    const filename = `comparison-${timestamp}.${this.generator.getFileExtension()}`;
    const filepath = path.join(outputDir, filename);

    // Генерируем и сохраняем отчёт
    const content = this.generator.generate(report, mapping);
    fs.writeFileSync(filepath, content, 'utf-8');

    this.logger.info(`Отчёт сохранён: ${filepath}`);

    return filepath;
  }

  /**
   * Вывести отчёт в консоль
   */
  printReport(report: Report): void {
    const SEPARATOR = '═'.repeat(80);
    const SUB_SEPARATOR = '─'.repeat(60);

    console.log('\n' + SEPARATOR);
    console.log('                    📈 ИТОГОВАЯ СТАТИСТИКА');
    console.log(SEPARATOR);
    console.log(`\n📅 Дата: ${report.timestamp}`);
    console.log(`\n❓ Вопрос: ${report.question}`);

    console.log('\n' + SUB_SEPARATOR);
    console.log('📊 МЕТРИКИ ОТВЕТОВ');
    console.log(SUB_SEPARATOR);

    for (const response of report.responses) {
      console.log(`\n🔹 ${response.modelName} (${response.modelLevel})`);
      console.log(`   ⏱️  Время: ${formatTime(response.responseTimeMs)}`);
      console.log(
        `   📊 Токены: ${formatTokens(response.usage.inputTokens)} input, ` +
        `${formatTokens(response.usage.outputTokens)} output`
      );
      console.log(`   💰 Стоимость: ${formatCost(response.cost)}`);
    }

    console.log('\n' + SEPARATOR);
    console.log(`   💰 Общая стоимость: ${formatCost(report.summary.totalCost)}`);
    console.log(`   ⏱️  Общее время: ${formatTime(report.summary.totalTimeMs)}`);
    console.log(
      `   📊 Всего токенов: ${formatTokens(report.summary.totalInputTokens)} input, ` +
      `${formatTokens(report.summary.totalOutputTokens)} output`
    );
    console.log(SEPARATOR + '\n');
  }
}

/**
 * Создать экземпляр ReportService
 */
export function createReportService(
  logger: ILogger,
  generator?: IReportGenerator
): IReportService {
  return new ReportService(logger, generator);
}
