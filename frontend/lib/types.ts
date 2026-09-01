export interface DocumentInfo {
  filename: string;
  total_chunks: number;
  source_type: string;
  pages?: number;
}

export interface Citation {
  source: string;
  page?: number;
  chunk_id?: string;
  similarity_score: number;
  snippet: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: Citation[];
  timestamp: string;
  isStreaming?: boolean;
}

export interface StatusResponse {
  ollama_connected: boolean;
  ollama_url: string;
  available_models: string[];
  default_llm: string;
  default_embed: string;
  has_vision_model?: boolean;
  vision_model?: string | null;
  recommended_vision_model?: string;
  total_documents: number;
  total_chunks: number;
  documents: DocumentInfo[];
}

export interface ModelPullProgress {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
  percent?: number;
  error?: string;
}

export interface IngestResponse {
  status: string;
  total_files_processed: number;
  total_chunks_indexed: number;
  files: Array<{
    filename: string;
    chunks?: number;
    file_type?: string;
    status: string;
    error?: string;
  }>;
  details?: string;
}

