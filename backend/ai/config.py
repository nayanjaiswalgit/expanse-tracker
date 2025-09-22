from decouple import config

OLLAMA_ENDPOINT = config("OLLAMA_ENDPOINT", default="http://localhost:11434")

AI_PROVIDERS = {
    "openai": {
        "class": "ai.providers.OpenAIProvider",
        "model": "gpt-3.5-turbo",
    },
    "ollama": {
        "class": "ai.providers.OllamaProvider",
        "model": "llama2",
        "host": OLLAMA_ENDPOINT,
    },
    "anthropic": {
        "class": "ai.providers.AnthropicProvider",
        "model": "claude-2",
    },
    "huggingface": {
        "class": "ai.providers.HuggingFaceProvider",
        "model": "gpt2",  # Example model
    },
    "mistral": {
        "class": "ai.providers.MistralProvider",
        "model": "mistral-tiny",
    },
    "custom_api": {
        "class": "ai.providers.CustomAPIProvider",
        "api_url": config(
            "CUSTOM_API_URL", default="http://localhost:5000/predict"
        ),  # Example URL
    },
    "local_llm": {
        "class": "ai.providers.LocalLLMProvider",
        "local_llm_url": config(
            "LOCAL_LLM_URL", default="http://localhost:11434/api/generate"
        ),  # Example URL
        "model": "llama2",
    },
}
