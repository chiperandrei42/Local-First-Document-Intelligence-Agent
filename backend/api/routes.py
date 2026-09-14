import os
import platform
import json
from typing import List, Optional
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
import psutil

from database.schemas import (
    ChatRequest, 
    IngestResponse, 
    StatusResponse, 
    DocumentInfo, 
    TextIngestRequest,
    SystemInfoResponse,
    ModelPullRequest,
)
from database.vector_store import vector_store
from services.ollama_service import ollama_service
from services.ingestion_service import ingestion_service
from services.rag_service import rag_service


load_dotenv()

router = APIRouter(prefix="/api", tags=["RAG"])

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = os.getenv("DATA_DIR", str(BASE_DIR / "data"))
EXAMPLE_DATA_DIR = os.getenv("EXAMPLE_DATA_DIR", str(BASE_DIR / "example-data"))

@router.get("/status", response_model=StatusResponse)
async def get_status():
    """Retrieve system health, Ollama status, model inventory, and vector collection stats."""
    ollama_info = await ollama_service.check_health()
    docs = vector_store.get_all_documents()
    total_chunks = vector_store.get_total_chunks()

    doc_models = [
        DocumentInfo(
            filename=d["filename"],
            total_chunks=d["total_chunks"],
            source_type=d["source_type"],
            pages=d.get("pages", 1)
        )
        for d in docs
    ]

    return StatusResponse(
        ollama_connected=ollama_info["connected"],
        ollama_url=ollama_info["url"],
        available_models=ollama_info["models"],
        default_llm=ollama_info["default_llm"],
        default_embed=ollama_info["default_embed"],
        total_documents=len(docs),
        total_chunks=total_chunks,
        documents=doc_models,
    )


@router.get("/system", response_model=SystemInfoResponse)
async def get_system_info():
    """Retrieve host system hardware specs: RAM, CPU cores, platform OS, and VRAM safety status."""
    try:
        mem = psutil.virtual_memory()
        total_ram = round(mem.total / (1024**3), 1)
        avail_ram = round(mem.available / (1024**3), 1)
    except Exception:
        total_ram = 8.0
        avail_ram = 4.0

    cpus = os.cpu_count() or 4
    system_name = platform.system().lower()

    if total_ram >= 15.0:
        ram_status = "optimal"
    elif total_ram >= 7.5:
        ram_status = "compatible"
    else:
        ram_status = "limited"

    return SystemInfoResponse(
        total_ram_gb=total_ram,
        available_ram_gb=avail_ram,
        cpu_count=cpus,
        os_platform=system_name,
        ram_status=ram_status,
        is_vram_safe=True,
        recommended_llm="llama3.2",
        recommended_embed="nomic-embed-text",
    )


@router.post("/ollama/start")
async def start_ollama():
    """Attempt to launch the host native Ollama background service if not running."""
    result = ollama_service.try_start_ollama()
    return result


@router.post("/models/pull")
async def pull_model(request: ModelPullRequest):
    """Stream model pull download progress via SSE from local Ollama daemon."""
    async def event_generator():
        async for progress in ollama_service.pull_model_stream(request.model):
            yield f"data: {json.dumps(progress)}\n\n"
        yield "data: {\"done\": true, \"status\": \"success\"}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.get("/documents", response_model=List[DocumentInfo])
async def get_documents():
    """List all indexed documents with chunk and page counts."""
    docs = vector_store.get_all_documents()
    return [
        DocumentInfo(
            filename=d["filename"],
            total_chunks=d["total_chunks"],
            source_type=d["source_type"],
            pages=d.get("pages", 1)
        )
        for d in docs
    ]

@router.post("/ingest", response_model=IngestResponse)
async def ingest_documents(
    target_dir: Optional[str] = Form(None),
    files: Optional[List[UploadFile]] = File(None),
):
    """Ingest documents from folder ('data' or 'example-data') or directly uploaded files."""
    # Check Ollama connection first
    ollama_info = await ollama_service.check_health()
    if not ollama_info["connected"]:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Ollama is not reachable at {ollama_info['url']}. Ensure Ollama is running.",
        )

    # 1. Directory based ingestion
    if target_dir:
        dir_to_scan = ""
        if target_dir in ["example-data", "example_data"]:
            dir_to_scan = str(BASE_DIR / "example-data")
        elif target_dir in ["data"]:
            dir_to_scan = str(BASE_DIR / "data")
        else:
            dir_to_scan = target_dir

        result = await ingestion_service.ingest_directory(dir_to_scan)
        return IngestResponse(
            status=result.get("status", "success"),
            total_files_processed=result.get("total_files_processed", 0),
            total_chunks_indexed=result.get("total_chunks_indexed", 0),
            files=result.get("files", []),
            details=result.get("details"),
        )

    # 2. File upload based ingestion
    if files:
        processed_files = []
        total_chunks = 0
        issue_details = []
        for file in files:
            try:
                content = await file.read()
                res = await ingestion_service.process_file(file.filename, content)
                processed_files.append(res)
                total_chunks += res.get("chunks", 0)
                if res.get("status") == "empty_or_unreadable":
                    issue_details.append(f"'{file.filename}' has no readable text.")
            except Exception as e:
                processed_files.append({
                    "filename": file.filename,
                    "status": "error",
                    "error": str(e),
                    "chunks": 0,
                })
                issue_details.append(f"'{file.filename}': {str(e)}")

        details_msg = " | ".join(issue_details) if issue_details else None

        return IngestResponse(
            status="success" if total_chunks > 0 else "warning",
            total_files_processed=len(processed_files),
            total_chunks_indexed=total_chunks,
            files=processed_files,
            details=details_msg,
        )


    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Must provide either target_dir or upload files.",
    )

@router.post("/ingest/text", response_model=IngestResponse)
async def ingest_text_note(payload: TextIngestRequest):
    """Directly ingest a plain-text note, meeting summary, or clipboard content into vector storage."""
    ollama_info = await ollama_service.check_health()
    if not ollama_info["connected"]:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Ollama is not reachable at {ollama_info['url']}. Ensure Ollama is running.",
        )

    if not payload.content or not payload.content.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Note content cannot be empty.",
        )

    res = await ingestion_service.process_text_note(payload.title, payload.content)
    return IngestResponse(
        status="success" if res.get("chunks", 0) > 0 else "empty",
        total_files_processed=1,
        total_chunks_indexed=res.get("chunks", 0),
        files=[res],
        details=None,
    )


@router.post("/chat")
async def chat_stream(request: ChatRequest):
    """Streaming chat endpoint using Server-Sent Events (SSE)."""
    # Check Ollama connection first
    ollama_info = await ollama_service.check_health()
    if not ollama_info["connected"]:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Ollama daemon is not running at {ollama_info['url']}.",
        )

    return StreamingResponse(
        rag_service.stream_query(
            query=request.message,
            history=request.history,
            top_k=request.top_k or 4,
            model=request.model,
            temperature=request.temperature if request.temperature is not None else 0.2,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )

@router.delete("/clear")
async def clear_database():
    """Clear all documents and chunks from the vector database."""
    vector_store.clear_collection()
    return {"status": "success", "message": "All indexed vectors and documents have been cleared."}

@router.delete("/documents/{filename}")
async def delete_document(filename: str):
    """Delete a single document's chunks from the vector database."""
    remaining = vector_store.delete_document_by_name(filename)
    return {"status": "success", "filename": filename, "remaining_chunks": remaining}
