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

    async def transcribe_image(self, image_bytes: bytes, model: Optional[str] = None) -> str:

        """Transcribe handwritten text, diagrams, and notes from an image using a local Ollama vision model."""
        import base64
        
        # 1. Detect or verify vision model
        vision_model = model
        if not vision_model:
            health = await self.check_health()
            models = health.get("models", [])
            for m in models:
                name_lower = m.lower()
                if any(v in name_lower for v in ["vision", "llava", "minicpm", "moondream", "bakllava", "qwen2-vl"]):
                    vision_model = m
                    break

        if not vision_model:
            return ""

        base64_img = base64.b64encode(image_bytes).decode("utf-8")
        prompt = (
            "You are an offline handwriting recognition and document intelligence engine. "
            "Accurately transcribe all handwritten notes, titles, bullet points, math expressions, "
            "and diagrams on this page into clean, structured Markdown text. "
            "Preserve the verbatim content and layout hierarchy. Do not output conversational introductory text."
        )

        try:
            async with httpx.AsyncClient(timeout=180.0) as client:
                res = await client.post(
                    f"{self.base_url}/api/generate",
                    json={
                        "model": vision_model,
                        "prompt": prompt,
                        "images": [base64_img],
                        "stream": False,
                        "options": {
                            "temperature": 0.1,
                        },
                    },
                )
                if res.status_code == 200:
                    return res.json().get("response", "").strip()
        except Exception:
            pass
        return ""


    async def pull_model_stream(self, model_name: str) -> AsyncGenerator[str, None]:
        """Stream model download and extraction progress from Ollama."""
        import json
        async with httpx.AsyncClient(timeout=None) as client:
            try:
                async with client.stream(
                    "POST",
                    f"{self.base_url}/api/pull",
                    json={"name": model_name, "stream": True},
                ) as response:
                    if response.status_code != 200:
                        error_text = await response.aread()
                        yield f"data: {json.dumps({'status': 'error', 'error': error_text.decode('utf-8')})}\n\n"
                        return

                    async for line in response.aiter_lines():
                        if line:
                            try:
                                data = json.loads(line)
                                total = data.get("total", 0)
                                completed = data.get("completed", 0)
                                percent = round((completed / total) * 100, 1) if total > 0 else 0
                                data["percent"] = percent
                                yield f"data: {json.dumps(data)}\n\n"
                            except Exception:
                                pass
            except Exception as e:
                yield f"data: {json.dumps({'status': 'error', 'error': str(e)})}\n\n"

ollama_service = OllamaService()


