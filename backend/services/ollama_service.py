import os
import httpx
from typing import List, Dict, Any, AsyncGenerator, Optional
from dotenv import load_dotenv

load_dotenv()

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
DEFAULT_LLM_MODEL = os.getenv("LLM_MODEL", "llama3.2")
DEFAULT_EMBED_MODEL = os.getenv("EMBED_MODEL", "nomic-embed-text")

class OllamaService:
    def __init__(self, base_url: str = OLLAMA_BASE_URL):
        self.base_url = base_url
        self.default_llm = DEFAULT_LLM_MODEL
        self.default_embed = DEFAULT_EMBED_MODEL

    async def check_health(self) -> Dict[str, Any]:
        """Check if Ollama daemon is running and retrieve list of available models."""
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                if response.status_code == 200:
                    data = response.json()
                    models = [m.get("name", "") for m in data.get("models", [])]
                    return {
                        "connected": True,
                        "url": self.base_url,
                        "models": models,
                        "default_llm": self.default_llm,
                        "default_embed": self.default_embed,
                    }
        except Exception as e:
            pass
        return {
            "connected": False,
            "url": self.base_url,
            "models": [],
            "default_llm": self.default_llm,
            "default_embed": self.default_embed,
        }

    async def get_embeddings(self, texts: List[str], model: Optional[str] = None) -> List[List[float]]:
        """Generate vector embeddings for a list of text strings using Ollama."""
        model_name = model or self.default_embed
        embeddings: List[List[float]] = []

        async with httpx.AsyncClient(timeout=60.0) as client:
            for text in texts:
                try:
                    res = await client.post(
                        f"{self.base_url}/api/embeddings",
                        json={"model": model_name, "prompt": text},
                    )
                    if res.status_code == 200:
                        embeddings.append(res.json().get("embedding", []))
                    else:
                        # Fallback for newer Ollama /api/embed endpoint
                        res_embed = await client.post(
                            f"{self.base_url}/api/embed",
                            json={"model": model_name, "input": text},
                        )
                        if res_embed.status_code == 200:
                            embed_data = res_embed.json().get("embeddings", [])
                            embeddings.append(embed_data[0] if embed_data else [])
                        else:
                            raise RuntimeError(f"Ollama embedding failed with status {res.status_code}: {res.text}")
                except Exception as e:
                    raise RuntimeError(f"Failed to generate embedding with Ollama ({model_name}): {str(e)}")

        return embeddings

    async def stream_chat(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.2,
    ) -> AsyncGenerator[str, None]:
        """Stream generated tokens from Ollama LLM."""
        model_name = model or self.default_llm
        payload: Dict[str, Any] = {
            "model": model_name,
            "prompt": prompt,
            "stream": True,
            "options": {
                "temperature": temperature,
            }
        }
        if system_prompt:
            payload["system"] = system_prompt

        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/api/generate",
                json=payload,
            ) as response:
                if response.status_code != 200:
                    error_text = await response.aread()
                    yield f"Error from Ollama ({response.status_code}): {error_text.decode('utf-8')}"
                    return

                async for line in response.aiter_lines():
                    if line:
                        try:
                            import json
                            data = json.loads(line)
                            token = data.get("response", "")
                            if token:
                                yield token
                            if data.get("done", False):
                                break
                        except Exception:
                            continue

ollama_service = OllamaService()
