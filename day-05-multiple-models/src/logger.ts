/**
 * Простой логгер с уровнями логирования
 */

import { ILogger } from './services/interfaces';

/**
 * Уровни логирования
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

/**
 * Настройки логгера
 */
export interface LoggerOptions {
  level?: LogLevel;
  prefix?: string;
  showTimestamp?: boolean;
}

/**
 * Приоритеты уровней логирования
 */
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4
};

/**
 * Эмодзи для уровней логирования
 */
const LEVEL_EMOJI: Record<LogLevel, string> = {
  debug: '🔍',
  info: 'ℹ️',
  warn: '⚠️',
  error: '❌',
  silent: ''
};

/**
 * Реализация логгера
 */
export class Logger implements ILogger {
  private readonly level: LogLevel;
  private readonly prefix: string;
  private readonly showTimestamp: boolean;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? this.getDefaultLevel();
    this.prefix = options.prefix ?? '';
    this.showTimestamp = options.showTimestamp ?? false;
  }

  /**
   * Определить уровень логирования по умолчанию
   */
  private getDefaultLevel(): LogLevel {
    const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel;
    if (envLevel && LOG_LEVELS[envLevel] !== undefined) {
      return envLevel;
    }
    return 'info';
  }

  /**
   * Проверить, нужно ли выводить сообщение данного уровня
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  /**
   * Форматировать сообщение
   */
  private formatMessage(level: LogLevel, message: string): string {
    const parts: string[] = [];

    if (this.showTimestamp) {
      parts.push(`[${new Date().toISOString()}]`);
    }

    parts.push(LEVEL_EMOJI[level]);

    if (this.prefix) {
      parts.push(`[${this.prefix}]`);
    }

    parts.push(message);

    return parts.join(' ');
  }

  /**
   * Вывести отладочное сообщение
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message), ...args);
    }
  }

  /**
   * Вывести информационное сообщение
   */
  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message), ...args);
    }
  }

  /**
   * Вывести предупреждение
   */
  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message), ...args);
    }
  }

  /**
   * Вывести ошибку
   */
  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message), ...args);
    }
  }

  /**
   * Создать дочерний логгер с префиксом
   */
  child(prefix: string): Logger {
    return new Logger({
      level: this.level,
      prefix: this.prefix ? `${this.prefix}:${prefix}` : prefix,
      showTimestamp: this.showTimestamp
    });
  }
}

/**
 * Глобальный экземпляр логгера
 */
let globalLogger: Logger | null = null;

/**
 * Получить глобальный логгер
 */
export function getLogger(options?: LoggerOptions): Logger {
  if (!globalLogger) {
    globalLogger = new Logger(options);
  }
  return globalLogger;
}

/**
 * Установить глобальный логгер
 */
export function setLogger(logger: Logger): void {
  globalLogger = logger;
}

/**
 * Создать логгер с настройками по умолчанию
 */
export function createLogger(options?: LoggerOptions): ILogger {
  return new Logger(options);
}
