import * as fs from 'fs';
import * as path from 'path';
import { ChatMessage, SummaryData, HistoryError, TokenUsage } from '../types';
import { OpenAIClient } from '../api';
import { logger } from '../utils/logger';

const SUMMARY_FILE = 'chat-summary.json';
const SUMMARY_BATCH_SIZE = 20; // Количество сообщений для накопления перед генерацией саммари

/**
 * Загружает саммари из файла
 */
export function loadSummary(summaryPath?: string): SummaryData | null {
  const filePath = summaryPath || path.join(process.cwd(), SUMMARY_FILE);
  
  logger.debug(`Загрузка саммари из: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    logger.info('Файл саммари не найден');
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content) as SummaryData;
    logger.info(`Саммари загружено: ${data.originalMessageCount} сообщений`);
    return data;
  } catch (error) {
    logger.error(`Ошибка загрузки саммари: ${error}`);
    return null;
  }
}

/**
 * Сохраняет саммари в файл
 */
export function saveSummary(summaryData: SummaryData, summaryPath?: string): void {
  const filePath = summaryPath || path.join(process.cwd(), SUMMARY_FILE);
  
  logger.debug(`Сохранение саммари в: ${filePath}`);

  try {
    const content = JSON.stringify(summaryData, null, 2);
    fs.writeFileSync(filePath, content, 'utf-8');
    logger.info(`Саммари сохранено: ${summaryData.originalMessageCount} сообщений`);
  } catch (error) {
    logger.error(`Ошибка сохранения саммари: ${error}`);
    throw new HistoryError(`Не удалось сохранить саммари: ${error}`);
  }
}

/**
 * Очищает файл саммари
 */
export function clearSummary(summaryPath?: string): void {
  const filePath = summaryPath || path.join(process.cwd(), SUMMARY_FILE);
  
  logger.info('Очистка саммари');

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info('Файл саммари удален');
    }
  } catch (error) {
    logger.error(`Ошибка очистки саммари: ${error}`);
    throw new HistoryError(`Не удалось очистить саммари: ${error}`);
  }
}

/**
 * Проверяет, нужно ли генерировать саммари
 * Саммари генерируется, когда накапливается 10 сообщений сверх последних N
 */
export function needsSummaryGeneration(
  totalMessageCount: number,
  recentMessagesCount: number
): boolean {
  const messagesBeyondRecent = totalMessageCount - recentMessagesCount;
  // Проверяем, достаточно ли накопилось сообщений (минимум 10 сверх N)
  return messagesBeyondRecent >= SUMMARY_BATCH_SIZE;
}

/**
 * Генерирует саммари из списка сообщений
 */
export async function generateSummary(
  messages: ChatMessage[],
  client: OpenAIClient,
  onSummaryStart?: () => void
): Promise<[string, TokenUsage]> {
  logger.info(`Генерация саммари из ${messages.length} сообщений`);
  
  if (onSummaryStart) {
    onSummaryStart();
  }

  const prompt = `Проанализируй следующий блок сообщений из чата и создай краткое саммари, содержащее наиболее существенные факты и ключевые моменты из переписки. 

Требования к саммари:
1. Включи основные темы и вопросы, обсуждаемые в сообщениях
2. Сохрани важные факты и детали
3. Укажи, какие запросы были выполнены или остались невыполненными
4. Если есть код или технические детали - сохрани их кратко
5. Используй форматирование для лучшей читаемости

Сообщения:
${messages.map((m, i) => `${i + 1}. [${m.role}]: ${m.content}`).join('\n\n')}

Напиши саммари на русском языке:`;

  const summaryMessages: ChatMessage[] = [
    { role: 'user', content: prompt, timestamp: new Date().toISOString() }
  ];

  const [summary, tokenUsage] = await client.sendMessage(summaryMessages);
  
  logger.info(`Саммари сгенерировано: ${tokenUsage.totalTokens} токенов`);

  return [summary, tokenUsage];
}

/**
 * Объединяет текущее саммари с новым блоком сообщений
 */
export async function mergeSummaryWithNewMessages(
  currentSummary: string,
  newMessages: ChatMessage[],
  client: OpenAIClient,
  onSummaryStart?: () => void
): Promise<[string, TokenUsage]> {
  logger.info(`Объединение саммари с ${newMessages.length} новыми сообщениями`);
  
  if (onSummaryStart) {
    onSummaryStart();
  }

  const prompt = `Текущее саммари разговора:
${currentSummary}

Новые сообщения для добавления:
${newMessages.map((m, i) => `${i + 1}. [${m.role}]: ${m.content}`).join('\n\n')}

Обнови саммари, добавив информацию из новых сообщений. Сохрани все важные факты из предыдущего саммари и дополни их новой информацией. 

Требования:
1. Сохрани ключевые факты из предыдущего саммари
2. Добавь новые темы и факты из новых сообщений
3. Если какие-то вопросы были решены - укажи это
4. Используй форматирование для лучшей читаемости

Напиши обновленное саммари на русском языке:`;

  const mergeMessages: ChatMessage[] = [
    { role: 'user', content: prompt, timestamp: new Date().toISOString() }
  ];

  const [mergedSummary, tokenUsage] = await client.sendMessage(mergeMessages);
  
  logger.info(`Саммари обновлено: ${tokenUsage.totalTokens} токенов`);

  return [mergedSummary, tokenUsage];
}

/**
 * Обрабатывает сообщения и при необходимости генерирует/обновляет саммари
 * Возвращает обновленные данные саммари и информацию о потраченных токенах
 */
export async function processMessagesForSummary(
  recentMessages: ChatMessage[],
  allMessages: ChatMessage[],
  currentSummary: string | null,
  client: OpenAIClient,
  recentMessagesCount: number,
  onSummaryStart?: () => void
): Promise<{ summary: string; needsUpdate: boolean; summaryTokenUsage?: TokenUsage }> {
  const totalMessageCount = allMessages.length;
  
  // Проверяем, нужно ли генерировать саммари
  if (!needsSummaryGeneration(totalMessageCount, recentMessagesCount)) {
    return { summary: currentSummary || '', needsUpdate: false };
  }

  // Вычисляем сколько сообщений уже саммаризировано
  // При первом саммари: 0, при последующих: originalMessageCount из сохранённого саммари
  const messagesBeyondRecent = totalMessageCount - recentMessagesCount;
  
  // Находим начало нового блока сообщений для добавления в саммари
  // Мы должны добавить только новые сообщения, которых ещё нет в саммари
  let messagesToAdd: ChatMessage[];
  
  if (currentSummary && currentSummary.length > 0) {
    // При обновлении: находим сообщения, которые ещё не были добавлены в саммари
    // Это последние messagesBeyondRecent сообщений (которые ещё не саммаризированы)
    const startIndex = Math.max(0, totalMessageCount - recentMessagesCount - SUMMARY_BATCH_SIZE);
    messagesToAdd = allMessages.slice(startIndex, totalMessageCount - recentMessagesCount);
  } else {
    // При первом саммари: берём все сообщения кроме последних N
    messagesToAdd = allMessages.slice(0, totalMessageCount - recentMessagesCount);
  }
  
  let newSummary: string;
  let summaryTokenUsage: TokenUsage | undefined;

  if (currentSummary && currentSummary.length > 0 && messagesToAdd.length > 0) {
    // Объединяем текущее саммари с новым блоком
    [newSummary, summaryTokenUsage] = await mergeSummaryWithNewMessages(
      currentSummary,
      messagesToAdd,
      client,
      onSummaryStart
    );
  } else {
    // Генерируем первое саммари
    [newSummary, summaryTokenUsage] = await generateSummary(
      messagesToAdd,
      client,
      onSummaryStart
    );
  }

  return { summary: newSummary, needsUpdate: true, summaryTokenUsage };
}

/**
 * Формирует контекст для LLM из саммари и всех сообщений истории
 * Включает все сообщения, которые ещё не были саммаризированы
 */
export function buildContextWithSummary(
  allMessages: ChatMessage[],
  summary: string | null,
  recentMessagesCount: number = 10
): ChatMessage[] {
  const context: ChatMessage[] = [];

  // Формируем system prompt с саммари (если есть)
  const systemContent = `Ты - электронный дневник. Фиксируй утверждения и отвечай на вопросы основываясь исключительно на данных из данного диалога. Если в сообщении нет вопроса, отвечай максимально коротко.`
    + ((summary && summary.length > 0) ? ` Это краткое саммари предыдущей части разговора:\n\n${summary}\n\nИспользуй эту информацию как контекст для ответа на текущие сообщения.`
                                      : ` Запоминай все сообщения для дальнейшего контекста.`);

  context.push({
    role: 'system',
    content: systemContent,
    timestamp: new Date().toISOString()
  });

  // Добавляем все сообщения из истории
  // При наличии саммари добавляем только последние N сообщений (саммари уже содержит информацию о старых)
  // При отсутствии саммари добавляем все сообщения
  if (summary && summary.length > 0) {
    // Если есть саммари, добавляем только последние сообщения
    const recentMessages = allMessages.slice(-recentMessagesCount);
    context.push(...recentMessages);
  } else {
    // Если нет саммари, добавляем все сообщения
    context.push(...allMessages);
  }

  return context;
}
