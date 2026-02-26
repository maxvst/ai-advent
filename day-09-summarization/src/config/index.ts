import * as fs from 'fs';
import * as path from 'path';
import { AppConfig, ConfigFile, ConfigError } from '../types';
import { logger } from '../utils/logger';

/**
 * Загружает и валидирует конфигурацию из config.json
 */
export function loadConfig(configPath?: string): AppConfig {
  const filePath = configPath || path.join(process.cwd(), 'config.json');
  
  logger.debug(`Загрузка конфигурации из: ${filePath}`);

  // Проверка существования файла
  if (!fs.existsSync(filePath)) {
    logger.error(`Файл конфигурации не найден: ${filePath}`);
    throw new ConfigError(`Файл конфигурации не найден: ${filePath}`);
  }

  // Чтение и парсинг JSON
  let fileContent: string;
  try {
    fileContent = fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    logger.error(`Ошибка чтения файла конфигурации: ${error}`);
    throw new ConfigError(`Не удалось прочитать файл конфигурации: ${error}`);
  }

  let config: ConfigFile;
  try {
    config = JSON.parse(fileContent);
  } catch (error) {
    logger.error(`Ошибка парсинга JSON: ${error}`);
    throw new ConfigError('Некорректный формат JSON в файле конфигурации');
  }

  // Валидация обязательных полей
  const errors: string[] = [];

  if (!config.apiBaseUrl || typeof config.apiBaseUrl !== 'string') {
    errors.push('apiBaseUrl обязательное поле');
  }

  if (!config.model || typeof config.model !== 'string') {
    errors.push('model обязательное поле');
  }

  if (!config.apiKey || typeof config.apiKey !== 'string') {
    errors.push('apiKey обязательное поле');
  }

  if (config.apiKey === 'YOUR_API_KEY_HERE') {
    errors.push('apiKey не настроен - необходимо указать валидный API ключ');
  }

  if (errors.length > 0) {
    const errorMessage = 'Ошибки валидации конфигурации:\n' + errors.map(e => `  - ${e}`).join('\n');
    logger.error(errorMessage);
    throw new ConfigError(errorMessage);
  }

  logger.info('Конфигурация успешно загружена и валидирована');

  return {
    apiBaseUrl: config.apiBaseUrl,
    model: config.model,
    apiKey: config.apiKey,
    temperature: config.temperature ?? 0.7,
    recentMessagesCount: config.recentMessagesCount ?? 3,
  };
}

/**
 * Проверяет наличие обязательных полей конфигурации
 */
export function validateConfig(config: Partial<AppConfig>): string[] {
  const errors: string[] = [];

  if (!config.apiBaseUrl) {
    errors.push('apiBaseUrl обязательное поле');
  }

  if (!config.model) {
    errors.push('model обязательное поле');
  }

  if (!config.apiKey || config.apiKey === 'YOUR_API_KEY_HERE') {
    errors.push('apiKey обязательное поле');
  }

  return errors;
}
