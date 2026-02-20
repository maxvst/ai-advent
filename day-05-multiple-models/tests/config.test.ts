/**
 * Тесты для модуля config.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { loadConfig, getModelsList, generateEnvExample } from '../src/config/index';
import { Config } from '../src/types';

describe('loadConfig', () => {
  const testConfigDir = path.join(__dirname, 'test-configs');
  const validConfigPath = path.join(testConfigDir, 'valid-config.json');
  const missingApiKeyPath = path.join(testConfigDir, 'missing-apikey.json');
  const emptyQuestionPath = path.join(testConfigDir, 'empty-question.json');

  const validConfig: Config = {
    openRouter: {
      baseUrl: 'https://openrouter.ai/api/v1',
      apiKey: 'sk-or-test-key-12345'
    },
    models: {
      strong: {
        id: 'anthropic/claude-3.5-sonnet',
        name: 'Claude 3.5 Sonnet',
        pricing: { input: 3.00, output: 15.00 }
      },
      medium: {
        id: 'anthropic/claude-3-haiku',
        name: 'Claude 3 Haiku',
        pricing: { input: 0.25, output: 1.25 }
      },
      weak: {
        id: 'meta-llama/llama-3-8b-instruct',
        name: 'Llama 3 8B',
        pricing: { input: 0.05, output: 0.10 }
      }
    },
    question: 'Тестовый вопрос?',
    outputDir: './results'
  };

  beforeEach(() => {
    // Создаём директорию для тестовых конфигов
    if (!fs.existsSync(testConfigDir)) {
      fs.mkdirSync(testConfigDir, { recursive: true });
    }

    // Создаём валидный конфиг
    fs.writeFileSync(validConfigPath, JSON.stringify(validConfig, null, 2));

    // Создаём конфиг без API ключа
    const noApiKey = JSON.parse(JSON.stringify(validConfig));
    noApiKey.openRouter.apiKey = 'YOUR_API_KEY_HERE';
    fs.writeFileSync(missingApiKeyPath, JSON.stringify(noApiKey, null, 2));

    // Создаём конфиг с пустым вопросом
    const emptyQ = JSON.parse(JSON.stringify(validConfig));
    emptyQ.question = '';
    fs.writeFileSync(emptyQuestionPath, JSON.stringify(emptyQ, null, 2));

    // Очищаем env переменные
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_BASE_URL;
    delete process.env.LLM_QUESTION;
    delete process.env.LLM_OUTPUT_DIR;
  });

  afterEach(() => {
    // Удаляем тестовые файлы
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }

    // Очищаем env переменные
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_BASE_URL;
    delete process.env.LLM_QUESTION;
    delete process.env.LLM_OUTPUT_DIR;
  });

  it('должен загружать валидный конфиг', () => {
    const config = loadConfig(validConfigPath);

    expect(config.openRouter.baseUrl).toBe('https://openrouter.ai/api/v1');
    expect(config.openRouter.apiKey).toBe('sk-or-test-key-12345');
    expect(config.question).toBe('Тестовый вопрос?');
    expect(config.models.strong.id).toBe('anthropic/claude-3.5-sonnet');
    expect(config.models.medium.id).toBe('anthropic/claude-3-haiku');
    expect(config.models.weak.id).toBe('meta-llama/llama-3-8b-instruct');
  });

  it('должен выбрасывать ошибку для пустого API ключа', () => {
    expect(() => loadConfig(missingApiKeyPath)).toThrow(
      'API ключ не настроен'
    );
  });

  it('должен выбрасывать ошибку для пустого вопроса', () => {
    expect(() => loadConfig(emptyQuestionPath)).toThrow(
      'Вопрос не может быть пустым'
    );
  });

  it('должен использовать baseUrl по умолчанию если не указан', () => {
    const noBaseUrl = JSON.parse(JSON.stringify(validConfig));
    delete noBaseUrl.openRouter.baseUrl;
    const noBaseUrlPath = path.join(testConfigDir, 'no-baseurl.json');
    fs.writeFileSync(noBaseUrlPath, JSON.stringify(noBaseUrl, null, 2));

    const config = loadConfig(noBaseUrlPath);
    expect(config.openRouter.baseUrl).toBe('https://openrouter.ai/api/v1');
  });

  it('должен выбрасывать ошибку для отсутствующего ID модели', () => {
    const noModelId = JSON.parse(JSON.stringify(validConfig));
    delete noModelId.models.strong.id;
    const noModelIdPath = path.join(testConfigDir, 'no-model-id.json');
    fs.writeFileSync(noModelIdPath, JSON.stringify(noModelId, null, 2));

    expect(() => loadConfig(noModelIdPath)).toThrow('models.strong.id');
  });

  it('должен выбрасывать ошибку для отсутствующего имени модели', () => {
    const noModelName = JSON.parse(JSON.stringify(validConfig));
    delete noModelName.models.medium.name;
    const noModelNamePath = path.join(testConfigDir, 'no-model-name.json');
    fs.writeFileSync(noModelNamePath, JSON.stringify(noModelName, null, 2));

    expect(() => loadConfig(noModelNamePath)).toThrow('models.medium.name');
  });

  it('должен выбрасывать ошибку для некорректных цен', () => {
    const badPricing = JSON.parse(JSON.stringify(validConfig));
    badPricing.models.weak.pricing.input = 'not a number';
    const badPricingPath = path.join(testConfigDir, 'bad-pricing.json');
    fs.writeFileSync(badPricingPath, JSON.stringify(badPricing, null, 2));

    expect(() => loadConfig(badPricingPath)).toThrow('pricing.input');
  });

  describe('environment variables', () => {
    it('должен переопределять API ключ из env', () => {
      process.env.OPENROUTER_API_KEY = 'env-api-key-12345';
      
      const config = loadConfig(validConfigPath);
      
      expect(config.openRouter.apiKey).toBe('env-api-key-12345');
    });

    it('должен переопределять baseUrl из env', () => {
      process.env.OPENROUTER_BASE_URL = 'https://custom.api.com/v1';
      
      const config = loadConfig(validConfigPath);
      
      expect(config.openRouter.baseUrl).toBe('https://custom.api.com/v1');
    });

    it('должен переопределять вопрос из env', () => {
      process.env.LLM_QUESTION = 'Вопрос из env?';
      
      const config = loadConfig(validConfigPath);
      
      expect(config.question).toBe('Вопрос из env?');
    });

    it('должен переопределять outputDir из env', () => {
      process.env.LLM_OUTPUT_DIR = './custom-output';
      
      const config = loadConfig(validConfigPath);
      
      expect(config.outputDir).toBe('./custom-output');
    });

    it('env переменные имеют приоритет над файлом', () => {
      process.env.OPENROUTER_API_KEY = 'env-key-override';
      process.env.LLM_QUESTION = 'Env question override?';
      
      const config = loadConfig(validConfigPath);
      
      expect(config.openRouter.apiKey).toBe('env-key-override');
      expect(config.question).toBe('Env question override?');
    });
  });
});

describe('getModelsList', () => {
  it('должен возвращать массив из трёх моделей', () => {
    const config: Config = {
      openRouter: {
        baseUrl: 'https://test.com',
        apiKey: 'test-key'
      },
      models: {
        strong: { id: 's', name: 'Strong', pricing: { input: 1, output: 2 } },
        medium: { id: 'm', name: 'Medium', pricing: { input: 1, output: 2 } },
        weak: { id: 'w', name: 'Weak', pricing: { input: 1, output: 2 } }
      },
      question: 'Test?',
      outputDir: './results'
    };

    const models = getModelsList(config);

    expect(models).toHaveLength(3);
  });

  it('должен возвращать модели в правильном порядке', () => {
    const config: Config = {
      openRouter: {
        baseUrl: 'https://test.com',
        apiKey: 'test-key'
      },
      models: {
        strong: { id: 'strong-id', name: 'Strong Model', pricing: { input: 1, output: 2 } },
        medium: { id: 'medium-id', name: 'Medium Model', pricing: { input: 1, output: 2 } },
        weak: { id: 'weak-id', name: 'Weak Model', pricing: { input: 1, output: 2 } }
      },
      question: 'Test?',
      outputDir: './results'
    };

    const models = getModelsList(config);

    expect(models[0].level).toBe('strong');
    expect(models[0].config.id).toBe('strong-id');
    expect(models[1].level).toBe('medium');
    expect(models[1].config.id).toBe('medium-id');
    expect(models[2].level).toBe('weak');
    expect(models[2].config.id).toBe('weak-id');
  });

  it('должен возвращать конфиг и уровень для каждой модели', () => {
    const config: Config = {
      openRouter: {
        baseUrl: 'https://test.com',
        apiKey: 'test-key'
      },
      models: {
        strong: { id: 's', name: 'Strong', pricing: { input: 3, output: 15 } },
        medium: { id: 'm', name: 'Medium', pricing: { input: 0.25, output: 1 } },
        weak: { id: 'w', name: 'Weak', pricing: { input: 0.05, output: 0.1 } }
      },
      question: 'Test?',
      outputDir: './results'
    };

    const models = getModelsList(config);

    models.forEach(model => {
      expect(model).toHaveProperty('config');
      expect(model).toHaveProperty('level');
      expect(model.config).toHaveProperty('id');
      expect(model.config).toHaveProperty('name');
      expect(model.config).toHaveProperty('pricing');
    });
  });
});

describe('generateEnvExample', () => {
  it('должен генерировать пример .env файла', () => {
    const example = generateEnvExample();
    
    expect(example).toContain('OPENROUTER_API_KEY');
    expect(example).toContain('OPENROUTER_BASE_URL');
    expect(example).toContain('LLM_QUESTION');
    expect(example).toContain('LOG_LEVEL');
  });
});
