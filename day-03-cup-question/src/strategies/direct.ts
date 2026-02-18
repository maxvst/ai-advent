import { PromptingStrategy, StrategyResult, OpenAIClient } from '../types';

/**
 * Стратегия 1: Прямой запрос
 * Отправляет задачу без дополнительных инструкций
 */
export class DirectStrategy implements PromptingStrategy {
  name = 'Прямой запрос';
  description = 'Отправка задачи без дополнительных инструкций';

  async execute(task: string, client: OpenAIClient): Promise<StrategyResult> {
    const prompt = task;
    
    const startTime = Date.now();
    const response = await client.chatCompletion(prompt);
    const executionTimeMs = Date.now() - startTime;

    return {
      strategyName: this.name,
      prompt,
      response,
      executionTimeMs,
    };
  }
}
