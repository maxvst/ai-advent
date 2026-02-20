/**
 * Модуль для загрузки и валидации конфигурации
 */

import * as fs from 'fs';
import * as path from 'path';
import { Config } from './types';

/**
 * Загрузить конфигурацию из файла
 */
export function loadConfig(configPath?: string): Config {
  const resolvedPath = configPath || path.resolve(__dirname, '../config.json');
  
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Конфигурационный файл не найден: ${resolvedPath}`);
  }
  
  const configContent = fs.readFileSync(resolvedPath, 'utf-8');
  const config: Config = JSON.parse(configContent);
  
  validateConfig(config);
  
  return config;
}

/**
 * Валидация конфигурации
 */
function validateConfig(config: Config): void {
  // Проверяем API ключ
  if (!config.openRouter.apiKey || config.openRouter.apiKey === 'YOUR_API_KEY_HERE') {
    throw new Error('API ключ не настроен. Укажите apiKey в config.json');
  }
  
  // Проверяем baseUrl
  if (!config.openRouter.baseUrl) {
    throw new Error('baseUrl не указан в конфигурации');
  }
  
  // Проверяем модели
  const models = ['strong', 'medium', 'weak'] as const;
  for (const level of models) {
    const model = config.models[level];
    if (!model.id) {
      throw new Error(`ID модели не указан для ${level} модели`);
    }
    if (!model.name) {
      throw new Error(`Имя модели не указано для ${level} модели`);
    }
    if (typeof model.pricing.input !== 'number' || typeof model.pricing.output !== 'number') {
      throw new Error(`Цены должны быть числами для ${level} модели`);
    }
  }
  
  // Проверяем вопрос
  if (!config.question || config.question.trim().length === 0) {
    throw new Error('Вопрос не может быть пустым');
  }
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
