/**
 * Тесты для PromptProvider
 */

import { describe, it, expect } from 'vitest';
import { PromptProvider } from '../src/prompts/PromptProvider';
import { ModelResponse, ModelComparison, AnonymizedResponse, AnonymizationMapping } from '../src/types';

describe('PromptProvider.createComparisonPrompt', () => {
  const provider = new PromptProvider();

  it('должен создавать промпт с вопросом и ответами', () => {
    const question = 'Тестовый вопрос?';
    const responses: AnonymizedResponse[] = [
      { number: 1, content: 'Первый ответ' },
      { number: 2, content: 'Второй ответ' },
      { number: 3, content: 'Третий ответ' }
    ];

    const prompt = provider.createComparisonPrompt(question, responses);

    expect(prompt).toContain('Тестовый вопрос?');
    expect(prompt).toContain('Ответ 1');
    expect(prompt).toContain('Ответ 2');
    expect(prompt).toContain('Ответ 3');
    expect(prompt).toContain('Первый ответ');
    expect(prompt).toContain('Второй ответ');
    expect(prompt).toContain('Третий ответ');
  });

  it('должен содержать инструкции по оценке', () => {
    const question = 'Вопрос';
    const responses: AnonymizedResponse[] = [
      { number: 1, content: 'Ответ' }
    ];

    const prompt = provider.createComparisonPrompt(question, responses);

    expect(prompt).toContain('Оцените каждый ответ');
    expect(prompt).toContain('от 1 до 10');
    expect(prompt).toContain('Полнота ответа');
    expect(prompt).toContain('Логичность');
    expect(prompt).toContain('Глубина анализа');
  });

  it('должен содержать формат ответа', () => {
    const question = 'Вопрос';
    const responses: AnonymizedResponse[] = [
      { number: 1, content: 'Ответ' }
    ];

    const prompt = provider.createComparisonPrompt(question, responses);

    expect(prompt).toContain('### Ответ');
    expect(prompt).toContain('Оценка:');
    expect(prompt).toContain('Анализ:');
  });
});

describe('PromptProvider.createFinalConclusionPrompt', () => {
  const provider = new PromptProvider();

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

  const createMockComparison = (
    modelName: string,
    ratings: Array<{ responseNumber: number; score: number; analysis: string }>
  ): ModelComparison => ({
    modelId: modelName.toLowerCase().replace(/\s/g, '-'),
    modelName,
    modelLevel: 'medium',
    ratings
  });

  it('должен создавать промпт с вопросом и ответами моделей', () => {
    const question = 'Тестовый вопрос?';
    const responses: ModelResponse[] = [
      createMockResponse('model-1', 'Model One', 'strong', 'Ответ сильной модели'),
      createMockResponse('model-2', 'Model Two', 'medium', 'Ответ средней модели')
    ];
    const comparisons: ModelComparison[] = [];
    const mapping: AnonymizationMapping[] = [
      { anonymizedNumber: 1, modelId: 'model-1', modelName: 'Model One', modelLevel: 'strong' },
      { anonymizedNumber: 2, modelId: 'model-2', modelName: 'Model Two', modelLevel: 'medium' }
    ];

    const prompt = provider.createFinalConclusionPrompt(question, responses, comparisons, mapping);

    expect(prompt).toContain('Тестовый вопрос?');
    expect(prompt).toContain('Model One');
    expect(prompt).toContain('Model Two');
    expect(prompt).toContain('Ответ сильной модели');
    expect(prompt).toContain('Ответ средней модели');
  });

  it('должен включать метрики ответов', () => {
    const question = 'Вопрос';
    const responses: ModelResponse[] = [
      createMockResponse('model-1', 'Model One', 'strong', 'Ответ')
    ];
    const comparisons: ModelComparison[] = [];
    const mapping: AnonymizationMapping[] = [
      { anonymizedNumber: 1, modelId: 'model-1', modelName: 'Model One', modelLevel: 'strong' }
    ];

    const prompt = provider.createFinalConclusionPrompt(question, responses, comparisons, mapping);

    expect(prompt).toContain('Время ответа:');
    expect(prompt).toContain('Токены:');
    expect(prompt).toContain('Стоимость:');
  });

  it('должен включать оценки качества', () => {
    const question = 'Вопрос';
    const responses: ModelResponse[] = [
      createMockResponse('model-1', 'Model One', 'strong', 'Ответ 1'),
      createMockResponse('model-2', 'Model Two', 'weak', 'Ответ 2')
    ];
    const comparisons: ModelComparison[] = [
      createMockComparison('Evaluator', [
        { responseNumber: 1, score: 8, analysis: 'Хороший ответ' },
        { responseNumber: 2, score: 6, analysis: 'Средний ответ' }
      ])
    ];
    const mapping: AnonymizationMapping[] = [
      { anonymizedNumber: 1, modelId: 'model-1', modelName: 'Model One', modelLevel: 'strong' },
      { anonymizedNumber: 2, modelId: 'model-2', modelName: 'Model Two', modelLevel: 'weak' }
    ];

    const prompt = provider.createFinalConclusionPrompt(question, responses, comparisons, mapping);

    expect(prompt).toContain('Оценки качества');
    expect(prompt).toContain('Средняя оценка');
    expect(prompt).toContain('8/10');
    expect(prompt).toContain('6/10');
  });

  it('должен содержать задания для анализа', () => {
    const question = 'Вопрос';
    const responses: ModelResponse[] = [
      createMockResponse('model-1', 'Model One', 'strong', 'Ответ')
    ];
    const comparisons: ModelComparison[] = [];
    const mapping: AnonymizationMapping[] = [
      { anonymizedNumber: 1, modelId: 'model-1', modelName: 'Model One', modelLevel: 'strong' }
    ];

    const prompt = provider.createFinalConclusionPrompt(question, responses, comparisons, mapping);

    expect(prompt).toContain('Какая модель показала наиболее качественный ответ');
    expect(prompt).toContain('соотношение качество/стоимость');
    expect(prompt).toContain('ключевые различия');
  });
});

describe('PromptProvider.parseAllRatings', () => {
  const provider = new PromptProvider();

  it('должен парсить оценки из корректного ответа', () => {
    const content = `
### Ответ 1
- Оценка: 8
- Анализ: Хороший ответ с глубоким анализом.

### Ответ 2
- Оценка: 6
- Анализ: Средний ответ.

### Ответ 3
- Оценка: 9
- Анализ: Отличный ответ!
    `;

    const ratings = provider.parseAllRatings(content);

    expect(ratings.size).toBe(3);
    expect(ratings.get(1)?.score).toBe(8);
    expect(ratings.get(1)?.analysis).toContain('Хороший ответ');
    expect(ratings.get(2)?.score).toBe(6);
    expect(ratings.get(3)?.score).toBe(9);
  });

  it('должен работать с разным форматированием', () => {
    const content = `
### Ответ 1
- Оценка: 7
- Анализ: Нормальный ответ

###Ответ 2
-Оценка: 5
-Анализ: Слабый ответ
    `;

    const ratings = provider.parseAllRatings(content);

    expect(ratings.size).toBe(2);
    expect(ratings.get(1)?.score).toBe(7);
    expect(ratings.get(2)?.score).toBe(5);
  });

  it('должен возвращать пустую Map для ответа без оценок', () => {
    const content = 'Это просто текст без оценок';
    
    const ratings = provider.parseAllRatings(content);
    
    expect(ratings.size).toBe(0);
  });

  it('должен корректно парсить многострочный анализ', () => {
    const content = `
### Ответ 1
- Оценка: 8
- Анализ: Это очень длинный анализ,
который продолжается на нескольких строках.
И даже имеет несколько абзацев.

### Ответ 2
- Оценка: 5
- Анализ: Короткий анализ.
    `;

    const ratings = provider.parseAllRatings(content);

    expect(ratings.size).toBe(2);
    expect(ratings.get(1)?.analysis).toContain('длинный анализ');
    expect(ratings.get(1)?.analysis).toContain('нескольких строках');
  });

  it('должен быть регистронезависимым', () => {
    const content = `
### ОТВЕТ 1
- ОЦЕНКА: 7
- АНАЛИЗ: Тест

### ответ 2
- оценка: 5
- анализ: Тест 2
    `;

    const ratings = provider.parseAllRatings(content);

    expect(ratings.size).toBe(2);
    expect(ratings.get(1)?.score).toBe(7);
    expect(ratings.get(2)?.score).toBe(5);
  });
});
