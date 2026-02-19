import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';

// Интерфейсы для типизации конфигурации
interface OpenAIConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
}

interface RequestConfig {
  prompt: string;
  temperatures: number[];
  maxTokens: number;
}

interface OutputConfig {
  directory: string;
  filename: string;
}

interface Config {
  openai: OpenAIConfig;
  request: RequestConfig;
  output: OutputConfig;
}

// Интерфейс для хранения результата
interface Result {
  temperature: number;
  response: string;
  timestamp: string;
}

/**
 * Загружает конфигурацию из JSON файла
 */
function loadConfig(): Config {
  const configPath = path.join(__dirname, '..', 'config.json');
  
  if (!fs.existsSync(configPath)) {
    throw new Error(
      `Конфигурационный файл не найден: ${configPath}\n` +
      'Пожалуйста, создайте config.json на основе примера.'
    );
  }

  const configData = fs.readFileSync(configPath, 'utf-8');
  return JSON.parse(configData) as Config;
}

/**
 * Создает экземпляр OpenAI клиента
 */
function createOpenAIClient(config: OpenAIConfig): OpenAI {
  if (config.apiKey === 'YOUR_API_KEY_HERE') {
    throw new Error(
      'Пожалуйста, укажите ваш API ключ в config.json\n' +
      'Получить ключ можно на: https://platform.openai.com/api-keys'
    );
  }

  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
  });
}

/**
 * Отправляет запрос к OpenAI API с указанной температурой
 */
async function sendRequest(
  client: OpenAI,
  model: string,
  prompt: string,
  temperature: number,
  maxTokens: number
): Promise<string> {
  console.log(`\n🔄 Отправка запроса с температурой ${temperature}...`);

  const response = await client.chat.completions.create({
    model: model,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: temperature,
    max_tokens: maxTokens,
  });

  return response.choices[0]?.message?.content || 'Пустой ответ от API';
}

/**
 * Выводит результат на экран
 */
function displayResult(temperature: number, response: string): void {
  console.log('\n' + '='.repeat(60));
  console.log(`📊 ТЕМПЕРАТУРА: ${temperature}`);
  console.log('='.repeat(60));
  console.log(response);
  console.log('='.repeat(60));
}

/**
 * Формирует Markdown содержимое для сохранения
 */
function formatMarkdownResults(
  prompt: string,
  model: string,
  results: Result[]
): string {
  const timestamp = new Date().toISOString();
  
  let markdown = `# Результаты запросов к LLM с разной температурой

**Запрос:** ${prompt}

**Модель:** ${model}

**Дата генерации:** ${timestamp}

---

`;

  for (const result of results) {
    markdown += `## Температура: ${result.temperature}

**Ответ:**

${result.response}

---

`;
  }

  markdown += `*Дата генерации: ${timestamp}*\n`;
  
  return markdown;
}

/**
 * Сохраняет результаты в Markdown файл
 */
function saveResults(
  outputConfig: OutputConfig,
  prompt: string,
  model: string,
  results: Result[]
): void {
  // Создаем директорию, если не существует
  const outputDir = path.join(__dirname, '..', outputConfig.directory);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Формируем и сохраняем Markdown
  const markdown = formatMarkdownResults(prompt, model, results);
  const outputPath = path.join(outputDir, outputConfig.filename);
  
  fs.writeFileSync(outputPath, markdown, 'utf-8');
  console.log(`\n✅ Результаты сохранены в файл: ${outputPath}`);
}

/**
 * Основная функция приложения
 */
async function main(): Promise<void> {
  console.log('🚀 Запуск приложения LLM Temperature Comparison\n');

  try {
    // 1. Загрузка конфигурации
    console.log('📁 Загрузка конфигурации...');
    const config = loadConfig();
    console.log(`   ✓ Модель: ${config.openai.model}`);
    console.log(`   ✓ Запрос: ${config.request.prompt}`);
    console.log(`   ✓ Температуры: ${config.request.temperatures.join(', ')}`);

    // 2. Создание OpenAI клиента
    console.log('\n🔌 Инициализация OpenAI клиента...');
    const client = createOpenAIClient(config.openai);
    console.log('   ✓ Клиент создан успешно');

    // 3. Отправка запросов с разными температурами
    const results: Result[] = [];
    
    for (const temperature of config.request.temperatures) {
      const response = await sendRequest(
        client,
        config.openai.model,
        config.request.prompt,
        temperature,
        config.request.maxTokens
      );

      // Вывод на экран
      displayResult(temperature, response);

      // Сохранение результата
      results.push({
        temperature,
        response,
        timestamp: new Date().toISOString(),
      });
    }

    // 4. Сохранение всех результатов в файл
    saveResults(
      config.output,
      config.request.prompt,
      config.openai.model,
      results
    );

    console.log('\n🎉 Работа завершена успешно!');

  } catch (error) {
    console.error('\n❌ Ошибка:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Запуск приложения
main();
