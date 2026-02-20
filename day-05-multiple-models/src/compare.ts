/**
 * Модуль для сравнения качества ответов моделей
 */

import { 
  ModelConfig, 
  ModelResponse, 
  ModelComparison, 
  ModelLevel,
  AnonymizedResponse,
  ChatMessage,
  FinalConclusion
} from './types';
import { ApiClient } from './api';
import { calculateCost } from './metrics';
import { createComparisonPrompt, createFinalConclusionPrompt } from './prompts';

/**
 * Получить ответ от модели
 */
export async function getModelResponse(
  apiClient: ApiClient,
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
 * Получить сравнение от модели (анонимное)
 */
export async function getModelComparison(
  apiClient: ApiClient,
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

  return {
    modelId: modelConfig.id,
    modelName: modelConfig.name,
    modelLevel,
    responseNumber: 0,
    rating: {
      score: 0,
      analysis: content
    }
  };
}

/**
 * Получить финальный вывод от сильной модели
 */
export async function getFinalConclusion(
  apiClient: ApiClient,
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
