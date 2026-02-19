/**
 * Конфигурация API OpenAI
 * Заполните свои значения перед запуском
 */
export const apiConfig = {
  // Ваш API ключ OpenAI
  // Получить можно на https://platform.openai.com/api-keys
  apiKey: process.env.OPENAI_API_KEY || 'YOUR_API_KEY_HERE',
  
  // Модель для использования
  // Рекомендуется gpt-4o-mini для экономии
  model: 'gpt-4o-mini',
  
  // Максимальное количество токенов в ответе
  maxTokens: 1000,
};

export default apiConfig;
