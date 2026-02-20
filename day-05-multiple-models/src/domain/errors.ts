/**
 * Кастомные классы ошибок для программы сравнения LLM моделей
 */

/**
 * Базовый класс для ошибок приложения
 */
export abstract class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/**
 * Ошибка при работе с моделью
 */
export class ModelError extends AppError {
  constructor(
    public readonly modelId: string,
    public readonly modelName: string,
    message: string
  ) {
    super(`[${modelName}] ${message}`);
  }
}

/**
 * Ошибка при API запросе
 */
export class ApiError extends AppError {
  constructor(
    public readonly statusCode: number | undefined,
    message: string,
    public readonly modelId?: string
  ) {
    const statusInfo = statusCode ? ` (HTTP ${statusCode})` : '';
    super(`API Error${statusInfo}: ${message}`);
  }
}

/**
 * Ошибка конфигурации
 */
export class ConfigError extends AppError {
  constructor(message: string, public readonly field?: string) {
    const fieldInfo = field ? ` (поле: ${field})` : '';
    super(`Configuration Error${fieldInfo}: ${message}`);
  }
}

/**
 * Ошибка при парсинге ответа модели
 */
export class ParseError extends AppError {
  constructor(
    message: string,
    public readonly rawContent?: string
  ) {
    super(`Parse Error: ${message}`);
  }
}

/**
 * Ошибка валидации данных
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly errors: Array<{ field: string; message: string }> = []
  ) {
    super(`Validation Error: ${message}`);
  }
}

/**
 * Проверить, является ли ошибка экземпляром AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Проверить, является ли ошибка сетевой ошибкой
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('econnrefused') ||
      message.includes('enotfound') ||
      message.includes('timeout') ||
      message.includes('etimedout')
    );
  }
  return false;
}

/**
 * Проверить, является ли ошибка ошибкой авторизации
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.statusCode === 401 || error.statusCode === 403;
  }
  return false;
}
