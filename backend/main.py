import os
import sys
from pathlib import Path
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Ensure current script directory is in sys.path for robust subpackage importing
CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

load_dotenv()

from api.routes import router as api_router
from database.vector_store import vector_store

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
    import multiprocessing
    multiprocessing.freeze_support()

    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))
    is_dev = os.getenv("ENVIRONMENT", "").lower() == "development"

    # In PyInstaller frozen bundle, string "main:app" fails because the module is not an importable file on disk.
    # Pass the FastAPI `app` object directly.
    if getattr(sys, "frozen", False):
        uvicorn.run(app, host=host, port=port)
    elif is_dev:
        uvicorn.run("main:app", host=host, port=port, reload=True)
    else:
        uvicorn.run(app, host=host, port=port)

