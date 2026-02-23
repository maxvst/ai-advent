import { createInterface, Interface } from 'readline';
import { ConfigLoader } from './config/index.js';
import { LLMAgent } from './agent/index.js';

class CLIChat {
  private rl: Interface;
  private agent: LLMAgent;
  private isRunning: boolean = true;

  constructor() {
    const configLoader = new ConfigLoader();
    this.agent = new LLMAgent(configLoader.getConfig());

    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    this.rl.on('close', () => {
      this.handleExit();
    });
  }

  async start(): Promise<void> {
    console.log('=== Simple CLI LLM Agent ===');
    console.log('Type your messages and press Enter to send.');
    console.log('Type /exit to quit.\n');

    await this.chatLoop();
  }

  private async chatLoop(): Promise<void> {
    while (this.isRunning) {
      const input = await this.promptUser();
      
      if (input === null) {
        break;
      }

      const trimmedInput = input.trim();

      if (trimmedInput === '') {
        continue;
      }

      if (trimmedInput === '/exit') {
        this.handleExit();
        break;
      }

      if (trimmedInput === '/clear') {
        this.agent.clearHistory();
        console.log('History cleared.\n');
        continue;
      }

      if (trimmedInput === '/history') {
        this.showHistory();
        continue;
      }

      try {
        console.log('Thinking...\n');
        const response = await this.agent.sendMessage(trimmedInput);
        console.log(`Assistant: ${response}\n`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error: ${errorMessage}\n`);
      }
    }
  }

  private promptUser(): Promise<string | null> {
    return new Promise((resolve) => {
      this.rl.question('You: ', (answer: string) => {
        resolve(answer);
      });
    });
  }

  private handleExit(): void {
    if (this.isRunning) {
      this.isRunning = false;
      console.log('\nGoodbye!');
      this.rl.close();
      process.exit(0);
    }
  }

  private showHistory(): void {
    const history = this.agent.getHistory();
    console.log('\n=== Conversation History ===');
    if (history.length === 0) {
      console.log('(empty)\n');
      return;
    }
    for (const msg of history) {
      console.log(`[${msg.role}]: ${msg.content}`);
    }
    console.log('============================\n');
  }
}

async function main(): Promise<void> {
  try {
    const chat = new CLIChat();
    await chat.start();
  } catch (error) {
    console.error('Failed to start the application:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
