import os
import chromadb
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")
COLLECTION_NAME = "local_rag_documents"

class VectorStoreService:
    def __init__(self, persist_dir: str = CHROMA_PERSIST_DIR):
        self.persist_dir = persist_dir
        os.makedirs(self.persist_dir, exist_ok=True)
        self.client = chromadb.PersistentClient(path=self.persist_dir)
        self.collection = self.client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"}
        )

    def add_chunks(
        self,
        chunks: List[str],
        metadatas: List[Dict[str, Any]],
        ids: List[str],
        embeddings: List[List[float]],
    ) -> int:
        """Add text chunks, metadata, and their vector embeddings to ChromaDB."""
        if not chunks:
            return 0

        # Upsert chunks to avoid duplicate ID issues
        self.collection.upsert(
            ids=ids,
            documents=chunks,
            metadatas=metadatas,
            embeddings=embeddings,
        )
        return len(chunks)

    def similarity_search(
        self,
        query_embedding: List[float],
        top_k: int = 4,
    ) -> List[Dict[str, Any]]:
        """Perform cosine similarity search on the ChromaDB collection."""
        count = self.collection.count()
        if count == 0:
            return []

        k = min(top_k, count)
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=k,
            include=["documents", "metadatas", "distances"],
        )

        retrieved_items: List[Dict[str, Any]] = []
        if results and results.get("documents") and results["documents"][0]:
            docs = results["documents"][0]
            metas = results["metadatas"][0] if results.get("metadatas") else [{}] * len(docs)
            distances = results["distances"][0] if results.get("distances") else [0.0] * len(docs)
            ids = results["ids"][0] if results.get("ids") else [""] * len(docs)

            for doc, meta, dist, chunk_id in zip(docs, metas, distances, ids):
                # Cosine distance in Chroma is 1 - cosine_similarity (range 0 to 2)
                # Similarity score normalized roughly 0.0 to 1.0
                similarity_score = max(0.0, min(1.0, 1.0 - (dist / 2.0)))
                retrieved_items.append({
                    "id": chunk_id,
                    "content": doc,
                    "metadata": meta,
                    "distance": dist,
                    "similarity_score": round(similarity_score, 4),
                })

        return retrieved_items

    def get_all_documents(self) -> List[Dict[str, Any]]:
        """Retrieve aggregated metadata for all indexed documents."""
        all_data = self.collection.get(include=["metadatas"])
        metadatas = all_data.get("metadatas", [])
        
        doc_stats: Dict[str, Dict[str, Any]] = {}
        for meta in metadatas:
            if not meta:
                continue
            source = meta.get("source", "unknown")
            page = meta.get("page", 1)
            file_type = meta.get("file_type", "txt")
            
            if source not in doc_stats:
                doc_stats[source] = {
                    "filename": source,
                    "total_chunks": 0,
                    "pages": set(),
                    "source_type": file_type,
                }
            doc_stats[source]["total_chunks"] += 1
            if page is not None:
                doc_stats[source]["pages"].add(page)

        summary = []
        for src, stat in doc_stats.items():
            summary.append({
                "filename": stat["filename"],
                "total_chunks": stat["total_chunks"],
                "source_type": stat["source_type"],
                "pages": len(stat["pages"]) if stat["pages"] else 1,
            })
        return summary

    def get_total_chunks(self) -> int:
        """Return total number of vector chunks stored."""
        return self.collection.count()

    def clear_collection(self) -> None:
        """Clear all stored vectors and documents."""
        self.client.delete_collection(name=COLLECTION_NAME)
        self.collection = self.client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"}
        )

    def delete_document_by_name(self, filename: str) -> int:
        """Delete all chunks belonging to a specific document."""
        self.collection.delete(where={"source": filename})
        return self.collection.count()

vector_store = VectorStoreService()
