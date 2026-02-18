import * as fs from 'fs';
import * as path from 'path';
import { loadConfig } from './config';
import { OpenAIClient } from './openai-client';
import { strategies } from './strategies';
import { StrategyResult } from './types';
import { OutputWriter } from './output-writer';

/**
 * Форматирует время выполнения
 */
function formatTime(ms: number): string {
  if (ms < 1000) {
    return `${ms} мс`;
  }
  return `${(ms / 1000).toFixed(2)} сек`;
}

/**
 * Выводит результат стратегии
 */
function printResult(writer: OutputWriter, result: StrategyResult, index: number, total: number): void {
  writer.writeLine();
  writer.writeSeparator('=', 60);
  writer.writeLine(`## Стратегия ${index}/${total}: ${result.strategyName}`);
  writer.writeSeparator('=', 60);
  writer.writeLine();
  writer.writeLine('### Промпт');
  writer.writeLine('```');
  writer.writeLine(result.prompt);
  writer.writeLine('```');
  writer.writeLine();
  writer.writeLine('### Ответ модели');
  writer.writeLine('```');
  writer.writeLine(result.response);
  writer.writeLine('```');
  writer.writeLine();
  writer.writeLine(`**Время выполнения:** ${formatTime(result.executionTimeMs)}`);
  writer.writeSeparator('=', 60);
}

/**
 * Выводит сводку всех результатов
 */
function printSummary(writer: OutputWriter, results: StrategyResult[]): void {
  writer.writeLine();
  writer.writeLine();
  writer.writeSeparator('#', 60);
  writer.writeLine('## 📊 Сводка результатов');
  writer.writeSeparator('#', 60);
  writer.writeLine();
  
  writer.writeLine('| Стратегия | Время |');
  writer.writeLine('|-----------|-------|');
  
  for (const result of results) {
    const time = formatTime(result.executionTimeMs);
    writer.writeLine(`| ${result.strategyName} | ${time} |`);
  }
  
  writer.writeLine();
  
  // Находим самую быструю стратегию
  const fastest = results.reduce((min, r) => 
    r.executionTimeMs < min.executionTimeMs ? r : min
  );
  
  writer.writeLine(`**🏆 Самая быстрая стратегия:** ${fastest.strategyName}`);
  writer.writeSeparator('#', 60);
}

/**
 * Формирует заголовок Markdown файла
 */
function writeHeader(writer: OutputWriter, model: string, taskDescription: string): void {
  const now = new Date();
  const dateStr = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  
  writer.writeLine('# Результаты сравнения стратегий промптинга LLM');
  writer.writeLine();
  writer.writeLine(`**Дата:** ${dateStr}`);
  writer.writeLine(`**Модель:** ${model}`);
  writer.writeLine(`**Задача:** ${taskDescription}`);
  writer.writeLine();
  writer.writeSeparator('---');
}

/**
 * Главная функция приложения
 */
async function main(): Promise<void> {
  // Инициализация OutputWriter для сохранения в файл results.md
  const outputPath = path.join(process.cwd(), 'results.md');
  const writer = new OutputWriter(outputPath);
  
  writer.writeLine();
  writer.writeLine('🚀 Запуск сравнения стратегий промптинга LLM');
  writer.writeLine();
  
  try {
    // 1. Загрузка конфигурации
    writer.writeLine('📋 Загрузка конфигурации...');
    const config = loadConfig();
    writer.writeLine(`   ✓ Модель: ${config.openai.model}`);
    writer.writeLine(`   ✓ Задача: ${config.task.description.substring(0, 50)}...`);
    
    // Записываем заголовок в файл
    writeHeader(writer, config.openai.model, config.task.description);
    
    // 2. Инициализация клиента
    writer.writeLine();
    writer.writeLine('🔌 Инициализация OpenAI клиента...');
    const client = new OpenAIClient(config.openai);
    writer.writeLine('   ✓ Клиент готов');
    
    // 3. Выполнение всех стратегий
    writer.writeLine();
    writer.writeLine('⚙️  Выполнение стратегий...');
    writer.writeLine();
    
    const results: StrategyResult[] = [];
    const task = config.task.description;
    
    for (let i = 0; i < strategies.length; i++) {
      const strategy = strategies[i];
      writer.writeLine(`   [${i + 1}/${strategies.length}] Выполняю: ${strategy.name}...`);
      
      try {
        const result = await strategy.execute(task, client);
        results.push(result);
        writer.writeLine(`   ✓ Завершено за ${formatTime(result.executionTimeMs)}`);
      } catch (error) {
        writer.writeLine(`   ✗ Ошибка: ${error instanceof Error ? error.message : error}`);
      }
    }
    
    // 4. Вывод результатов
    writer.writeLine();
    writer.writeLine('📄 Результаты:');
    
    for (let i = 0; i < results.length; i++) {
      printResult(writer, results[i], i + 1, results.length);
    }
    
    // 5. Вывод сводки
    if (results.length > 0) {
      printSummary(writer, results);
    }
    
    writer.writeLine();
    writer.writeLine('✅ Завершено успешно!');
    writer.writeLine();
    
    // 6. Сохранение в файл
    await writer.save();
    console.log(`\n📁 Результаты сохранены в файл: ${outputPath}\n`);
    
  } catch (error) {
    writer.writeLine();
    writer.writeLine('❌ Ошибка:');
    writer.writeLine(error instanceof Error ? error.message : String(error));
    await writer.save();
    console.error('\n❌ Ошибка:');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Запуск приложения
main();
