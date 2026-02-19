import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import apiConfig from './config/api';
import prompt from './prompt';

/**
 * Интерфейс для результата запроса
 */
interface QueryResult {
  temperature: number;
  response: string;
  timestamp: string;
}

/**
 * Интерфейс для всех результатов
 */
interface AllResults {
  prompt: string;
  model: string;
  results: QueryResult[];
}

/**
 * Отправка запроса к OpenAI с заданной температурой
 */
async function sendQuery(client: OpenAI, temperature: number): Promise<QueryResult> {
  console.log(`\n📊 Запрос с температурой ${temperature}...`);
  
  const response = await client.chat.completions.create({
    model: apiConfig.model,
    messages: [{ role: 'user', content: prompt }],
    temperature: temperature,
    max_tokens: apiConfig.maxTokens,
  });

  const result: QueryResult = {
    temperature,
    response: response.choices[0]?.message?.content || 'Нет ответа',
    timestamp: new Date().toISOString(),
  };

  return result;
}

/**
 * Сохранение результатов в файл
 */
function saveResults(results: AllResults): void {
  const filePath = path.join(process.cwd(), 'results.json');
  fs.writeFileSync(filePath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\n💾 Результаты сохранены в файл: ${filePath}`);
}

/**
 * Основная функция
 */
async function main(): Promise<void> {
  console.log('🚀 Запуск приложения для демонстрации влияния температуры');
  console.log(`📝 Промпт: "${prompt}"`);
  console.log(`🤖 Модель: ${apiConfig.model}`);
  
  // Проверка API ключа
  if (apiConfig.apiKey === 'YOUR_API_KEY_HERE' || !apiConfig.apiKey) {
    console.error('❌ Ошибка: API ключ не настроен!');
    console.log('   Пожалуйста, заполните src/config/api.ts или установите переменную окружения OPENAI_API_KEY');
    process.exit(1);
  }

  // Инициализация клиента OpenAI
  const openai = new OpenAI({
    apiKey: apiConfig.apiKey,
    baseURL: apiConfig.baseURL,
  });

  // Температуры для тестирования
  const temperatures = [0, 0.7, 1.2];
  
  const results: QueryResult[] = [];

  // Отправляем запросы с разными температурами
  for (const temp of temperatures) {
    try {
      const result = await sendQuery(openai, temp);
      results.push(result);
      
      // Вывод ответа в консоль
      console.log(`\n📌 Ответ (температура = ${temp}):`);
      console.log('─'.repeat(50));
      console.log(result.response);
      console.log('─'.repeat(50));
      
    } catch (error) {
      console.error(`❌ Ошибка при запросе с температурой ${temp}:`, error);
    }
  }

  // Формирование итогового объекта
  const allResults: AllResults = {
    prompt,
    model: apiConfig.model,
    results,
  };

  // Сохранение в файл
  saveResults(allResults);

  console.log('\n✅ Все запросы выполнены!');
}

// Запуск
main().catch(console.error);
