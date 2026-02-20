/**
 * Модуль для создания промптов
 */

import { ModelResponse, ModelComparison, AnonymizedResponse } from './types';

/**
 * Создать промпт для сравнения ответов
 */
export function createComparisonPrompt(
  question: string,
  anonymizedResponses: AnonymizedResponse[]
): string {
  const responsesText = anonymizedResponses
    .map(r => `## Ответ ${r.number}\n\n${r.content}`)
    .join('\n\n---\n\n');

  return `Вам даны три ответа (Ответ 1, Ответ 2, Ответ 3) на следующий вопрос:

**Вопрос:** ${question}

${responsesText}

---

**Задание:**
Оцените каждый ответ по шкале от 1 до 10 по следующим критериям:
- Полнота ответа
- Логичность и последовательность
- Глубина анализа
- Ясность изложения
- Качество примеров

Для каждого ответа укажите:
1. Оценку (число от 1 до 10)
2. Краткий анализ сильных и слабых сторон

Формат ответа:
### Ответ 1
- Оценка: [число]
- Анализ: [текст]

### Ответ 2
- Оценка: [число]
- Анализ: [текст]

### Ответ 3
- Оценка: [число]
- Анализ: [текст]`;
}

/**
 * Создать промпт для финального вывода
 */
export function createFinalConclusionPrompt(
  question: string,
  responses: ModelResponse[],
  comparisons: ModelComparison[]
): string {
  // Создаём анонимизированные данные для анализа
  const responsesData = responses.map((r, i) => ({
    number: i + 1,
    content: r.content,
    time: r.responseTimeMs,
    inputTokens: r.usage.inputTokens,
    outputTokens: r.usage.outputTokens,
    cost: r.cost
  }));

  const responsesText = responsesData
    .map(r => `### Ответ ${r.number}
- Время ответа: ${r.time}мс
- Токены: ${r.inputTokens} input, ${r.outputTokens} output
- Стоимость: $${r.cost.toFixed(6)}

${r.content}`)
    .join('\n\n---\n\n');

  const comparisonsText = comparisons
    .map((c, i) => `### Оценка от Модели ${i + 1}
${c.rating.analysis}`)
    .join('\n\n');

  return `Вы - эксперт по анализу качества языковых моделей. Вам предоставлены данные о трёх моделях, ответивших на один и тот же вопрос.

**Вопрос:** ${question}

---

## Ответы моделей (анонимизированы):

${responsesText}

---

## Оценки качества (от других моделей):

${comparisonsText}

---

**Задание:**
Проанализируйте все данные и сделайте итоговый вывод:
1. Какой ответ (1, 2 или 3) является наиболее качественным и почему?
2. Какой ответ показывает лучшее соотношение качество/стоимость?
3. Какие ключевые различия вы заметили между ответами?
4. Общие выводы о различиях в работе моделей разного уровня.

Дайте развёрнутый анализ, опираясь на конкретные примеры из ответов.`;
}

/**
 * Парсить все оценки из ответа модели
 */
export function parseAllRatings(content: string): Map<number, { score: number; analysis: string }> {
  const ratings = new Map<number, { score: number; analysis: string }>();
  
  const scorePattern = /###\s*Ответ\s*(\d)[\s\S]*?Оценка:\s*(\d+)/gi;
  const matches = [...content.matchAll(scorePattern)];
  
  for (const match of matches) {
    const responseNum = parseInt(match[1]);
    const score = parseInt(match[2]);
    
    // Извлекаем анализ
    const analysisPattern = new RegExp(
      `###\\s*Ответ\\s*${responseNum}[\\s\\S]*?Анализ:\\s*([\\s\\S]*?)(?=###|$)`,
      'i'
    );
    const analysisMatch = content.match(analysisPattern);
    const analysis = analysisMatch ? analysisMatch[1].trim() : '';
    
    ratings.set(responseNum, { score, analysis });
  }
  
  return ratings;
}
