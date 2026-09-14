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
  total_documents: number;
  total_chunks: number;
  documents: DocumentInfo[];
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

export interface SystemInfo {
  total_ram_gb: number;
  available_ram_gb: number;
  cpu_count: number;
  os_platform: string;
  ram_status: 'optimal' | 'compatible' | 'limited';
  is_vram_safe: boolean;
  recommended_llm: string;
  recommended_embed: string;
}

export interface ModelPullProgress {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
  percent?: number;
  done?: boolean;
  message?: string;
}

export interface ElectronAPI {
  isElectron: boolean;
  platform: string;
  getSystemSpecs: () => Promise<SystemInfo>;
  startOllama: () => Promise<{ success: boolean; message: string; running: boolean }>;
  checkOllama: () => Promise<boolean>;
  checkBackend: () => Promise<boolean>;
  openExternal: (url: string) => Promise<boolean>;
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
