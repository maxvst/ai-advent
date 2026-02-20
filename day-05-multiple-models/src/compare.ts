/**
 * Модуль для сравнения качества ответов моделей
 */

import { 
  ModelConfig, 
  ModelResponse, 
  ModelComparison, 
  ModelLevel,
  AnonymizedResponse,
  AnonymizationResult,
  AnonymizationMapping,
  ChatMessage,
  FinalConclusion,
  ResponseRating,
  IApiClient
} from './types';
import { calculateCost } from './metrics';
import { createComparisonPrompt, createFinalConclusionPrompt, parseAllRatings } from './prompts';

/**
 * Получить ответ от модели
 */
export async function getModelResponse(
  apiClient: IApiClient,
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

  const { response: apiResponse, responseTimeMs } = await apiClient.sendRequestWithTiming(
    modelConfig.id,
    messages
  );

  const usage = apiClient.extractUsage(apiResponse);
  const content = apiClient.extractContent(apiResponse);
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
 * Анонимизировать ответы для сравнения с сохранением маппинга
 */
export function anonymizeResponses(responses: ModelResponse[]): AnonymizationResult {
  // Создаём массив индексов и перемешиваем их
  const indices = responses.map((_, i) => i);
  
  // Алгоритм Fisher-Yates для честного перемешивания
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  
  // Создаём анонимизированные ответы и маппинг
  const anonymizedResponses: AnonymizedResponse[] = [];
  const mapping: AnonymizationMapping[] = [];
  
  for (let i = 0; i < indices.length; i++) {
    const originalIndex = indices[i];
    const originalResponse = responses[originalIndex];
    
    anonymizedResponses.push({
      number: i + 1,
      content: originalResponse.content
    });
    
    mapping.push({
      anonymizedNumber: i + 1,
      modelId: originalResponse.modelId,
      modelName: originalResponse.modelName,
      modelLevel: originalResponse.modelLevel
    });
  }
  
  return {
    responses: anonymizedResponses,
    mapping
  };
}

/**
 * Получить сравнение от модели (анонимное)
 * Модель оценивает все три ответа и возвращает оценки для каждого
 */
export async function getModelComparison(
  apiClient: IApiClient,
  modelConfig: ModelConfig,
  modelLevel: ModelLevel,
  question: string,
  anonymizedResponses: AnonymizedResponse[]
): Promise<ModelComparison> {
  const prompt = createComparisonPrompt(question, anonymizedResponses);
  
  const messages: ChatMessage[] = [
    {
      role: 'user',
      content: prompt
    }
  ];

  const { response: apiResponse } = await apiClient.sendRequestWithTiming(
    modelConfig.id,
    messages
  );

  const content = apiClient.extractContent(apiResponse);
  
  // Парсим оценки из ответа модели
  const parsedRatings = parseAllRatings(content);
  
  // Преобразуем в массив ResponseRating
  const ratings: ResponseRating[] = [];
  for (let i = 1; i <= anonymizedResponses.length; i++) {
    const parsed = parsedRatings.get(i);
    
    // Предупреждение при неудачном парсинге
    if (!parsed) {
      console.warn(`⚠️  Не удалось распарсить оценку для Ответа ${i} от модели ${modelConfig.name}`);
    }
    
    ratings.push({
      responseNumber: i,
      score: parsed?.score ?? 0,
      analysis: parsed?.analysis ?? ''
    });
  }

  return {
    modelId: modelConfig.id,
    modelName: modelConfig.name,
    modelLevel,
    ratings
  };
}

/**
 * Получить финальный вывод от сильной модели
 */
export async function getFinalConclusion(
  apiClient: IApiClient,
  strongModel: ModelConfig,
  question: string,
  responses: ModelResponse[],
  comparisons: ModelComparison[],
  mapping: AnonymizationMapping[]
): Promise<FinalConclusion> {
  const prompt = createFinalConclusionPrompt(question, responses, comparisons, mapping);
  
  const messages: ChatMessage[] = [
    {
      role: 'user',
      content: prompt
    }
  ];

  const { response: apiResponse, responseTimeMs } = await apiClient.sendRequestWithTiming(
    strongModel.id,
    messages
  );

  const usage = apiClient.extractUsage(apiResponse);
  const content = apiClient.extractContent(apiResponse);
  const cost = calculateCost(usage, strongModel.pricing);

  return {
    content,
    usage,
    responseTimeMs,
    cost
  };
}
