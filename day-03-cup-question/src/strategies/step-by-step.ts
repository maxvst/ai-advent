import { PromptingStrategy, StrategyResult, OpenAIClient } from '../types';

/**
 * Стратегия 2: Пошаговое решение
 * Добавляет инструкцию решать задачу пошагово
 */
export class StepByStepStrategy implements PromptingStrategy {
  name = 'Пошаговое решение';
  description = 'Добавление инструкции "решай пошагово"';

  async execute(task: string, client: OpenAIClient): Promise<StrategyResult> {
    const prompt = `${task}

Пожалуйста, решай эту задачу пошагово, объясняя каждый шаг.`;

    const startTime = Date.now();
    const result = await client.chatCompletion(prompt);
    const executionTimeMs = Date.now() - startTime;

    return {
      strategyName: this.name,
      prompt,
      response: result.content,
      executionTimeMs,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    };
  }
}
