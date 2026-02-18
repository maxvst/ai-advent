import { PromptingStrategy, StrategyResult, OpenAIClient } from '../types';

/**
 * Стратегия 3: Мета-промпт
 * Сначала просит модель создать оптимальный промпт, затем использует его
 */
export class MetaPromptStrategy implements PromptingStrategy {
  name = 'Мета-промпт';
  description = 'Сначала создаёт оптимальный промпт, затем использует его для решения';

  async execute(task: string, client: OpenAIClient): Promise<StrategyResult> {
    // Шаг 1: Попросить модель создать оптимальный промпт
    const metaPrompt = `Ты - эксперт по созданию промптов для языковых моделей.
Создай оптимальный промпт для решения следующей задачи.
Верни ТОЛЬКО промпт, без объяснений и комментариев.

Задача: ${task}`;

    const startTime = Date.now();
    
    // Получаем оптимизированный промпт от модели
    const generatedPrompt = await client.chatCompletion(metaPrompt);
    
    // Шаг 2: Используем созданный промпт для решения задачи
    const response = await client.chatCompletion(generatedPrompt);
    
    const executionTimeMs = Date.now() - startTime;

    // Формируем итоговый промпт для отображения (оба шага)
    const fullPrompt = `=== ШАГ 1: Генерация промпта ===
${metaPrompt}

=== Ответ модели (сгенерированный промпт) ===
${generatedPrompt}

=== ШАГ 2: Решение с использованием промпта ===
${generatedPrompt}`;

    return {
      strategyName: this.name,
      prompt: fullPrompt,
      response,
      executionTimeMs,
    };
  }
}
