/**
 * Тесты для модуля metrics.ts
 */

import { describe, it, expect } from 'vitest';
import {
  calculateCost,
  formatCost,
  formatTime,
  formatTokens,
  calculateSummary,
  createMetricsTable
} from '../src/metrics';
import { Pricing, ModelResponse, Report } from '../src/types';

describe('calculateCost', () => {
  const pricing: Pricing = {
    input: 3.00,   // $3 за 1M input токенов
    output: 15.00  // $15 за 1M output токенов
  };

  it('должен корректно рассчитывать стоимость', () => {
    const usage = { inputTokens: 1000, outputTokens: 500 };
    const cost = calculateCost(usage, pricing);
    
    // (1000/1M * 3) + (500/1M * 15) = 0.003 + 0.0075 = 0.0105
    expect(cost).toBeCloseTo(0.0105, 6);
  });

  it('должен возвращать 0 для нулевых токенов', () => {
    const usage = { inputTokens: 0, outputTokens: 0 };
    const cost = calculateCost(usage, pricing);
    
    expect(cost).toBe(0);
  });

  it('должен корректно работать с большими числами токенов', () => {
    const usage = { inputTokens: 1_000_000, outputTokens: 1_000_000 };
    const cost = calculateCost(usage, pricing);
    
    // (1M/1M * 3) + (1M/1M * 15) = 3 + 15 = 18
    expect(cost).toBe(18);
  });

  it('должен корректно работать с дробными ценами', () => {
    const lowPricing: Pricing = { input: 0.05, output: 0.10 };
    const usage = { inputTokens: 1000, outputTokens: 1000 };
    const cost = calculateCost(usage, lowPricing);
    
    // (1000/1M * 0.05) + (1000/1M * 0.10) = 0.00005 + 0.0001 = 0.00015
    expect(cost).toBeCloseTo(0.00015, 8);
  });
});

describe('formatCost', () => {
  it('должен форматировать очень маленькие суммы (до 6 знаков)', () => {
    expect(formatCost(0.000001)).toBe('$0.000001');
    expect(formatCost(0.005)).toBe('$0.005000');
  });

  it('должен форматировать суммы меньше $1 (до 4 знаков)', () => {
    expect(formatCost(0.01)).toBe('$0.0100');
    expect(formatCost(0.5)).toBe('$0.5000');
    expect(formatCost(0.9999)).toBe('$0.9999');
  });

  it('должен форматировать суммы от $1 (до 2 знаков)', () => {
    expect(formatCost(1)).toBe('$1.00');
    expect(formatCost(10.5)).toBe('$10.50');
    expect(formatCost(100)).toBe('$100.00');
  });
});

describe('formatTime', () => {
  it('должен форматировать миллисекунды', () => {
    expect(formatTime(100)).toBe('100мс');
    expect(formatTime(999)).toBe('999мс');
  });

  it('должен форматировать секунды', () => {
    expect(formatTime(1000)).toBe('1.00с');
    expect(formatTime(1500)).toBe('1.50с');
    expect(formatTime(59900)).toBe('59.90с');  // 59999 округляется до 60.00
  });

  it('должен форматировать минуты', () => {
    expect(formatTime(60000)).toBe('1.00мин');
    expect(formatTime(90000)).toBe('1.50мин');
    expect(formatTime(120000)).toBe('2.00мин');
  });
});

describe('formatTokens', () => {
  it('должен форматировать числа меньше 1000 как есть', () => {
    expect(formatTokens(0)).toBe('0');
    expect(formatTokens(100)).toBe('100');
    expect(formatTokens(999)).toBe('999');
  });

  it('должен форматировать тысячи с K', () => {
    expect(formatTokens(1000)).toBe('1.0K');
    expect(formatTokens(5500)).toBe('5.5K');
    expect(formatTokens(999999)).toBe('1000.0K');
  });

  it('должен форматировать миллионы с M', () => {
    expect(formatTokens(1_000_000)).toBe('1.00M');
    expect(formatTokens(1_500_000)).toBe('1.50M');
    expect(formatTokens(10_000_000)).toBe('10.00M');
  });
});

describe('calculateSummary', () => {
  const createMockResponse = (cost: number, time: number, inputT: number, outputT: number): ModelResponse => ({
    modelId: 'test-model',
    modelName: 'Test Model',
    modelLevel: 'medium',
    content: 'test content',
    usage: { inputTokens: inputT, outputTokens: outputT },
    responseTimeMs: time,
    cost
  });

  it('должен суммировать метрики всех ответов', () => {
    const report: Report = {
      timestamp: '2024-01-01T00:00:00.000Z',
      question: 'test question',
      responses: [
        createMockResponse(0.01, 1000, 100, 200),
        createMockResponse(0.02, 2000, 150, 250)
      ],
      comparisons: [],
      finalConclusion: {
        content: 'conclusion',
        usage: { inputTokens: 50, outputTokens: 100 },
        responseTimeMs: 500,
        cost: 0.005
      },
      summary: { totalCost: 0, totalTimeMs: 0, totalInputTokens: 0, totalOutputTokens: 0 }
    };

    const summary = calculateSummary(report);

    expect(summary.totalCost).toBeCloseTo(0.035, 6);  // 0.01 + 0.02 + 0.005
    expect(summary.totalTimeMs).toBe(3500);           // 1000 + 2000 + 500
    expect(summary.totalInputTokens).toBe(300);       // 100 + 150 + 50
    expect(summary.totalOutputTokens).toBe(550);      // 200 + 250 + 100
  });

  it('должен возвращать нули для пустого отчёта', () => {
    const report: Report = {
      timestamp: '2024-01-01T00:00:00.000Z',
      question: 'test question',
      responses: [],
      comparisons: [],
      finalConclusion: {
        content: 'conclusion',
        usage: { inputTokens: 0, outputTokens: 0 },
        responseTimeMs: 0,
        cost: 0
      },
      summary: { totalCost: 0, totalTimeMs: 0, totalInputTokens: 0, totalOutputTokens: 0 }
    };

    const summary = calculateSummary(report);

    expect(summary.totalCost).toBe(0);
    expect(summary.totalTimeMs).toBe(0);
    expect(summary.totalInputTokens).toBe(0);
    expect(summary.totalOutputTokens).toBe(0);
  });
});

describe('createMetricsTable', () => {
  it('должен создавать корректную таблицу метрик', () => {
    const responses: ModelResponse[] = [
      {
        modelId: 'model-1',
        modelName: 'Model One',
        modelLevel: 'strong',
        content: 'response 1',
        usage: { inputTokens: 100, outputTokens: 200 },
        responseTimeMs: 1500,
        cost: 0.01
      },
      {
        modelId: 'model-2',
        modelName: 'Model Two',
        modelLevel: 'weak',
        content: 'response 2',
        usage: { inputTokens: 50, outputTokens: 100 },
        responseTimeMs: 500,
        cost: 0.001
      }
    ];

    const table = createMetricsTable(responses);

    expect(table).toContain('Модель');
    expect(table).toContain('Время');
    expect(table).toContain('Input');
    expect(table).toContain('Output');
    expect(table).toContain('Стоимость');
    expect(table).toContain('Model One');
    expect(table).toContain('Model Two');
    expect(table).toContain('1.50с');
    expect(table).toContain('500мс');
  });
});
