/**
 * Модуль для сравнения качества ответов моделей
 */

import { 
  Config, 
  ModelConfig, 
  ModelResponse, 
  ModelComparison, 
  ModelLevel,
  AnonymizedResponse,
  ChatMessage,
  FinalConclusion
} from './types';
import { sendRequestWithTiming, extractContent, extractUsage } from './api';
import { calculateCost } from './metrics';

/**
 * Получить ответ от модели
 */
export async function getModelResponse(
  modelConfig: ModelConfig,
  modelLevel: ModelLevel,
  question: string
): Promise<ModelResponse> {
  const messages: ChatMessage[] = [
    {
      role: 'user',
      content: question
    }
  ];

  const { response: apiResponse, responseTimeMs } = await sendRequestWithTiming(
    modelConfig.id,
    messages
  );

  const usage = extractUsage(apiResponse);
  const content = extractContent(apiResponse);
  const cost = calculateCost(usage, modelConfig.pricing);

  return {
    modelId: modelConfig.id,
    modelName: modelConfig.name,
    modelLevel,
    content,
    usage,
    responseTimeMs,
    cost
  };
}

/**
 * Анонимизировать ответы для сравнения
 */
export function anonymizeResponses(responses: ModelResponse[]): AnonymizedResponse[] {
  // Перемешиваем порядок для анонимности
  const shuffled = [...responses].sort(() => Math.random() - 0.5);
  
  return shuffled.map((response, index) => ({
    number: index + 1,
    content: response.content
  }));
}

/**
 * Создать промпт для сравнения ответов
 */
function createComparisonPrompt(question: string, anonymizedResponses: AnonymizedResponse[]): string {
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
 * Получить сравнение от модели (анонимное)
 */
export async function getModelComparison(
  modelConfig: ModelConfig,
  modelLevel: ModelLevel,
  question: string,
  anonymizedResponses: AnonymizedResponse[],
  responseMap: Map<number, ModelResponse>
): Promise<ModelComparison> {
  const prompt = createComparisonPrompt(question, anonymizedResponses);
  
  const messages: ChatMessage[] = [
    {
      role: 'user',
      content: prompt
    }
  ];

  const { response: apiResponse } = await sendRequestWithTiming(
    modelConfig.id,
    messages
  );

  const content = extractContent(apiResponse);
  
  // Парсим оценку и анализ из ответа
  const rating = parseRating(content, modelLevel, responseMap);

  return {
    modelId: modelConfig.id,
    modelName: modelConfig.name,
    modelLevel,
    responseNumber: 0, // Будет заполнено позже
    rating
  };
}

/**
 * Парсить оценку из ответа модели
 */
function parseRating(
  content: string,
  selfLevel: ModelLevel,
  responseMap: Map<number, ModelResponse>
): { score: number; analysis: string } {
  // Извлекаем анализ для собственного ответа модели
  // Это упрощённый парсинг - в реальности может потребоваться более сложная логика
  
  // Ищем паттерн оценки для каждого ответа
  const scorePattern = /###\s*Ответ\s*(\d)[\s\S]*?Оценка:\s*(\d+)/gi;
  const matches = [...content.matchAll(scorePattern)];
  
  // Находим номер своего ответа
  let selfScore = 5; // Дефолтная оценка
  let analysis = content;

  for (const match of matches) {
    const responseNum = parseInt(match[1]);
    const score = parseInt(match[2]);
    const response = responseMap.get(responseNum);
    
    if (response && response.modelLevel === selfLevel) {
      selfScore = score;
      // Извлекаем анализ для этого ответа
      const analysisPattern = new RegExp(
        `###\\s*Ответ\\s*${responseNum}[\\s\\S]*?Анализ:\\s*([\\s\\S]*?)(?=###|$)`,
        'i'
      );
      const analysisMatch = content.match(analysisPattern);
      if (analysisMatch) {
        analysis = analysisMatch[1].trim();
      }
      break;
    }
  }

  return {
    score: selfScore,
    analysis
  };
}

/**
 * Создать промпт для финального вывода
 */
function createFinalConclusionPrompt(
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
 * Получить финальный вывод от сильной модели
 */
export async function getFinalConclusion(
  strongModel: ModelConfig,
  question: string,
  responses: ModelResponse[],
  comparisons: ModelComparison[]
): Promise<FinalConclusion> {
  const prompt = createFinalConclusionPrompt(question, responses, comparisons);
  
  const messages: ChatMessage[] = [
    {
      role: 'user',
      content: prompt
    }
  ];

  const { response: apiResponse, responseTimeMs } = await sendRequestWithTiming(
    strongModel.id,
    messages
  );

  const usage = extractUsage(apiResponse);
  const content = extractContent(apiResponse);
  const cost = calculateCost(usage, strongModel.pricing);

  return {
    content,
    usage,
    responseTimeMs,
    cost
  };
}

/**
 * Запустить все запросы параллельно
 */
export async function getAllResponses(config: Config): Promise<{
  strong: ModelResponse;
  medium: ModelResponse;
  weak: ModelResponse;
}> {
  const [strong, medium, weak] = await Promise.all([
    getModelResponse(config.models.strong, 'strong', config.question),
    getModelResponse(config.models.medium, 'medium', config.question),
    getModelResponse(config.models.weak, 'weak', config.question)
  ]);

  return { strong, medium, weak };
}
