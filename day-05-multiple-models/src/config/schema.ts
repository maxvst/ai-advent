/**
 * Zod-схемы для валидации конфигурации
 */

import { z } from 'zod';

/**
 * Схема для цен модели
 */
export const PricingSchema = z.object({
  input: z.number().min(0, 'Цена input должна быть неотрицательной'),
  output: z.number().min(0, 'Цена output должна быть неотрицательной')
});

/**
 * Схема для конфигурации модели
 */
export const ModelConfigSchema = z.object({
  id: z.string().min(1, 'ID модели не может быть пустым'),
  name: z.string().min(1, 'Имя модели не может быть пустым'),
  pricing: PricingSchema
});

/**
 * Схема для конфигурации OpenRouter
 */
export const OpenRouterConfigSchema = z.object({
  baseUrl: z.string().url('baseUrl должен быть валидным URL'),
  apiKey: z.string().min(1, 'API ключ не может быть пустым')
});

/**
 * Схема для полной конфигурации
 */
export const ConfigSchema = z.object({
  openRouter: OpenRouterConfigSchema,
  models: z.object({
    strong: ModelConfigSchema,
    medium: ModelConfigSchema,
    weak: ModelConfigSchema
  }),
  question: z.string().min(1, 'Вопрос не может быть пустым'),
  outputDir: z.string().min(1, 'outputDir не может быть пустым')
});

/**
 * Типы, выводимые из схем
 */
export type PricingInput = z.input<typeof PricingSchema>;
export type ModelConfigInput = z.input<typeof ModelConfigSchema>;
export type OpenRouterConfigInput = z.input<typeof OpenRouterConfigSchema>;
export type ConfigInput = z.input<typeof ConfigSchema>;

/**
 * Результат валидации
 */
export interface ValidationResult {
  success: boolean;
  errors: Array<{ field: string; message: string }>;
}

/**
 * Валидировать конфигурацию с детальными ошибками
 */
export function validateConfig(config: unknown): ValidationResult {
  const result = ConfigSchema.safeParse(config);
  
  if (result.success) {
    return { success: true, errors: [] };
  }
  
  const errors = result.error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message
  }));
  
  return { success: false, errors };
}

/**
 * Валидировать и вернуть конфигурацию или выбросить ошибку
 */
export function parseConfig(config: unknown): z.infer<typeof ConfigSchema> {
  return ConfigSchema.parse(config);
}

/**
 * Валидировать частичную конфигурацию (для env variables)
 */
export function validatePartialConfig(config: unknown): ValidationResult {
  const PartialConfigSchema = ConfigSchema.partial();
  const result = PartialConfigSchema.safeParse(config);
  
  if (result.success) {
    return { success: true, errors: [] };
  }
  
  const errors = result.error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message
  }));
  
  return { success: false, errors };
}
