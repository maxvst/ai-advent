/**
 * Тесты для ComparisonService (фокус на анонимизации)
 */

import { describe, it, expect, vi } from 'vitest';
import { ComparisonService } from '../src/services/ComparisonService';
import { IApiClient, ModelResponse } from '../src/types';
import { IPromptProvider, ILogger } from '../src/services/interfaces';

describe('ComparisonService.anonymizeResponses', () => {
  // Создаём моки
  const mockApiClient: IApiClient = {} as IApiClient;
  const mockPromptProvider: IPromptProvider = {} as IPromptProvider;
  const mockLogger: ILogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  };

  const service = new ComparisonService(mockApiClient, mockPromptProvider, mockLogger);

  const createMockResponse = (
    id: string,
    name: string,
    level: 'strong' | 'medium' | 'weak',
    content: string
  ): ModelResponse => ({
    modelId: id,
    modelName: name,
    modelLevel: level,
    content,
    usage: { inputTokens: 100, outputTokens: 200 },
    responseTimeMs: 1000,
    cost: 0.01
  });

  it('должен возвращать все три ответа', () => {
    const responses: ModelResponse[] = [
      createMockResponse('model-1', 'Model One', 'strong', 'Ответ 1'),
      createMockResponse('model-2', 'Model Two', 'medium', 'Ответ 2'),
      createMockResponse('model-3', 'Model Three', 'weak', 'Ответ 3')
    ];

    const result = service.anonymizeResponses(responses);

    expect(result.responses).toHaveLength(3);
    expect(result.mapping).toHaveLength(3);
  });

  it('должен создавать корректный маппинг', () => {
    const responses: ModelResponse[] = [
      createMockResponse('model-1', 'Model One', 'strong', 'Ответ 1'),
      createMockResponse('model-2', 'Model Two', 'medium', 'Ответ 2'),
      createMockResponse('model-3', 'Model Three', 'weak', 'Ответ 3')
    ];

    const result = service.anonymizeResponses(responses);

    // Проверяем, что все модели есть в маппинге
    const modelIds = result.mapping.map(m => m.modelId);
    expect(modelIds).toContain('model-1');
    expect(modelIds).toContain('model-2');
    expect(modelIds).toContain('model-3');

    // Проверяем, что все уровни есть в маппинге
    const levels = result.mapping.map(m => m.modelLevel);
    expect(levels).toContain('strong');
    expect(levels).toContain('medium');
    expect(levels).toContain('weak');
  });

  it('должен сохранять содержимое ответов', () => {
    const responses: ModelResponse[] = [
      createMockResponse('model-1', 'Model One', 'strong', 'Уникальный ответ 1'),
      createMockResponse('model-2', 'Model Two', 'medium', 'Уникальный ответ 2'),
      createMockResponse('model-3', 'Model Three', 'weak', 'Уникальный ответ 3')
    ];

    const result = service.anonymizeResponses(responses);

    const contents = result.responses.map(r => r.content);
    expect(contents).toContain('Уникальный ответ 1');
    expect(contents).toContain('Уникальный ответ 2');
    expect(contents).toContain('Уникальный ответ 3');
  });

  it('должен присваивать номера от 1 до 3', () => {
    const responses: ModelResponse[] = [
      createMockResponse('model-1', 'Model One', 'strong', 'Ответ 1'),
      createMockResponse('model-2', 'Model Two', 'medium', 'Ответ 2'),
      createMockResponse('model-3', 'Model Three', 'weak', 'Ответ 3')
    ];

    const result = service.anonymizeResponses(responses);

    const numbers = result.responses.map(r => r.number);
    expect(numbers).toContain(1);
    expect(numbers).toContain(2);
    expect(numbers).toContain(3);
  });

  it('должен перемешивать ответы (не сохранять порядок strong->medium->weak)', () => {
    // Запускаем много раз, чтобы проверить случайность
    const orders: string[] = [];
    
    for (let i = 0; i < 100; i++) {
      const responses: ModelResponse[] = [
        createMockResponse('strong-id', 'Strong', 'strong', 'S'),
        createMockResponse('medium-id', 'Medium', 'medium', 'M'),
        createMockResponse('weak-id', 'Weak', 'weak', 'W')
      ];

      const result = service.anonymizeResponses(responses);
      const order = result.mapping.map(m => m.modelLevel).join('-');
      orders.push(order);
    }

    // Проверяем, что есть разные порядки (не всегда strong-medium-weak)
    const uniqueOrders = new Set(orders);
    expect(uniqueOrders.size).toBeGreaterThan(1);
  });

  it('должен корректно связывать анонимные номера с реальными моделями', () => {
    const responses: ModelResponse[] = [
      createMockResponse('model-1', 'Model One', 'strong', 'Ответ strong'),
      createMockResponse('model-2', 'Model Two', 'medium', 'Ответ medium'),
      createMockResponse('model-3', 'Model Three', 'weak', 'Ответ weak')
    ];

    const result = service.anonymizeResponses(responses);

    // Для каждого анонимного номера должен быть соответствующий маппинг
    for (const response of result.responses) {
      const mapping = result.mapping.find(m => m.anonymizedNumber === response.number);
      expect(mapping).toBeDefined();
      expect(mapping?.modelId).toBeDefined();
      expect(mapping?.modelName).toBeDefined();
      expect(mapping?.modelLevel).toBeDefined();
    }
  });

  it('должен работать с одним ответом', () => {
    const responses: ModelResponse[] = [
      createMockResponse('model-1', 'Model One', 'strong', 'Один ответ')
    ];

    const result = service.anonymizeResponses(responses);

    expect(result.responses).toHaveLength(1);
    expect(result.mapping).toHaveLength(1);
    expect(result.responses[0].number).toBe(1);
    expect(result.mapping[0].anonymizedNumber).toBe(1);
  });

  it('должен работать с пустым массивом', () => {
    const responses: ModelResponse[] = [];

    const result = service.anonymizeResponses(responses);

    expect(result.responses).toHaveLength(0);
    expect(result.mapping).toHaveLength(0);
  });
});
