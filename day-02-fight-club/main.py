"""
Программа отправляет запросы к OpenAI API с перебором всех комбинаций
опциональных параметров: формат ответа, ограничение длины, условие завершения.
"""

import configparser
from itertools import product
from openai import OpenAI

config = configparser.ConfigParser()
config.read("config.ini")

client = OpenAI(
    api_key=config.get("openai", "api_key"),
    base_url=config.get("openai", "base_url", fallback=None) or None,
)

PROMPT_TEMPLATE = config.get("request", "prompt_template")
RESPONSE_FORMAT = config.get("request", "response_format")
MAX_TOKENS = config.getint("request", "max_tokens")
STOP_SEQUENCE = config.get("request", "stop_sequence")
MODEL = config.get("openai", "model")


def build_system_prompt(use_format: bool, use_max_tokens: bool, use_stop: bool) -> str:
    """Формирует системный промпт с инструкциями на основе включённых параметров."""
    instructions = []
    
    if use_format:
        instructions.append(f"Ответ должен быть в формате {RESPONSE_FORMAT}.")
    if use_max_tokens:
        instructions.append(f"Ответ не должен превышать {MAX_TOKENS} токенов.")
    if use_stop:
        instructions.append(f"Заверши ответ перед последовательностью: {repr(STOP_SEQUENCE)}")
    
    return " ".join(instructions) if instructions else ""


def send_request(use_format: bool, use_max_tokens: bool, use_stop: bool) -> str:
    """Отправляет запрос к OpenAI API с заданной комбинацией параметров."""
    system_instruction = build_system_prompt(use_format, use_max_tokens, use_stop)
    
    messages = []
    if system_instruction:
        messages.append({"role": "system", "content": system_instruction})
    messages.append({"role": "user", "content": PROMPT_TEMPLATE})
    
    kwargs = {
        "model": MODEL,
        "messages": messages,
    }
    
    if use_max_tokens:
        kwargs["max_tokens"] = MAX_TOKENS
    if use_stop:
        kwargs["stop"] = STOP_SEQUENCE
    if use_format and RESPONSE_FORMAT == "json":
        kwargs["response_format"] = {"type": "json_object"}
    
    response = client.chat.completions.create(**kwargs)
    return response.choices[0].message.content


def main():
    """Перебирает все 8 комбинаций параметров и выводит ответы."""
    print("=" * 60)
    print("Перебор всех комбинаций опциональных параметров")
    print("=" * 60)
    print(f"Запрос: {PROMPT_TEMPLATE}\n")
    
    param_names = ["формат", "max_tokens", "stop"]
    
    for i, (use_format, use_max_tokens, use_stop) in enumerate(product([False, True], repeat=3), 1):
        params = []
        if use_format:
            params.append(f"формат={RESPONSE_FORMAT}")
        if use_max_tokens:
            params.append(f"max_tokens={MAX_TOKENS}")
        if use_stop:
            params.append(f"stop={repr(STOP_SEQUENCE)}")
        
        params_str = ", ".join(params) if params else "без параметров"
        
        print(f"--- Вариант {i}: {params_str} ---")
        try:
            answer = send_request(use_format, use_max_tokens, use_stop)
            print(f"Ответ:\n{answer}\n")
        except Exception as e:
            print(f"Ошибка: {e}\n")


if __name__ == "__main__":
    main()
