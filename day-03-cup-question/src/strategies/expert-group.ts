import { PromptingStrategy, StrategyResult, OpenAIClient } from '../types';

/**
 * Стратегия 4: Группа экспертов
 * Создаёт промпт с ролями: аналитик, инженер, критик
 */
export class ExpertGroupStrategy implements PromptingStrategy {
  name = 'Группа экспертов';
  description = 'Создание промпта с ролями: аналитик, инженер, критик';

  async execute(task: string, client: OpenAIClient): Promise<StrategyResult> {
    const prompt = `Ты - группа экспертов, состоящая из трёх специалистов:

1. **Аналитик** - анализирует условия задачи, выделяет ключевые элементы и ограничения
2. **Инженер** - предлагает техническое решение, описывает конкретные шаги
3. **Критик** - проверяет решение на ошибки, ищет логические противоречия

Каждый эксперт должен высказаться по очереди в указанном порядке.
После выступления всех экспертов, предоставь итоговое решение.

Формат ответа:
---
**Аналитик:**
[анализ задачи]

**Инженер:**
[предложенное решение]

**Критик:**
[проверка и замечания]

**Итоговое решение:**
[финальный ответ]
---

Задача: ${task}`;

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
