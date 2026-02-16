import toml
import requests
import json
import time

def load_settings():
    """Загрузка настроек из конфигурационного файла"""
    try:
        with open('settings.toml', 'r', encoding='utf-8') as f:
            return toml.load(f)
    except FileNotFoundError:
        print("Ошибка: файл settings.toml не найден")
        return None
    except Exception as e:
        print(f"Ошибка чтения конфигурационного файла: {e}")
        return None

def create_llm_request():
    """Создание системного промпта и базового промпта на русском языке"""
    system_prompt = """Ты художник ASCII-графики. Твоя задача создавать красивые, детальные и выразительные ASCII-изображения. 
Используй различные символы для создания теней, текстур и деталей. 
Максимизируй использование доступного пространства для создания максимально подробного и эстетичного изображения."""
    
    user_prompt = """Нарисуй максимально красивый и подробный ASCII графикой котика, который говорит "Привет, Мир!". 
Сделай его милым, детализированным и выразительным. Используй разнообразные символы для создания текстуры шерсти, глаз, усов и других деталей."""
    
    return {
        "system_prompt": system_prompt,
        "user_prompt": user_prompt
    }

def send_request(settings, prompt_data):
    """Отправка запроса к LLM модели по OpenAI протоколу"""
    headers = {
        "Authorization": f"Bearer {settings['api_key']}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": settings["model"],
        "messages": [
            {"role": "system", "content": prompt_data["system_prompt"]},
            {"role": "user", "content": prompt_data["user_prompt"]}
        ],
        "max_tokens": settings["max_tokens"],
        "temperature": 0.7
    }
    
    try:
        response = requests.post(
            f"{settings['base_url']}/chat/completions",
            headers=headers,
            json=payload,
            timeout=settings["timeout"]
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Ошибка запроса к API: {e}")
        return None
    except json.JSONDecodeError as e:
        print(f"Ошибка парсинга JSON ответа: {e}")
        return None

def main():
    """Основная функция программы"""
    print("Запуск приложения для генерации ASCII котика...")
    
    # Загрузка настроек
    settings = load_settings()
    if not settings:
        return
    
    # Проверка наличия API ключа
    if settings["api_key"] == "your-api-key-here":
        print("Внимание: В файле settings.toml не указан API ключ. Пожалуйста, укажите ваш API ключ.")
        return
    
    # Создание промптов
    prompt_data = create_llm_request()
    
    # Отправка запроса
    print("Отправка запроса к LLM модели...")
    result = send_request(settings, prompt_data)
    
    if result:
        # Вывод результата
        if "choices" in result and len(result["choices"]) > 0:
            content = result["choices"][0]["message"]["content"]
            print("\n" + "="*60)
            print("Ваш ASCII котик:")
            print("="*60)
            print(content)
            print("="*60)
        else:
            print("Ошибка: Не удалось получить ответ от модели")
    else:
        print("Не удалось получить ответ от модели")

if __name__ == "__main__":
    main()