/**
 * Модуль для загрузки и валидации конфигурации
 * 
 * Поддерживает:
 * - Загрузку из config.json
 * - Переопределение через environment variables
 * - Zod-валидацию
 */

import * as fs from 'fs';
import * as path from 'path';
import { Config } from '../types';
import { ConfigError } from '../domain/errors';
import { ConfigSchema, validateConfig, ValidationResult } from './schema';

// Реэкспорт схем для внешнего использования
export { ConfigSchema, validateConfig, PricingSchema, ModelConfigSchema, OpenRouterConfigSchema } from './schema';

/**
 * Environment variables для конфигурации
 */
interface EnvConfig {
  apiKey?: string;
  baseUrl?: string;
  question?: string;
  outputDir?: string;
  logLevel?: string;
}

/**
 * Получить конфигурацию из environment variables
 */
function getEnvConfig(): EnvConfig {
  return {
    apiKey: process.env.OPENROUTER_API_KEY,
    baseUrl: process.env.OPENROUTER_BASE_URL,
    question: process.env.LLM_QUESTION,
    outputDir: process.env.LLM_OUTPUT_DIR,
    logLevel: process.env.LOG_LEVEL
  };
}

/**
 * Загрузить конфигурацию из файла
 */
export function loadConfig(configPath?: string): Config {
  const resolvedPath = configPath || path.resolve(process.cwd(), 'config.json');
  
  // Загружаем файл конфигурации
  let fileConfig: Partial<Config> = {};
  
  if (fs.existsSync(resolvedPath)) {
    const configContent = fs.readFileSync(resolvedPath, 'utf-8');
    fileConfig = JSON.parse(configContent);
  }
  
  // Получаем environment variables
  const envConfig = getEnvConfig();
  
  // Объединяем конфигурации (env имеет приоритет)
  const config = mergeConfigs(fileConfig, envConfig);
  
  // Валидируем с помощью Zod
  const validation = validateConfig(config);
  
  if (!validation.success) {
    const errorMessages = validation.errors
      .map(e => `${e.field}: ${e.message}`)
      .join('; ');
    throw new ConfigError(`Ошибка валидации: ${errorMessages}`);
  }
  
  // Проверяем API ключ отдельно (для обратной совместимости)
  if (config.openRouter.apiKey === 'YOUR_API_KEY_HERE') {
    throw new ConfigError(
      'API ключ не настроен. Укажите OPENROUTER_API_KEY в .env или apiKey в config.json',
      'openRouter.apiKey'
    );
  }
  
  return config;
}

/**
 * Объединить конфигурации с приоритетом env variables
 */
function mergeConfigs(fileConfig: Partial<Config>, envConfig: EnvConfig): Config {
  // Базовая конфигурация с значениями по умолчанию
  const defaultConfig: Config = {
    openRouter: {
      baseUrl: 'https://openrouter.ai/api/v1',
      apiKey: ''
    },
    models: {
      strong: { id: '', name: '', pricing: { input: 0, output: 0 } },
      medium: { id: '', name: '', pricing: { input: 0, output: 0 } },
      weak: { id: '', name: '', pricing: { input: 0, output: 0 } }
    },
    question: '',
    outputDir: './results'
  };

  // Объединяем с файловой конфигурацией
  const merged: Config = {
    openRouter: {
      baseUrl: fileConfig.openRouter?.baseUrl ?? defaultConfig.openRouter.baseUrl,
      apiKey: fileConfig.openRouter?.apiKey ?? defaultConfig.openRouter.apiKey
    },
    models: fileConfig.models ?? defaultConfig.models,
    question: fileConfig.question ?? defaultConfig.question,
    outputDir: fileConfig.outputDir ?? defaultConfig.outputDir
  };

  // Применяем environment variables (имеют приоритет)
  if (envConfig.apiKey) {
    merged.openRouter.apiKey = envConfig.apiKey;
  }
  if (envConfig.baseUrl) {
    merged.openRouter.baseUrl = envConfig.baseUrl;
  }
  if (envConfig.question) {
    merged.question = envConfig.question;
  }
  if (envConfig.outputDir) {
    merged.outputDir = envConfig.outputDir;
  }

  return merged;
}

/**
 * Получить все модели в виде массива
 */
export function getModelsList(config: Config): Array<{
  config: typeof config.models.strong;
  level: 'strong' | 'medium' | 'weak';
}> {
  return [
    { config: config.models.strong, level: 'strong' },
    { config: config.models.medium, level: 'medium' },
    { config: config.models.weak, level: 'weak' }
  ];
}

/**
 * Создать пример .env файла
 */
export function generateEnvExample(): string {
  return `# OpenRouter API Configuration
OPENROUTER_API_KEY=your_api_key_here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Optional: Override config.json values
# LLM_QUESTION=Ваш вопрос здесь
# LLM_OUTPUT_DIR=./results

# Logging
LOG_LEVEL=info
`;
}
