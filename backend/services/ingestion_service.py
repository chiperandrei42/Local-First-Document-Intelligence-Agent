import os
import hashlib
from typing import List, Dict, Any, Tuple
from pathlib import Path
from database.vector_store import vector_store
from services.ollama_service import ollama_service

try:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
except ImportError:
    try:
        from langchain.text_splitter import RecursiveCharacterTextSplitter
    except ImportError:
        # Standalone pure Python recursive text splitter fallback
        class RecursiveCharacterTextSplitter:
            def __init__(self, chunk_size: int = 650, chunk_overlap: int = 80, separators: List[str] = None, keep_separator: bool = True):
                self.chunk_size = chunk_size
                self.chunk_overlap = chunk_overlap
                self.separators = separators or ["\n\n", "\n", ". ", " ", ""]

            def split_text(self, text: str) -> List[str]:
                if not text:
                    return []
                chunks = []
                start = 0
                while start < len(text):
                    end = min(start + self.chunk_size, len(text))
                    chunk = text[start:end]
                    if end < len(text):
                        # try to find nearest separator
                        best_sep_idx = -1
                        for sep in self.separators:
                            pos = chunk.rfind(sep)
                            if pos != -1 and pos > len(chunk) // 2:
                                best_sep_idx = pos + len(sep)
                                break
                        if best_sep_idx != -1:
                            chunk = text[start:start + best_sep_idx]
                            start = start + best_sep_idx - self.chunk_overlap
                        else:
                            start = end - self.chunk_overlap
                    else:
                        start = end
                    if chunk.strip():
                        chunks.append(chunk.strip())
                return chunks

CHUNK_SIZE = 650
CHUNK_OVERLAP = 80
BATCH_SIZE = 16

class IngestionService:
    def __init__(self):
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP,
        )

    async def perform_native_ocr(self, image_bytes: bytes) -> str:
        """Built-in native local OCR engine (0-model downloads required, runs instantly on CPU)."""
        try:
            import winocr
            from PIL import Image
            import io
            pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
            result = await winocr.recognize_pil(pil_img, lang="en")
            if result and getattr(result, "text", None) and result.text.strip():
                return result.text.strip()
        except Exception:
            pass
        return ""

    async def extract_text_from_pdf(self, file_bytes: bytes, filename: str) -> List[Tuple[str, int]]:
        """Extract text from PDF pages, falling back to local Vision VLM and built-in Native OCR."""
        pages_content: List[Tuple[str, int]] = []
        page_count = 0

        # Method 1: PyMuPDF (pymupdf / fitz)
        try:
            try:
                import pymupdf as fitz_lib
            except ImportError:
                import fitz as fitz_lib

            doc = fitz_lib.open(stream=file_bytes, filetype="pdf")
            page_count = len(doc)
            if doc.is_encrypted:
                try:
                    doc.authenticate("")
                except Exception:
                    pass

            for page_idx in range(page_count):
                page = doc[page_idx]
                # Pass 1: Standard digital text extraction
                text = page.get_text("text").strip()
                
                # Pass 2: Layout blocks if simple text was empty
                if not text:
                    blocks = page.get_text("blocks")
                    extracted_blocks = []
                    for b in blocks:
                        if len(b) >= 5 and isinstance(b[4], str) and b[4].strip():
                            extracted_blocks.append(b[4].strip())
                    if extracted_blocks:
                        text = "\n".join(extracted_blocks)

                # Pass 3: Form fields, annotations, interactive widgets
                if not text:
                    widgets_text = []
                    for widget in page.widgets():
                        val = widget.field_value
                        if val and isinstance(val, str) and val.strip():
                            widgets_text.append(val.strip())
                    if widgets_text:
                        text = "\n".join(widgets_text)

                # Pass 4 & 5: Visual Handwriting / Scan Transcription
                if not text:
                    try:
                        pix = page.get_pixmap(dpi=150)
                        img_bytes = pix.tobytes("png")
                        
                        # Try Local Vision AI (e.g. llama3.2-vision)
                        transcribed = await ollama_service.transcribe_image(img_bytes)
                        if transcribed and transcribed.strip():
                            text = transcribed.strip()
                        else:
                            # Built-in Native OS OCR Fallback (instant, 0-download)
                            native_text = await self.perform_native_ocr(img_bytes)
                            if native_text and native_text.strip():
                                text = native_text.strip()
                    except Exception:
                        pass

                if text and text.strip():
                    pages_content.append((text.strip(), page_idx + 1))

            doc.close()
        except Exception:
            pass

        # Method 2: Fallback to PyPDF if PyMuPDF failed or returned 0 text
        if not pages_content:
            try:
                import io
                from pypdf import PdfReader
                reader = PdfReader(io.BytesIO(file_bytes))
                if reader.is_encrypted:
                    try:
                        reader.decrypt("")
                    except Exception:
                        pass
                
                page_count = max(page_count, len(reader.pages))
                for page_idx, page in enumerate(reader.pages):
                    text = page.extract_text() or ""
                    if text.strip():
                        pages_content.append((text.strip(), page_idx + 1))
            except Exception as pypdf_err:
                if not pages_content:
                    raise RuntimeError(f"Could not read PDF '{filename}': {str(pypdf_err)}")

        # Diagnostic message if PDF has pages but contains zero extractable digital text
        if not pages_content and page_count > 0:
            raise ValueError(
                f"PDF '{filename}' ({page_count} page(s)) contains no extractable text. "
                "You can install the 1-Click Vision AI model in the storage panel for deep handwriting recognition."
            )

        return pages_content

    async def process_file(self, filename: str, content_bytes: bytes) -> Dict[str, Any]:
        """Process a single document: extract text, chunk, embed, and store."""
        ext = Path(filename).suffix.lower()
        chunks: List[str] = []
        metadatas: List[Dict[str, Any]] = []
        ids: List[str] = []

        if ext == ".pdf":
            file_type = "pdf"
            pages_data = await self.extract_text_from_pdf(content_bytes, filename)
            total_chunks = 0
            for page_text, page_num in pages_data:
                splits = self.text_splitter.split_text(page_text)
                for split_idx, split_text in enumerate(splits):
                    clean_text = split_text.strip()
                    if not clean_text:
                        continue
                    chunk_id = hashlib.sha256(f"{filename}_{page_num}_{split_idx}_{clean_text[:30]}".encode()).hexdigest()[:16]
                    chunks.append(clean_text)
                    metadatas.append({
                        "source": filename,
                        "file_type": file_type,
                        "page": page_num,
                        "chunk_index": total_chunks,
                    })
                    ids.append(chunk_id)
                    total_chunks += 1

        elif ext in [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"]:
            file_type = "image"
            # 1. Try Vision VLM
            transcribed_text = await ollama_service.transcribe_image(content_bytes)
            # 2. Try Native Built-in OCR
            if not transcribed_text:
                transcribed_text = await self.perform_native_ocr(content_bytes)

            if not transcribed_text:
                raise ValueError(
                    f"Image '{filename}' contains visual/handwritten content. "
                    "Install the 1-Click Vision AI in the storage sidebar to transcribe it."
                )
            splits = self.text_splitter.split_text(transcribed_text)
            for split_idx, split_text in enumerate(splits):
                clean_text = split_text.strip()
                if not clean_text:
                    continue
                chunk_id = hashlib.sha256(f"{filename}_{split_idx}_{clean_text[:30]}".encode()).hexdigest()[:16]
                chunks.append(clean_text)
                metadatas.append({
                    "source": filename,
                    "file_type": file_type,
                    "page": 1,
                    "chunk_index": split_idx,
                })
                ids.append(chunk_id)


        else:
            file_type = "md" if ext in [".md", ".markdown"] else "txt"
            text_content = content_bytes.decode("utf-8", errors="replace")
            splits = self.text_splitter.split_text(text_content)
            for split_idx, split_text in enumerate(splits):
                clean_text = split_text.strip()
                if not clean_text:
                    continue
                chunk_id = hashlib.sha256(f"{filename}_{split_idx}_{clean_text[:30]}".encode()).hexdigest()[:16]
                chunks.append(clean_text)
                metadatas.append({
                    "source": filename,
                    "file_type": file_type,
                    "page": 1,
                    "chunk_index": split_idx,
                })
                ids.append(chunk_id)

        if not chunks:
            return {"filename": filename, "chunks": 0, "status": "empty_or_unreadable"}

        # Generate embeddings in controlled batches to protect VRAM
        all_embeddings: List[List[float]] = []
        for i in range(0, len(chunks), BATCH_SIZE):
            batch_chunks = chunks[i : i + BATCH_SIZE]
            batch_embeddings = await ollama_service.get_embeddings(batch_chunks)
            all_embeddings.extend(batch_embeddings)

        # Store in ChromaDB
        added_count = vector_store.add_chunks(
            chunks=chunks,
            metadatas=metadatas,
            ids=ids,
            embeddings=all_embeddings,
        )

        return {
            "filename": filename,
            "chunks": added_count,
            "file_type": file_type,
            "status": "indexed",
        }

    async def ingest_directory(self, dir_path: str) -> Dict[str, Any]:
        """Ingest all supported documents from a directory."""
        path = Path(dir_path)
        if not path.exists() or not path.is_dir():
            return {
                "status": "error",
                "total_files_processed": 0,
                "total_chunks_indexed": 0,
                "files": [],
                "details": f"Directory '{dir_path}' does not exist.",
            }

        supported_extensions = {".pdf", ".md", ".markdown", ".txt", ".csv", ".json", ".png", ".jpg", ".jpeg", ".webp"}
        processed_files = []
        total_chunks = 0


        for file_path in path.rglob("*"):
            if file_path.is_file() and file_path.suffix.lower() in supported_extensions:
                try:
                    with open(file_path, "rb") as f:
                        file_bytes = f.read()
                    result = await self.process_file(file_path.name, file_bytes)
                    processed_files.append(result)
                    total_chunks += result.get("chunks", 0)
                except Exception as e:
                    processed_files.append({
                        "filename": file_path.name,
                        "status": "error",
                        "error": str(e),
                        "chunks": 0,
                    })

        return {
            "status": "success",
            "total_files_processed": len(processed_files),
            "total_chunks_indexed": total_chunks,
            "files": processed_files,
        }

ingestion_service = IngestionService()
