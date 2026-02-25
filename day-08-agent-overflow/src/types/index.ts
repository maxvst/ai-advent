// Типы сообщений для чата
export type MessageRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: MessageRole;
  content: string;
  timestamp: string;
}

export interface ChatHistory {
  messages: ChatMessage[];
}

// Типы конфигурации
export interface AppConfig {
  apiBaseUrl: string;
  model: string;
  apiKey: string;
  temperature?: number;
}

export interface ConfigFile {
  apiBaseUrl: string;
  model: string;
  apiKey: string;
  temperature?: number;
}

// Типы ошибок
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export class HistoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HistoryError';
  }
}

export class APIError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'APIError';
  }
}

export class RateLimitError extends APIError {
  constructor(message: string, public retryAfter?: number) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class NetworkError extends APIError {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

// Типы для CLI
export interface CLICommand {
  name: string;
  description: string;
  execute: (args?: string[]) => void | Promise<void>;
}

export interface CLIState {
  isRunning: boolean;
  isLoading: boolean;
}

// Типы для логирования
export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
}

// Типы для трекинга токенов
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface TokenStats {
  lastRequestTokens: number;   // Токены последнего запроса
  lastResponseTokens: number;  // Токены последнего ответа
  totalInputTokens: number;    // Общее количество input-токенов всей истории
  totalOutputTokens: number;   // Общее количество output-токенов всей истории
}
