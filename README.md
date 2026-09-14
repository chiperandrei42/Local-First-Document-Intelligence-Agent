# Local-First Document Intelligence Agent (Cetera)

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](https://opensource.org/licenses/MIT)
[![Privacy: 100% Air-Gapped](https://img.shields.io/badge/Privacy-100%25%20Air--Gapped-cyan.svg)](#key-features--invariants)
[![VRAM: 8GB Optimized](https://img.shields.io/badge/Hardware-8GB%20VRAM%20Safe-indigo.svg)](#2-memory-engineering--8gb-vram-footprint)
[![Stack: FastAPI + Next.js](https://img.shields.io/badge/Stack-FastAPI%20%7C%20Next.js%20%7C%20ChromaDB-blue.svg)](#tech-stack)

A high-performance, **100% private, locally-hosted Retrieval-Augmented Generation (RAG) system**. Ingest private documents (PDFs, Markdown, plain text) and quick clipboard notes, compute local embeddings, and interact with your knowledge base using state-of-the-art local LLMs running entirely on your machine.

**Zero external telemetry. Zero cloud API keys. Zero data exfiltration.**

---

## Architecture Overview

```mermaid
flowchart TB
    subgraph Client["Frontend (Next.js App Router + TypeScript + Tailwind CSS v4)"]
        Nav["SidebarNav (Telemetry & Ollama Live Status)"]
        UI["ChatInterface (Minimalist Hero, Dynamic Greeting & Token Streamer)"]
        Bubble["MessageBubble (Markdown Renderer & Clickable Citation Pills)"]
        DocSidebar["DocumentSidebar (Drag & Drop, Folder Indexing, Doc Deletion)"]
        NoteModal["NewNoteModal (Direct Text Note & Clipboard Ingestion)"]
        Inspector["SourceInspectorModal (Context Inspector & Similarity Scores)"]
    end

    subgraph Server["Backend (FastAPI Asynchronous Engine)"]
        API["API Router (/chat, /ingest, /ingest/text, /documents, /status, /clear)"]
        IngestService["Ingestion Engine (PyMuPDF / PyPDF + Recursive Text Splitter)"]
        RAGService["RAG Query Service & Grounded Citation Formatter"]
        ChromaStore["ChromaDB (Persistent Cosine Vector Store at ./backend/chroma_db)"]
    end

    subgraph LocalEngine["Local AI Engine (Ollama :11434)"]
        Embedder["nomic-embed-text (768-dim Embedding Model)"]
        LLM["llama3.2 / llama3.1 (Quantized Local LLM)"]
    end

    Nav -->|Toggle Views & Status| UI
    DocSidebar -->|File Uploads / Ingest Folders| API
    NoteModal -->|Direct Markdown / Text Ingest| API
    UI -->|SSE Query Stream POST /api/chat| API
    API --> IngestService
    API --> RAGService
    IngestService -->|Micro-Batch Embeddings (Batch Size 16)| Embedder
    IngestService -->|Store Chunks & Metadata| ChromaStore
    RAGService -->|Embed User Query| Embedder
    RAGService -->|Cosine Similarity Retrieval| ChromaStore
    RAGService -->|Grounding Prompt + Chat History| LLM
    LLM -->|Token-by-Token SSE Stream| UI
    RAGService -->|Pre-Token Citations & Chunk IDs| Inspector
    Bubble -->|Inspect Sources| Inspector
```

---

## Key Features & Invariants

### 1. 100% Air-Gapped Data Privacy
- **Zero Cloud Footprint**: All embeddings, vector storage, indexing, and generative inferences execute strictly through the local loopback interface (`127.0.0.1:11434`).
- **Data Isolation**: 
  - User private documents placed in `/data` are protected by `.gitignore` rules to guarantee private files are never committed to version control.
  - Public test documents are isolated in `/example-data` for testing and benchmarking without exposing confidential data.

### 2. Memory Engineering & 8GB VRAM Footprint
Engineered specifically to run comfortably on consumer-grade hardware and standard office laptops (e.g., RTX 3060/4060 or Apple Silicon):
- **Lightweight Inference**: Tested with `llama3.2` (3B parameters, ~2.2GB VRAM) and `llama3.1` (8B 4-bit Q4_K_M quantization, ~4.5GB VRAM).
- **Compact High-Quality Embeddings**: Employs `nomic-embed-text` (768 embedding dimensions, 8192 token context window) with a VRAM footprint of **<500MB**.
- **Controlled Ingestion Batches**: Document chunks are embedded in micro-batches (batch size: 16) to prevent GPU memory saturation.
- **Zero Heavy ML Overhead**: Minimal, lean backend without massive computer vision or PyTorch weights.

### 3. Multi-Format Ingestion Engine
- **PDF Documents**: Dual-pass digital text extraction using **PyMuPDF** (`fitz`) with automatic fallback to **PyPDF**.
- **Markdown & Plain Text**: Native ingestion of `.md`, `.markdown`, and `.txt` files with intelligent recursive chunking.
- **Quick Notes & Clipboard Ingestion**: Direct note ingestion dialog (**NewNoteModal**) for pasting meeting minutes, research summaries, or draft text directly into vector memory.
- **Granular Management**: Delete individual documents or clear the entire database with instant UI reflection.

### 4. Fluid SSE Streaming & Grounded Citations
- **Real-Time Token Streaming**: Server-Sent Events (SSE) via FastAPI's `StreamingResponse` deliver zero-latency typing effects.
- **Pre-Token Citation Dispatch**: The backend emits citation metadata (`{"type": "citations", "data": [...]}`) before token generation begins, ensuring the UI immediately identifies source attribution.
- **Context Chunk Inspector**: Click any inline citation pill to slide open the inspector drawer and examine the exact source text, page number, and similarity confidence score.

---

## Tech Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend UI** | Next.js (App Router), React 19, TypeScript | Server and Client components with modern modular architecture |
| **Styling & Icons** | Tailwind CSS v4, Lucide React | Glassmorphic dark theme (`#060607`), glowing violet accents (`#614DFF`) |
| **Backend API** | FastAPI, Uvicorn, Pydantic v2 | High-throughput asynchronous Python REST & SSE endpoints |
| **Vector Store** | ChromaDB (Persistent) | Local file-backed HNSW cosine vector index at `./backend/chroma_db` |
| **Document Processing** | PyMuPDF, PyPDF, LangChain Text Splitters | Robust PDF parsing, block extraction, and recursive text chunking |
| **Local AI Engine** | Ollama (`http://localhost:11434`) | Air-gapped local model daemon serving embeddings and chat completions |

---

## Directory Structure

```text
/local-rag-agent
├── /frontend                       # Next.js TypeScript application
│   ├── /app                        # App Router (page.tsx, layout.tsx, globals.css)
│   ├── /components                 # Modular UI Components
│   │   ├── SidebarNav.tsx          # Left navigation bar & Ollama status telemetry
│   │   ├── ChatInterface.tsx       # Minimalist chat screen with dynamic greeting
│   │   ├── MessageBubble.tsx       # Markdown message bubble with clickable citation pills
│   │   ├── DocumentSidebar.tsx     # Slide-out document manager, dropzone & folder indexer
│   │   ├── NewNoteModal.tsx        # Direct note & clipboard text ingestion modal
│   │   ├── SourceInspectorModal.tsx# Slide-in source context inspection drawer
│   │   └── CeteraLogo.tsx          # Canonical planetary logo & orbit animations
│   └── /lib                        # Frontend utilities, types & SSE API client
│       ├── api.ts                  # Fetch wrappers & SSE streaming reader
│       └── types.ts                # TypeScript data contracts & models
├── /backend                        # FastAPI Python backend
│   ├── main.py                     # Application entry point with CORS configuration
│   ├── /api                        # REST routes & endpoints
│   │   └── routes.py               # /status, /documents, /ingest, /ingest/text, /chat, /clear
│   ├── /services                   # Business logic and processing services
│   │   ├── ingestion_service.py    # Multi-format document parser & chunker
│   │   ├── ollama_service.py       # Local Ollama client (health, embeddings, chat)
│   │   └── rag_service.py          # Grounded RAG prompt constructor & citation resolver
│   ├── /database                   # Data layer
│   │   ├── vector_store.py         # ChromaDB persistence & similarity search client
│   │   └── schemas.py              # Pydantic request & response schemas
│   ├── /tests                      # Automated unit tests
│   │   └── test_rag_pipeline.py    # Vector store & schema validation tests
│   ├── requirements.txt            # Python dependencies
│   └── .env.example                # Environment variables template
├── /data                           # User private documents (Gitignored, contains .keep)
├── /example-data                   # Public verification documents (PDF, MD, TXT)
├── CONTEXT.md                      # Progress log & architecture context
└── README.md                       # Project documentation
```

---

## API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/status` | System health check, Ollama connection status, model inventory, and collection stats |
| `GET` | `/api/documents` | List all indexed documents with chunk and page counts |
| `POST` | `/api/ingest` | Upload `.pdf`, `.md`, `.txt` files or scan folders (`data` / `example-data`) |
| `POST` | `/api/ingest/text` | Direct ingestion of plain-text notes and clipboard summaries |
| `POST` | `/api/chat` | SSE streaming endpoint for grounded RAG query generation |
| `DELETE` | `/api/documents/{filename}` | Delete all vector chunks associated with a specific file |
| `DELETE` | `/api/clear` | Clear the entire ChromaDB collection and wipe indexed documents |

---

## Quickstart Guide

### 1. Prerequisites
1. **Install Ollama**: Download from [ollama.com](https://ollama.com).
2. **Pull Required Models**:
   ```bash
   # Embedding model (768-dim, <500MB VRAM)
   ollama pull nomic-embed-text

   # Generation model (3B parameters, ~2.2GB VRAM)
   ollama pull llama3.2
   ```
3. **Runtime**: Python 3.10+ and Node.js 18+.

---

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Start the FastAPI server:
   ```bash
   python main.py
   ```
   *The server runs at `http://127.0.0.1:8000` (interactive API docs available at `http://127.0.0.1:8000/docs`).*

---

### 3. Frontend Setup
1. In a new terminal, navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### 4. Usage & Workflows

1. **Open Document Storage**: Click the database icon in the left navigation bar or press <kbd>Ctrl</kbd> + <kbd>K</kbd> (<kbd>Cmd</kbd> + <kbd>K</kbd> on macOS).
2. **Index Documents**:
   - **Sample Data**: Click **"Example Dataset"** to load the sample documents from `/example-data`.
   - **Local Folder**: Click **"Local Folder"** to scan and ingest documents from `/data`.
   - **Drag & Drop**: Drop `.pdf`, `.md`, or `.txt` files directly into the upload dropzone.
   - **Quick Notes**: Click **"New Note"** (<kbd>+</kbd>) to type or paste notes and meeting transcripts directly into vector storage.
3. **Ask Questions**:
   - Type inquiries into the bottom chat bar (e.g. *"What are the core pillars of Local-First RAG?"* or *"Summarize the security policies"*).
   - Watch real-time streaming tokens and click on any citation pill to view the source text and similarity confidence score in the **Context Inspector**.
4. **Manage Memory**:
   - Delete individual documents using the trash icon next to each file.
   - Click **"Clear All"** to purge the entire vector database.

---

## Verification & Testing

Run the automated backend test suite:
```bash
cd backend
python -m pytest tests
```

Build the frontend for production:
```bash
cd frontend
npm run build
```
