from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class DocumentChunk(BaseModel):
    id: str
    content: str
    metadata: Dict[str, Any]

class Citation(BaseModel):
    source: str
    page: Optional[int] = None
    chunk_id: Optional[str] = None
    similarity_score: float = 0.0
    snippet: str

class ChatMessage(BaseModel):
    role: str = Field(description="Role: user, assistant, system")
    content: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = Field(default_factory=list)
    top_k: Optional[int] = 4
    model: Optional[str] = None
    temperature: Optional[float] = 0.2

class IngestResponse(BaseModel):
    status: str
    total_files_processed: int
    total_chunks_indexed: int
    files: List[Dict[str, Any]]
    details: Optional[str] = None

class DocumentInfo(BaseModel):
    filename: str
    total_chunks: int
    source_type: str
    pages: Optional[int] = None

class StatusResponse(BaseModel):
    ollama_connected: bool
    ollama_url: str
    available_models: List[str]
    default_llm: str
    default_embed: str
    total_documents: int
    total_chunks: int
    documents: List[DocumentInfo]
