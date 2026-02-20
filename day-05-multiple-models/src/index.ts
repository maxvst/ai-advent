/**
 * Точка входа: Сравнение LLM моделей
 * 
 * Программа:
 * 1. Отправляет один и тот же запрос трём моделям разного уровня
 * 2. Замеряет время, токены, стоимость
 * 3. Просит модели оценить ответы анонимно
 * 4. Сильная модель делает итоговый вывод
 * 5. Сохраняет результаты в Markdown
 */

import * as fs from 'fs';
import * as path from 'path';
import { Config, ModelResponse, ModelComparison, FinalConclusion } from './types';
import { initApiClient } from './api';
import { getAllResponses, anonymizeResponses, getFinalConclusion } from './compare';
import { printReport, saveReport, createReport } from './report';

/**
 * Загрузить конфигурацию
 */
function loadConfig(): Config {
  const configPath = path.resolve(__dirname, '../config.json');
  
  if (!fs.existsSync(configPath)) {
    throw new Error(`Конфигурационный файл не найден: ${configPath}`);
  }
  
  const configContent = fs.readFileSync(configPath, 'utf-8');
  const config: Config = JSON.parse(configContent);
  
  // Проверяем API ключ
  if (!config.openRouter.apiKey || config.openRouter.apiKey === 'YOUR_API_KEY_HERE') {
    throw new Error('API ключ не настроен. Укажите apiKey в config.json');
  }
  
  return config;
}

/**
 * Получить сравнение от каждой модели
 */
async function getComparisons(
  config: Config,
  responses: ModelResponse[],
  anonymized: { number: number; content: string }[]
): Promise<ModelComparison[]> {
  const comparisons: ModelComparison[] = [];
  
  // Создаём мапу для связи номера с ответом
  const responseMap = new Map<number, ModelResponse>();
  for (let i = 0; i < responses.length; i++) {
    // Находим соответствие между анонимизированным номером и оригинальным ответом
    const anonIndex = anonymized.findIndex(a => a.content === responses[i].content);
    if (anonIndex !== -1) {
      responseMap.set(anonIndex + 1, responses[i]);
    }
  }
  
  // Получаем оценки от каждой модели
  const models = [
    { config: config.models.strong, level: 'strong' as const },
    { config: config.models.medium, level: 'medium' as const },
    { config: config.models.weak, level: 'weak' as const }
  ];
  
  for (const model of models) {
    console.log(`\n📊 Получение оценки от ${model.config.name}...`);
    
    const messages = [
      {
        role: 'user' as const,
        content: createComparisonPrompt(config.question, anonymized)
      }
    ];
    
    const { sendRequestWithTiming, extractContent, extractUsage } = await import('./api');
    const { response: apiResponse } = await sendRequestWithTiming(model.config.id, messages);
    
    const content = extractContent(apiResponse);
    
    // Парсим оценки для всех ответов
    const ratings = parseAllRatings(content);
    
    comparisons.push({
      modelId: model.config.id,
      modelName: model.config.name,
      modelLevel: model.level,
      responseNumber: 0,
      rating: {
        score: 0, // Будет заполнено средним значением
        analysis: content
      }
    });
  }
  
  return comparisons;
}

/**
 * Создать промпт для сравнения
 */
function createComparisonPrompt(
  question: string,
  anonymized: { number: number; content: string }[]
): string {
  const responsesText = anonymized
    .map(r => `## Ответ ${r.number}\n\n${r.content}`)
    .join('\n\n---\n\n');

  return `Вам даны три ответа (Ответ 1, Ответ 2, Ответ 3) на следующий вопрос:

**Вопрос:** ${question}

${responsesText}

---

**Задание:**
Оцените каждый ответ по шкале от 1 до 10 по следующим критериям:
- Полнота ответа
- Логичность и последовательность
- Глубина анализа
- Ясность изложения
- Качество примеров

Для каждого ответа укажите:
1. Оценку (число от 1 до 10)
2. Краткий анализ сильных и слабых сторон

Формат ответа:
### Ответ 1
- Оценка: [число]
- Анализ: [текст]

### Ответ 2
- Оценка: [число]
- Анализ: [текст]

### Ответ 3
- Оценка: [число]
- Анализ: [текст]`;
}

/**
 * Парсить все оценки из ответа
 */
function parseAllRatings(content: string): Map<number, { score: number; analysis: string }> {
  const ratings = new Map<number, { score: number; analysis: string }>();
  
  const scorePattern = /###\s*Ответ\s*(\d)[\s\S]*?Оценка:\s*(\d+)/gi;
  const matches = [...content.matchAll(scorePattern)];
  
  for (const match of matches) {
    const responseNum = parseInt(match[1]);
    const score = parseInt(match[2]);
    
    // Извлекаем анализ
    const analysisPattern = new RegExp(
      `###\\s*Ответ\\s*${responseNum}[\\s\\S]*?Анализ:\\s*([\\s\\S]*?)(?=###|$)`,
      'i'
    );
    const analysisMatch = content.match(analysisPattern);
    const analysis = analysisMatch ? analysisMatch[1].trim() : '';
    
    ratings.set(responseNum, { score, analysis });
  }
  
  return ratings;
}

/**
 * Главная функция
 */
async function main(): Promise<void> {
  console.log('🚀 Запуск сравнения LLM моделей...\n');
  
  try {
    // 1. Загружаем конфигурацию
    console.log('📁 Загрузка конфигурации...');
    const config = loadConfig();
    
    // 2. Инициализируем API клиент
    console.log('🔌 Инициализация API клиента...');
    initApiClient(config);
    
    // 3. Получаем ответы от всех моделей
    console.log('\n📝 Отправка вопроса моделям...');
    console.log(`   Вопрос: ${config.question}`);
    
    const { strong, medium, weak } = await getAllResponses(config);
    const responses: ModelResponse[] = [strong, medium, weak];
    
    console.log('\n✅ Получены ответы от всех моделей:');
    for (const r of responses) {
      console.log(`   - ${r.modelName}: ${r.responseTimeMs}мс, ${r.usage.outputTokens} токенов`);
    }
    
    // 4. Анонимизируем ответы
    console.log('\n🔒 Анонимизация ответов...');
    const anonymized = anonymizeResponses(responses);
    
    // 5. Получаем сравнение от каждой модели
    console.log('\n📊 Получение оценок качества...');
    const comparisons = await getComparisons(config, responses, anonymized);
    
    // 6. Получаем итоговый вывод от сильной модели
    console.log('\n🏆 Получение итогового вывода от сильной модели...');
    const finalConclusion = await getFinalConclusion(
      config.models.strong,
      config.question,
      responses,
      comparisons
    );
    
    // 7. Создаём отчёт
    console.log('\n📄 Генерация отчёта...');
    const report = createReport(config.question, responses, comparisons, finalConclusion);
    
    // 8. Выводим в консоль
    printReport(report);
    
    // 9. Сохраняем в файл
    const savedPath = await saveReport(report, config.outputDir);
    console.log(`\n💾 Отчёт сохранён: ${savedPath}`);
    
    console.log('\n✨ Сравнение завершено успешно!\n');
    
  } catch (error) {
    console.error('\n❌ Ошибка:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Запуск
main();
