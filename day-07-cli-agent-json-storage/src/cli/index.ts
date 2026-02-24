import * as readline from 'readline';
import chalk from 'chalk';
import { ChatHistory, ChatMessage, MessageRole, CLICommand, CLIState, APIError, RateLimitError, NetworkError } from '../types';
import { logger } from '../utils/logger';
import { OpenAIClient } from '../api';
import { saveHistory, addMessage, clearHistory } from '../history';

/**
 * Интерфейс CLI для взаимодействия с пользователем
 */
export class CLI {
  private rl: readline.Interface;
  private state: CLIState;
  private client: OpenAIClient;
  private history: ChatHistory;
  private onExit: () => void;
  private onClear: () => void;

  constructor(
    client: OpenAIClient,
    history: ChatHistory,
    onExit: () => void,
    onClear: () => void
  ) {
    this.client = client;
    this.history = history;
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
   * Запускает CLI-интерфейс
   */
  async start(): Promise<void> {
    this.printWelcome();
    this.printHelp();
    
    // Загружаем историю, если она есть
    if (this.history.messages.length > 0) {
      this.printHistoryLoaded();
    }

    await this.prompt();
  }

  /**
   * Выводит приветственное сообщение
   */
  private printWelcome(): void {
    console.log(chalk.cyan.bold('\n╔════════════════════════════════════════╗'));
    console.log(chalk.cyan.bold('║     CLI Agent - OpenAI Chat          ║'));
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
      
      // Отправляем сообщение и получаем ответ
      const response = await this.client.sendMessage(this.history.messages);

      // Добавляем ответ ассистента в историю
      this.history = addMessage(this.history, 'assistant', response);

      // Сохраняем историю
      saveHistory(this.history);

      // Выводим ответ
      this.printResponse(response);
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
   * Обработка команды /clear
   */
  private handleClear(): void {
    clearHistory();
    this.history = { messages: [] };
    console.log(chalk.green('\n✅ История чата очищена'));
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
  history: ChatHistory
): Promise<void> {
  return new Promise((resolve) => {
    const cli = new CLI(
      client,
      history,
      () => resolve(),  // onExit
      () => {}          // onClear
    );
    cli.start();
  });
}
