import * as readline from 'readline';
import chalk from 'chalk';
import { ChatHistory, ChatMessage, MessageRole, CLICommand, CLIState, APIError, RateLimitError, NetworkError, TokenStats, AppConfig } from '../types';
import { logger } from '../utils/logger';
import { OpenAIClient } from '../api';
import { saveHistory, addMessage, clearHistory, getRecentMessages } from '../history';
import { loadSummary, saveSummary, clearSummary, processMessagesForSummary, buildContextWithSummary } from '../summarizer';

/**
 * Интерфейс CLI для взаимодействия с пользователем
 */
export class CLI {
  private rl: readline.Interface;
  private state: CLIState;
  private client: OpenAIClient;
  private history: ChatHistory;
  private tokenStats: TokenStats;
  private onExit: () => void;
  private onClear: () => void;
  private config: AppConfig;
  private summary: string | null;
  private isGeneratingSummary: boolean = false;

  constructor(
    client: OpenAIClient,
    history: ChatHistory,
    config: AppConfig,
    onExit: () => void,
    onClear: () => void
  ) {
    this.client = client;
    this.history = history;
    this.config = config;
    this.summary = null;
    this.tokenStats = {
      lastRequestTokens: 0,
      lastResponseTokens: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
    };
    this.onExit = onExit;
    this.onClear = onClear;
    this.state = {
      isRunning: true,
      isLoading: false,
    };

    // Создаем интерфейс для чтения ввода
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Обработка Ctrl+C
    this.rl.on('close', () => {
      if (this.state.isRunning) {
        this.handleExit();
      }
    });
  }

  /**
   * Уведомление о начале генерации саммари
   */
  private notifySummaryStart(): void {
    console.log(chalk.yellow('\n📝 Генерация саммари предыдущих сообщений...'));
  }

  /**
   * Запускает CLI-интерфейс
   */
  async start(): Promise<void> {
    this.printWelcome();
    this.printHelp();
    
    // Загружаем историю, если она есть
    if (this.history.messages.length > 0) {
      this.printHistoryLoaded();
    }

    // Загружаем саммари, если оно есть
    const recentMessagesCount = this.config.recentMessagesCount ?? 3;
    const summaryData = loadSummary();
    this.summary = summaryData?.summary ?? null;
    if (this.summary) {
      console.log(chalk.gray(`Загружено саммари: ${this.history.messages.length - recentMessagesCount} сообщений summarized\n`));
    }

    await this.prompt();
  }

  /**
   * Выводит приветственное сообщение
   */
  private printWelcome(): void {
    console.log(chalk.cyan.bold('\n╔════════════════════════════════════════╗'));
    console.log(chalk.cyan.bold('║     CLI Agent - OpenAI Chat            ║'));
    console.log(chalk.cyan.bold('╚════════════════════════════════════════╝\n'));
    console.log(chalk.green(`Модель: ${this.client.getConfig().model}`));
    console.log(chalk.gray('Введите ваше сообщение или команду\n'));
  }

  /**
   * Выводит информацию о загруженной истории
   */
  private printHistoryLoaded(): void {
    console.log(chalk.gray(`Загружено сообщений из истории: ${this.history.messages.length}\n`));
  }

  /**
   * Выводит справку по командам
   */
  printHelp(): void {
    console.log(chalk.yellow.bold('Доступные команды:'));
    console.log(chalk.cyan('  /help') + chalk.gray('    - Показать эту справку'));
    console.log(chalk.cyan('  /clear') + chalk.gray('  - Очистить историю чата'));
    console.log(chalk.cyan('  /exit') + chalk.gray('   - Выйти из программы'));
    console.log(chalk.cyan('  /quit') + chalk.gray('   - Выйти из программы'));
    console.log('');
  }

  /**
   * Обрабатывает ввод пользователя
   */
  private async prompt(): Promise<void> {
    if (!this.state.isRunning) return;

    this.rl.question(chalk.green('\n> '), async (input) => {
      const trimmedInput = input.trim();

      if (!trimmedInput) {
        await this.prompt();
        return;
      }

      // Обработка команд
      if (trimmedInput.startsWith('/')) {
        await this.handleCommand(trimmedInput);
      } else {
        await this.handleMessage(trimmedInput);
      }

      // Продолжаем цикл, если программа все еще запущена
      if (this.state.isRunning) {
        await this.prompt();
      }
    });
  }

  /**
   * Обрабатывает команды
   */
  private async handleCommand(input: string): Promise<void> {
    const parts = input.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (command) {
      case '/help':
        this.printHelp();
        break;

      case '/clear':
        this.handleClear();
        break;

      case '/exit':
      case '/quit':
        this.handleExit();
        break;

      default:
        console.log(chalk.red(`Неизвестная команда: ${command}`));
        console.log(chalk.gray('Введите /help для списка доступных команд'));
    }
  }

  /**
   * Обрабатывает сообщение пользователя
   */
  private async handleMessage(content: string): Promise<void> {
    try {
      this.state.isLoading = true;
      this.printLoading();

      // Добавляем сообщение пользователя в историю
      this.history = addMessage(this.history, 'user', content);
      
      // Получаем все сообщения из истории (включая те, которые ещё не саммаризированы)
      // Это гарантирует, что весь контекст передаётся в LLM
      const allMessages = this.history.messages;
      
      // Количество последних сообщений для включения в контекст при наличии саммари
      const recentMessagesCount = this.config.recentMessagesCount ?? 10;
      
      // Формируем контекст - передаём все сообщения, чтобы LLM видел полную историю
      // При наличии саммари - последние N сообщений, при отсутствии - все сообщения
      const contextMessages = buildContextWithSummary(allMessages, this.summary, recentMessagesCount);

      // Отправляем сообщение и получаем ответ вместе с информацией о токенах
      const [response, tokenUsage] = await this.client.sendMessage(contextMessages);

      // Обновляем статистику токенов
      this.tokenStats.lastRequestTokens = tokenUsage.inputTokens;
      this.tokenStats.lastResponseTokens = tokenUsage.outputTokens;
      this.tokenStats.totalInputTokens += tokenUsage.inputTokens;
      this.tokenStats.totalOutputTokens += tokenUsage.outputTokens;

      // Добавляем ответ ассистента в историю
      this.history = addMessage(this.history, 'assistant', response);

      // Проверяем, нужно ли генерировать саммари
      // Передаём последние N сообщений для определения необходимости саммаризации
      const recentMessages = getRecentMessages(this.history, recentMessagesCount);
      
      const result = await processMessagesForSummary(
        recentMessages,
        this.history.messages,
        this.summary,
        this.client,
        recentMessagesCount,
        () => this.notifySummaryStart()
      );

      if (result.needsUpdate) {
        this.summary = result.summary;
        // Сохраняем обновленное саммари
        saveSummary({
          summary: result.summary,
          originalMessageCount: this.history.messages.length,
          lastUpdated: new Date().toISOString()
        });
        console.log(chalk.green('\n✅ Саммари обновлено и сохранено'));
        
        // Добавляем токены саммаризации в общие счетчики
        if (result.summaryTokenUsage) {
          this.tokenStats.totalInputTokens += result.summaryTokenUsage.inputTokens;
          this.tokenStats.totalOutputTokens += result.summaryTokenUsage.outputTokens;
        }
        
        // Обрезаем историю - оставляем только последние N сообщений
        // после саммаризации старые сообщения больше не нужны в полном виде
        this.history = {
          messages: getRecentMessages(this.history, recentMessagesCount)
        };
        console.log(chalk.gray(`История обрезана до последних ${recentMessagesCount} сообщений`));
      }

      // Сохраняем историю
      saveHistory(this.history);

      // Выводим ответ
      this.printResponse(response);

      // Выводим информацию о токенах
      this.printTokenInfo();
    } catch (error) {
      this.handleError(error);
    } finally {
      this.state.isLoading = false;
    }
  }

  /**
   * Обрабатывает ошибки
   */
  private handleError(error: unknown): void {
    if (error instanceof RateLimitError) {
      console.log(chalk.red(`\n⚠️  ${error.message}`));
      if (error.retryAfter) {
        console.log(chalk.yellow(`Пожалуйста, подождите ${error.retryAfter} секунд`));
      }
    } else if (error instanceof NetworkError) {
      console.log(chalk.red(`\n⚠️  Ошибка сети: ${error.message}`));
    } else if (error instanceof APIError) {
      console.log(chalk.red(`\n⚠️  Ошибка API: ${error.message}`));
    } else {
      console.log(chalk.red(`\n⚠️  Произошла ошибка: ${error}`));
    }
  }

  /**
   * Выводит индикатор загрузки
   */
  private printLoading(): void {
    process.stdout.write(chalk.yellow('  ⏳ Думаю...\r'));
  }

  /**
   * Выводит ответ ассистента
   */
  private printResponse(response: string): void {
    // Очищаем строку загрузки
    process.stdout.write('                \r');
    
    console.log(chalk.cyan.bold('\n🤖 Ответ:'));
    console.log(chalk.white(response));
  }

  /**
   * Выводит информацию о потраченных токенах
   */
  private printTokenInfo(): void {
    console.log(chalk.gray('\n┌─ Токены ──────────────────────────────┐'));
    console.log(chalk.gray('│ ') + chalk.yellow(`Input токены запроса:  ${this.tokenStats.lastRequestTokens}`) + chalk.gray('             │'));
    console.log(chalk.gray('│ ') + chalk.yellow(`Output токены ответа: ${this.tokenStats.lastResponseTokens}`) + chalk.gray('             │'));
    console.log(chalk.gray('│ ') + chalk.cyan(`Всего input токенов:   ${this.tokenStats.totalInputTokens}`) + chalk.gray('             │'));
    console.log(chalk.gray('│ ') + chalk.cyan(`Всего output токенов:  ${this.tokenStats.totalOutputTokens}`) + chalk.gray('             │'));
    console.log(chalk.gray('└────────────────────────────────────────┘'));
  }

  /**
   * Обработка команды /clear
   */
  private handleClear(): void {
    clearHistory();
    clearSummary();
    this.history = { messages: [] };
    this.summary = null;
    // Сбрасываем статистику токенов при очистке истории
    this.tokenStats = {
      lastRequestTokens: 0,
      lastResponseTokens: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
    };
    console.log(chalk.green('\n✅ История чата и саммари очищены'));
    this.onClear();
  }

  /**
   * Обработка команды выхода
   */
  private handleExit(): void {
    if (this.state.isRunning) {
      console.log(chalk.yellow('\n👋 До свидания!'));
      this.state.isRunning = false;
      this.rl.close();
      
      // Сохраняем историю перед выходом
      saveHistory(this.history);
      
      this.onExit();
    }
  }

  /**
   * Останавливает CLI
   */
  stop(): void {
    this.state.isRunning = false;
    this.rl.close();
  }
}

/**
 * Создает и запускает CLI
 */
export async function runCLI(
  client: OpenAIClient,
  history: ChatHistory,
  config: AppConfig
): Promise<void> {
  return new Promise((resolve) => {
    const cli = new CLI(
      client,
      history,
      config,
      () => resolve(),  // onExit
      () => {}          // onClear
    );
    cli.start();
  });
}
