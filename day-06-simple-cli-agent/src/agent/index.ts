import OpenAI from 'openai';
import { Config } from '../config/index.js';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class LLMAgent {
  private client: OpenAI;
  private model: string;
  private messageHistory: Message[] = [];
  private systemPrompt: string = 'You are a helpful assistant.';

  constructor(config: Config) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.apiUrl,
    });
    this.model = config.model;
  }

  setSystemPrompt(prompt: string): void {
    this.systemPrompt = prompt;
  }

  getHistory(): Message[] {
    return [...this.messageHistory];
  }

  clearHistory(): void {
    this.messageHistory = [];
  }

  async sendMessage(userMessage: string): Promise<string> {
    const userMsg: Message = { role: 'user', content: userMessage };
    this.messageHistory.push(userMsg);

    const messages = this.buildMessages();

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
        temperature: 0.7,
        max_tokens: 2048,
      });

      const assistantMessage = completion.choices[0]?.message;

      if (!assistantMessage?.content) {
        throw new Error('No response from assistant');
      }

      const assistantMsg: Message = {
        role: 'assistant',
        content: assistantMessage.content,
      };
      this.messageHistory.push(assistantMsg);

      return assistantMessage.content;
    } catch (error) {
      this.messageHistory.pop();
      
      if (error instanceof OpenAI.APIError) {
        throw new Error(
          `API Error: ${error.status} ${error.name} - ${error.message}`
        );
      }
      
      throw error;
    }
  }

  private buildMessages(): Message[] {
    const messages: Message[] = [];

    if (this.systemPrompt) {
      messages.push({ role: 'system', content: this.systemPrompt });
    }

    messages.push(...this.messageHistory);

    return messages;
  }
}
