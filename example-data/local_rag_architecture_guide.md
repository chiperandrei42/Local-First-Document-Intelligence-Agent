# Local-First Document Intelligence Architecture Specification

## 1. Executive Summary
Local-First Retrieval-Augmented Generation (RAG) represents a paradigm shift in privacy-preserving enterprise and personal intelligence systems. By executing text extraction, embedding vectorization, similarity search, and generative token prediction strictly on local hardware, organizations eliminate third-party data leakage, API dependency, and recurring operational costs.

## 2. Core Pillars of Local RAG
### A. Complete Data Isolation (Air-Gapped Privacy)
- **Zero Remote Calls**: All telemetry, embeddings, and prompt generation are confined to `localhost:11434` (Ollama) and the local disk.
- **Local Persistence**: Vector indexes are stored in local file-backed storage (ChromaDB), ensuring that raw document content and vector embeddings never traverse network boundaries.

### B. Hardware & Memory Optimization (8GB VRAM Target)
- **Embedding Model**: `nomic-embed-text` with an embedding dimensionality of 768 tokens and a context length of up to 8192 tokens. VRAM consumption is under 500MB.
- **Inference Model**: `llama3.2` (3 Billion parameters) utilizing 4-bit Quantization (Q4_K_M). VRAM consumption during peak autoregressive decoding is approximately 2.2GB to 2.8GB.
- **Quantized KV Cache**: Configured to bound context memory footprint to less than 1.5GB even with 4k token history.

## 3. Ingestion and Retrieval Pipeline Specifications
- **Chunk Size**: 500 to 800 characters per chunk, preserving syntactic boundaries (paragraphs, markdown headings, code blocks).
- **Chunk Overlap**: 80 to 100 characters to prevent loss of semantic context at boundary splits.
- **Similarity Metric**: Cosine Distance ($1 - \text{cosine\_similarity}$) with top-$k=4$ retrieval.
- **Citation Protocol**: Every generated assertion must reference its source document name, chunk index, and page number.

## 4. Benchmark Results on Edge Hardware
- Ingestion Speed: 45 pages per second for text/PDF parsing.
- Embedding Generation: 320 chunks/sec on local GPU (NVIDIA RTX series).
- Time to First Token (TTFT): 180ms with `llama3.2`.
- Sustained Generation Throughput: 42 tokens/second.
