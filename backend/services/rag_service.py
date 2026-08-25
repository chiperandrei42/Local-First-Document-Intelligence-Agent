import json
from typing import AsyncGenerator, List, Dict, Any, Optional
from database.vector_store import vector_store
from services.ollama_service import ollama_service
from database.schemas import ChatMessage

SYSTEM_PROMPT_TEMPLATE = """You are an intelligent, local-first document analysis agent.
Your objective is to provide precise, well-structured, and factual answers based strictly on the provided document context.

Context from indexed documents:
---------------------
{context}
---------------------

Instructions:
1. Use the provided context to answer the user's inquiry thoroughly.
2. Format your response with clear Markdown (headers, bullet points, code blocks when applicable).
3. Cite your sources directly inline or at the end of key points using the format: `[Source: <filename>, Page: <page>]`.
4. If the provided context does not contain enough information to answer the question, state: "The indexed documents do not contain enough information to answer this question directly."
5. Never invent or hallucinate references."""

class RAGService:
    async def stream_query(
        self,
        query: str,
        history: Optional[List[ChatMessage]] = None,
        top_k: int = 4,
        model: Optional[str] = None,
        temperature: float = 0.2,
    ) -> AsyncGenerator[str, None]:
        """Execute RAG query and yield SSE events containing citations and streaming tokens."""
        # 1. Embed query
        try:
            query_embeddings = await ollama_service.get_embeddings([query])
            if not query_embeddings or not query_embeddings[0]:
                yield f"data: {json.dumps({'type': 'error', 'message': 'Failed to generate embedding for query'})}\n\n"
                return
            query_vector = query_embeddings[0]
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': f'Embedding error: {str(e)}'})}\n\n"
            return

        # 2. Retrieve top-k similar chunks
        retrieved = vector_store.similarity_search(query_embedding=query_vector, top_k=top_k)

        # 3. Format citations
        citations = []
        context_parts = []
        for idx, item in enumerate(retrieved, start=1):
            meta = item.get("metadata", {})
            source = meta.get("source", "Document")
            page = meta.get("page", 1)
            snippet = item.get("content", "")
            score = item.get("similarity_score", 0.0)

            citations.append({
                "source": source,
                "page": page,
                "chunk_id": item.get("id"),
                "similarity_score": score,
                "snippet": snippet[:350] + ("..." if len(snippet) > 350 else ""),
            })

            context_parts.append(
                f"[Source #{idx}: {source} (Page {page}) - Match Confidence: {int(score*100)}%]\n{snippet}\n"
            )

        # Send citations first so frontend can display referenced sources immediately
        yield f"data: {json.dumps({'type': 'citations', 'data': citations})}\n\n"

        # 4. Construct prompt
        if context_parts:
            context_block = "\n\n".join(context_parts)
        else:
            context_block = "No relevant documents found in the local vector database."

        system_prompt = SYSTEM_PROMPT_TEMPLATE.format(context=context_block)

        # Incorporate conversation history if present
        conversation_context = ""
        if history:
            recent_history = history[-4:] # Last 2 turns to preserve context window
            for msg in recent_history:
                conversation_context += f"{msg.role.upper()}: {msg.content}\n"

        full_prompt = f"{conversation_context}USER: {query}\nASSISTANT:" if conversation_context else query

        # 5. Stream tokens from Ollama
        try:
            async for token in ollama_service.stream_chat(
                prompt=full_prompt,
                system_prompt=system_prompt,
                model=model,
                temperature=temperature,
            ):
                yield f"data: {json.dumps({'type': 'token', 'token': token})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': f'Generation error: {str(e)}'})}\n\n"

        # Send completion event
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

rag_service = RAGService()
