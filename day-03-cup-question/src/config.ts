import * as fs from 'fs';
import * as path from 'path';
import { Config } from './types';

/**
 * Загружает конфигурацию из config.json
 */
export function loadConfig(): Config {
  const configPath = path.resolve(__dirname, '../config.json');
  
  if (!fs.existsSync(configPath)) {
    throw new Error(
      `Конфигурационный файл не найден: ${configPath}\n` +
      `Создайте config.json на основе примера.`
    );
  }
  
  const configContent = fs.readFileSync(configPath, 'utf-8');
  const config: Config = JSON.parse(configContent);
  
  // Валидация конфигурации
  if (!config.openai?.apiKey) {
    throw new Error('OpenAI API ключ не указан в config.json');
  }
  
  if (config.openai.apiKey === 'YOUR_OPENAI_API_KEY_HERE') {
    throw new Error(
      'Пожалуйста, укажите ваш реальный OpenAI API ключ в config.json'
    );
  }
  
  if (!config.openai?.model) {
    throw new Error('Модель OpenAI не указана в config.json');
  }
  
  if (!config.task?.description) {
    throw new Error('Описание задачи не указано в config.json');
  }
  
  return config;
}
