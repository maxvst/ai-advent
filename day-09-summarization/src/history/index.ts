import * as fs from 'fs';
import * as path from 'path';
import { ChatMessage, ChatHistory, HistoryError, MessageRole } from '../types';
import { logger } from '../utils/logger';

const HISTORY_FILE = 'chat-history.json';

/**
 * Загружает историю сообщений из файла
 */
export function loadHistory(historyPath?: string): ChatHistory {
  const filePath = historyPath || path.join(process.cwd(), HISTORY_FILE);
  
  logger.debug(`Загрузка истории из: ${filePath}`);

  // Если файл не существует, возвращаем пустую историю
  if (!fs.existsSync(filePath)) {
    logger.info('История чата не найдена, создаем новую');
    return { messages: [] };
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const history = JSON.parse(content) as ChatHistory;

    // Валидация структуры
    if (!history.messages || !Array.isArray(history.messages)) {
      logger.warn('Некорректная структура файла истории, создаем новую');
      return { messages: [] };
    }

    logger.info(`Загружено сообщений: ${history.messages.length}`);
    return history;
  } catch (error) {
    logger.error(`Ошибка загрузки истории: ${error}`);
    throw new HistoryError(`Не удалось загрузить историю: ${error}`);
  }
}

/**
 * Сохраняет историю сообщений в файл
 */
export function saveHistory(history: ChatHistory, historyPath?: string): void {
  const filePath = historyPath || path.join(process.cwd(), HISTORY_FILE);
  
  logger.debug(`Сохранение истории в: ${filePath}`);

  try {
    const content = JSON.stringify(history, null, 2);
    fs.writeFileSync(filePath, content, 'utf-8');
    logger.info(`Сохранено сообщений: ${history.messages.length}`);
  } catch (error) {
    logger.error(`Ошибка сохранения истории: ${error}`);
    throw new HistoryError(`Не удалось сохранить историю: ${error}`);
  }
}

/**
 * Очищает историю сообщений
 */
export function clearHistory(historyPath?: string): void {
  const filePath = historyPath || path.join(process.cwd(), HISTORY_FILE);
  
  logger.info('Очистка истории сообщений');

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info('Файл истории удален');
    }
  } catch (error) {
    logger.error(`Ошибка очистки истории: ${error}`);
    throw new HistoryError(`Не удалось очистить историю: ${error}`);
  }
}

/**
 * Добавляет сообщение в историю
 */
export function addMessage(
  history: ChatHistory,
  role: MessageRole,
  content: string
): ChatHistory {
  const newMessage: ChatMessage = {
    role,
    content,
    timestamp: new Date().toISOString(),
  };

  return {
    messages: [...history.messages, newMessage],
  };
}

/**
 * Создает пустую историю
 */
export function createEmptyHistory(): ChatHistory {
  return { messages: [] };
}

/**
 * Получает количество сообщений в истории
 */
export function getMessageCount(history: ChatHistory): number {
  return history.messages.length;
}

/**
 * Получает последние N сообщений из истории
 */
export function getRecentMessages(history: ChatHistory, count: number): ChatMessage[] {
  const messagesToReturn = Math.min(count, history.messages.length);
  return history.messages.slice(-messagesToReturn);
}
