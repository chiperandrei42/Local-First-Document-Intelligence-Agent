import os
import pytest
from database.vector_store import vector_store
from database.schemas import ChatRequest, StatusResponse, IngestResponse

def test_vector_store_initialization():
    assert vector_store is not None
    assert vector_store.collection is not None

def test_schemas():
    req = ChatRequest(message="Test query")
    assert req.message == "Test query"
    assert req.top_k == 4

    status = StatusResponse(
        ollama_connected=True,
        ollama_url="http://localhost:11434",
        available_models=["llama3.2", "nomic-embed-text"],
        default_llm="llama3.2",
        default_embed="nomic-embed-text",
        total_documents=1,
        total_chunks=5,
        documents=[]
    )
    assert status.ollama_connected is True
    assert status.total_chunks == 5
