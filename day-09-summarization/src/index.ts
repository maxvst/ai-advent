import { loadConfig } from './config';
import { loadHistory, saveHistory } from './history';
import { createOpenAIClient } from './api';
import { runCLI } from './cli';
import { logger } from './utils/logger';
import { ConfigError } from './types';

/**
 * Обрабатывает сигналы завершения процесса
 */
function setupSignalHandlers(): void {
  // Обработка SIGINT (Ctrl+C)
  process.on('SIGINT', () => {
    logger.info('Получен сигнал SIGINT (Ctrl+C)');
    saveHistoryBeforeExit();
    process.exit(0);
  });

  // Обработка SIGTERM
  process.on('SIGTERM', () => {
    logger.info('Получен сигнал SIGTERM');
    saveHistoryBeforeExit();
    process.exit(0);
  });

  // Обработка необработанных ошибок
  process.on('uncaughtException', (error) => {
    logger.error(`Необработанная ошибка: ${error.message}`);
    saveHistoryBeforeExit();
    process.exit(1);
  });

  // Обработка необработанных отклонений промисов
  process.on('unhandledRejection', (reason) => {
    logger.error(`Необработанное отклонение промиса: ${reason}`);
  });
}

/**
 * Сохраняет историю перед выходом
 */
let historyToSave: any = null;

export function setHistoryForSaving(history: any): void {
  historyToSave = history;
}

function saveHistoryBeforeExit(): void {
  if (historyToSave) {
    try {
      saveHistory(historyToSave);
      logger.info('История сохранена перед выходом');
    } catch (error) {
      logger.error(`Ошибка сохранения истории: ${error}`);
    }
  }
}

/**
 * Главная функция приложения
 */
async function main(): Promise<void> {
  logger.info('=== Запуск CLI Agent ===');

  try {
    // Загрузка конфигурации
    logger.info('Загрузка конфигурации...');
    const config = loadConfig();
    logger.info(`Используемая модель: ${config.model}`);

    // Загрузка истории сообщений
    logger.info('Загрузка истории сообщений...');
    const history = loadHistory();
    logger.info(`Загружено сообщений: ${history.messages.length}`);

    // Создание клиента OpenAI
    logger.info('Создание клиента OpenAI...');
    const client = createOpenAIClient(config);

    // Установка истории для сохранения при выходе
    setHistoryForSaving(history);

    // Запуск CLI
    logger.info('Запуск CLI...');
    await runCLI(client, history, config);

    logger.info('=== CLI Agent завершен ===');
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(`\n❌ Ошибка конфигурации: ${error.message}`);
    } else {
      console.error(`\n❌ Критическая ошибка: ${error}`);
      logger.error(`Критическая ошибка: ${error}`);
    }
    process.exit(1);
  }
}

// Запуск приложения
setupSignalHandlers();
main();
