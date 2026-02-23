import { readFileSync } from 'fs';
import { resolve } from 'path';

export interface Config {
  apiUrl: string;
  model: string;
  apiKey: string;
}

export class ConfigLoader {
  private config: Config;

  constructor(configPath: string = './config.json') {
    const fullPath = resolve(process.cwd(), configPath);
    const configData = readFileSync(fullPath, 'utf-8');
    this.config = JSON.parse(configData);
    this.validate();
  }

  private validate(): void {
    if (!this.config.apiUrl) {
      throw new Error('API URL is required in config');
    }
    if (!this.config.model) {
      throw new Error('Model is required in config');
    }
    if (!this.config.apiKey) {
      throw new Error('API key is required in config');
    }
  }

  get apiUrl(): string {
    return this.config.apiUrl;
  }

  get model(): string {
    return this.config.model;
  }

  get apiKey(): string {
    return this.config.apiKey;
  }

  getConfig(): Config {
    return { ...this.config };
  }
}
