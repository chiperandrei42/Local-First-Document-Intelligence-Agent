# Local-First Document Intelligence Agent - Progress & Context

## Project Mission
To build a state-of-the-art, 100% private, locally-hosted Retrieval-Augmented Generation (RAG) system with a FastAPI backend and a Next.js (App Router) frontend, utilizing Ollama for local LLM inference and ChromaDB for local vector embeddings.

## Architectural Decisions & Implemented Patterns
1. **Local-Only Privacy Invariant**: Zero external network egress. All LLM calls and embeddings are served through `localhost:11434` (Ollama).
2. **Memory Footprint (8GB VRAM Limit)**:
   - Primary LLM: `llama3.2` (3B) with Q4_K_M 4-bit quantization (~2.2GB VRAM).
   - Embeddings: `nomic-embed-text` (768-dim, <500MB VRAM).
   - ChromaDB local file-backed persistence at `./chroma_db`.
   - Batch size: 16 chunks during embedding generation.
3. **Frontend & Backend Communication**:
   - Server-Sent Events (SSE) `/api/chat` for fluid token streaming.
   - Pre-token citation dispatch (`{"type": "citations", "data": [...]}`) giving the UI instant grounding metadata before token generation.
   - GSAP & Tailwind v4 for sleek glassmorphic UI, animated citation pills, and slide-in context inspection drawers.
4. **Data Isolation**:
   - `/data/` for user private files (strictly excluded by `.gitignore`).
   - `/example-data/` for public test documents (PDF, Markdown, TXT).

## Implementation Roadmap & Status
- [x] Initial Project Setup & Gitignore definitions (ignoring `/data/*`, `/chroma_db/`, `.env`)
- [x] Example public documents created in `/example-data/` (`falcon_security_policy.txt`, `local_rag_architecture_guide.md`, `sample_research_brief.pdf`)
- [x] Backend FastAPI development:
  - [x] Vector store service with ChromaDB persistent cosine HNSW collection (`database/vector_store.py`)
  - [x] Ollama integration for health checks, embeddings, and chat streams (`services/ollama_service.py`)
  - [x] Multi-format ingestion service for PDF, Markdown, and TXT (`services/ingestion_service.py`)
  - [x] Streaming RAG query service with citation chunk formatting (`services/rag_service.py`)
  - [x] REST & SSE routes (`/api/status`, `/api/documents`, `/api/ingest`, `/api/chat`, `/api/clear`) (`api/routes.py`)
  - [x] FastAPI application entrypoint with CORS configuration (`main.py`)
- [x] Frontend Next.js development:
  - [x] Next.js 15 App Router with TypeScript & Tailwind CSS
  - [x] Header with Ollama connection badge, local model selector, and 100% air-gapped status (`components/Header.tsx`)
  - [x] Ingestion manager sidebar with dropzone and quick-loader for `/example-data` (`components/DocumentSidebar.tsx`)
  - [x] Streaming Chat Interface with Markdown rendering, inline citations, and starter prompts (`components/ChatInterface.tsx`, `components/MessageBubble.tsx`)
  - [x] Source Inspector Drawer with similarity confidence scores and exact chunk context (`components/SourceInspectorModal.tsx`)
  - [x] API client for HTTP operations and SSE streaming reader (`lib/api.ts`)
  - [x] Verified zero-error production build (`npm run build`)
- [x] End-to-end testing and verification:
  - [x] Local ingestion of PDF, TXT, MD test files verified (10 chunks indexed)
  - [x] Cosine similarity retrieval verified with high confidence scores (>86%)
  - [x] `nomic-embed-text` and `llama3.2` models pulled and verified in Ollama
- [x] Comprehensive documentation (`README.md`) detailing privacy guarantees, VRAM memory engineering, and quickstart instructions.
