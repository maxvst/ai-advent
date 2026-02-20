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

import { loadConfig } from './config';
import { runComparison, runComparisonSafe } from './orchestrator';
import { error } from './output';

/**
 * Главная функция
 */
async function main(): Promise<void> {
  console.log('🚀 Запуск сравнения LLM моделей...\n');

  try {
    // Загружаем конфигурацию
    const config = loadConfig();

    // Запускаем сравнение
    // Используем безопасный режим для graceful degradation
    const result = await runComparisonSafe(config);

    if (!result.success) {
      error(result.error?.message ?? 'Неизвестная ошибка');
      process.exit(1);
    }

    // Если были частичные результаты, выводим информацию
    if (result.partialResults) {
      console.log(
        `\nℹ️  Обработка завершена с частичными результатами: ` +
        `${result.partialResults.responsesCount} ответов, ` +
        `${result.partialResults.comparisonsCount} оценок`
      );
    }

  } catch (err) {
    error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

// Запуск
main();
