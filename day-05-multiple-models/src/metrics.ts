/**
 * Модуль для расчёта метрик и стоимости
 */

import { Pricing, TokenUsage, ModelResponse, Report } from './types';

/**
 * Рассчитать стоимость запроса
 * @param usage - использование токенов
 * @param pricing - цены модели
 * @returns стоимость в USD
 */
export function calculateCost(usage: TokenUsage, pricing: Pricing): number {
  const inputCost = (usage.inputTokens / 1_000_000) * pricing.input;
  const outputCost = (usage.outputTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}

/**
 * Форматировать стоимость для вывода
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${cost.toFixed(6)}`;
  } else if (cost < 1) {
    return `$${cost.toFixed(4)}`;
  }
  return `$${cost.toFixed(2)}`;
}

/**
 * Форматировать время для вывода
 */
export function formatTime(ms: number): string {
  if (ms < 1000) {
    return `${ms}мс`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}с`;
  }
  return `${(ms / 60000).toFixed(2)}мин`;
}

/**
 * Форматировать число токенов
 */
export function formatTokens(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(2)}M`;
  } else if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
}

/**
 * Рассчитать итоговые метрики отчёта
 */
export function calculateSummary(report: Report): Report['summary'] {
  let totalCost = 0;
  let totalTimeMs = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  // Метрики ответов
  for (const response of report.responses) {
    totalCost += response.cost;
    totalTimeMs += response.responseTimeMs;
    totalInputTokens += response.usage.inputTokens;
    totalOutputTokens += response.usage.outputTokens;
  }

  // Метрики финального вывода
  totalCost += report.finalConclusion.cost;
  totalTimeMs += report.finalConclusion.responseTimeMs;
  totalInputTokens += report.finalConclusion.usage.inputTokens;
  totalOutputTokens += report.finalConclusion.usage.outputTokens;

  return {
    totalCost,
    totalTimeMs,
    totalInputTokens,
    totalOutputTokens
  };
}

/**
 * Создать таблицу сравнения метрик
 */
export function createMetricsTable(responses: ModelResponse[]): string {
  const lines: string[] = [];
  
  lines.push('| Модель | Время | Input | Output | Стоимость |');
  lines.push('|--------|-------|-------|--------|-----------|');
  
  for (const response of responses) {
    lines.push(
      `| ${response.modelName} | ${formatTime(response.responseTimeMs)} | ` +
      `${formatTokens(response.usage.inputTokens)} | ` +
      `${formatTokens(response.usage.outputTokens)} | ` +
      `${formatCost(response.cost)} |`
    );
  }
  
  return lines.join('\n');
}
