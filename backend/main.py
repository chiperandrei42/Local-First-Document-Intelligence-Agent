import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from api.routes import router as api_router
from database.vector_store import vector_store

load_dotenv()

app = FastAPI(
    title="Local-First Document Intelligence Agent",
    description="Fully private, local-only RAG backend powered by Ollama, LangChain, and ChromaDB.",
    version="1.0.0",
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routes
app.include_router(api_router)

@app.get("/")
async def root():
    return {
        "service": "Local-First Document Intelligence Agent",
        "status": "online",
        "mode": "100% Private (Local Invariant)",
        "vector_count": vector_store.get_total_chunks(),
        "docs_url": "/docs",
    }

if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    print(f"🚀 Starting Local RAG Server on http://{host}:{port}")
    uvicorn.run("main:app", host=host, port=port, reload=True)
