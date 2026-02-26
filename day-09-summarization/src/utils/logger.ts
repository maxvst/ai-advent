import * as fs from 'fs';
import * as path from 'path';
import { LogLevel, LogEntry } from '../types';

// Путь к файлу логов
const LOG_FILE = path.join(process.cwd(), 'app.log');
const DEBUG_MODE = process.env.DEBUG === 'true';

/**
 * Форматирует timestamp в читаемый формат
 */
function formatTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Создает запись лога
 */
function createLogEntry(level: LogLevel, message: string): LogEntry {
  return {
    level,
    message,
    timestamp: formatTimestamp(),
  };
}

/**
 * Записывает лог в файл
 */
function writeToFile(entry: LogEntry): void {
  try {
    const logLine = `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}\n`;
    fs.appendFileSync(LOG_FILE, logLine);
  } catch (error) {
    console.error('Ошибка записи в лог-файл:', error);
  }
}

/**
 * Выводит лог в консоль с цветом
 */
function consoleLog(level: LogLevel, message: string): void {
  const timestamp = formatTimestamp();
  const coloredLevel = level.toUpperCase();

  switch (level) {
    case 'error':
      console.error(`[\x1b[31m${coloredLevel}\x1b[0m] ${message}`);
      break;
    case 'warn':
      console.warn(`[\x1b[33m${coloredLevel}\x1b[0m] ${message}`);
      break;
    case 'debug':
      if (DEBUG_MODE) {
        console.log(`[\x1b[36m${coloredLevel}\x1b[0m] ${message}`);
      }
      break;
    default:
      console.log(`[\x1b[32m${coloredLevel}\x1b[0m] ${message}`);
  }
}

/**
 * Основная функция логирования
 */
function log(level: LogLevel, message: string): void {
  const entry = createLogEntry(level, message);
  consoleLog(level, message);
  writeToFile(entry);
}

/**
 * Экспортируемый объект logger
 */
export const logger = {
  info: (message: string) => log('info', message),
  warn: (message: string) => log('warn', message),
  error: (message: string) => log('error', message),
  debug: (message: string) => log('debug', message),
};

/**
 * Очищает файл логов
 */
export function clearLogs(): void {
  try {
    if (fs.existsSync(LOG_FILE)) {
      fs.unlinkSync(LOG_FILE);
    }
  } catch (error) {
    console.error('Ошибка очистки лог-файла:', error);
  }
}
