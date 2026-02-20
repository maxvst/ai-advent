/**
 * Провайдер промптов для сравнения моделей
 */

import { IPromptProvider } from '../services/interfaces';
import {
  ModelResponse,
  ModelComparison,
  AnonymizedResponse,
  AnonymizationMapping
} from '../types';

/**
 * Реализация провайдера промптов
 */
export class PromptProvider implements IPromptProvider {
  /**
   * Создать промпт для сравнения ответов
   */
  createComparisonPrompt(
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
  createFinalConclusionPrompt(
    question: string,
    responses: ModelResponse[],
    comparisons: ModelComparison[],
    mapping: AnonymizationMapping[]
  ): string {
    // Создаём данные для анализа с восстановленными именами моделей
    const responsesData = responses.map((r, i) => {
      const mapInfo = mapping.find(m => m.modelId === r.modelId);
      return {
        number: mapInfo?.anonymizedNumber ?? i + 1,
        modelName: r.modelName,
        modelLevel: r.modelLevel,
        content: r.content,
        time: r.responseTimeMs,
        inputTokens: r.usage.inputTokens,
        outputTokens: r.usage.outputTokens,
        cost: r.cost
      };
    });

    const responsesText = responsesData
      .map(r => `### Ответ ${r.number} (${r.modelName} - ${r.modelLevel})
- Время ответа: ${r.time}мс
- Токены: ${r.inputTokens} input, ${r.outputTokens} output
- Стоимость: $${r.cost.toFixed(6)}

${r.content}`)
      .join('\n\n---\n\n');

    // Группируем оценки по ответам
    const ratingsByResponse = new Map<number, Array<{ evaluator: string; score: number; analysis: string }>>();

    for (const comparison of comparisons) {
      for (const rating of comparison.ratings) {
        if (!ratingsByResponse.has(rating.responseNumber)) {
          ratingsByResponse.set(rating.responseNumber, []);
        }
        ratingsByResponse.get(rating.responseNumber)!.push({
          evaluator: comparison.modelName,
          score: rating.score,
          analysis: rating.analysis
        });
      }
    }

    const ratingsText = Array.from(ratingsByResponse.entries())
      .sort(([a], [b]) => a - b)
      .map(([num, ratings]) => {
        const mapInfo = mapping.find(m => m.anonymizedNumber === num);
        const avgScore = (ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length).toFixed(1);
        return `### Оценки для Ответа ${num} (${mapInfo?.modelName ?? 'Неизвестно'})
- Средняя оценка: ${avgScore}/10
- Оценки от моделей: ${ratings.map(r => `${r.evaluator}: ${r.score}/10`).join(', ')}
- Анализы:
${ratings.map(r => `  - ${r.evaluator}: ${r.analysis.substring(0, 150)}...`).join('\n')}`;
      })
      .join('\n\n');

    return `Вы - эксперт по анализу качества языковых моделей. Вам предоставлены данные о трёх моделях, ответивших на один и тот же вопрос.

**Вопрос:** ${question}

---

## Ответы моделей:

${responsesText}

---

## Оценки качества:

${ratingsText}

---

**Задание:**
Проанализируйте все данные и сделайте итоговый вывод:
1. Какая модель показала наиболее качественный ответ и почему?
2. Какая модель показывает лучшее соотношение качество/стоимость?
3. Какие ключевые различия вы заметили между ответами моделей разного уровня?
4. Общие выводы о различиях в работе моделей.

Дайте развёрнутый анализ, опираясь на конкретные примеры из ответов.`;
  }

  /**
   * Парсить все оценки из ответа модели
   */
  parseAllRatings(content: string): Map<number, { score: number; analysis: string }> {
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
}

/**
 * Создать экземпляр провайдера промптов
 */
export function createPromptProvider(): IPromptProvider {
  return new PromptProvider();
}
