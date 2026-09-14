import { 
  StatusResponse, 
  DocumentInfo, 
  IngestResponse, 
  Citation, 
  Message,
  SystemInfo,
  ModelPullProgress 
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export async function fetchStatus(): Promise<StatusResponse> {
  const res = await fetch(`${API_BASE}/api/status`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch status: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchSystemInfo(): Promise<SystemInfo> {
  const res = await fetch(`${API_BASE}/api/system`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch system specs: ${res.statusText}`);
  }
  return res.json();
}

export async function startOllamaService(): Promise<{ success: boolean; message: string; installed?: boolean }> {
  // 1. If running inside Electron desktop shell, trigger native execution directly
  if (typeof window !== 'undefined' && window.electronAPI?.startOllama) {
    try {
      const nativeRes = await window.electronAPI.startOllama();
      if (nativeRes.success) {
        return { success: true, message: nativeRes.message, installed: true };
      }
    } catch {
      // Fallback to HTTP endpoint
    }
  }

  // 2. HTTP endpoint fallback
  try {
    const res = await fetch(`${API_BASE}/api/ollama/start`, {
      method: 'POST',
    });
    if (!res.ok) {
      return {
        success: false,
        message: `Backend returned status ${res.status}`,
        installed: false,
      };
    }
    return await res.json();
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Backend connection initializing',
      installed: false,
    };
  }
}

export async function pullModelStream(
  model: string,
  onProgress: (progress: ModelPullProgress) => void,
  onDone: () => void,
  onError: (error: string) => void
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/models/pull`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model }),
  });

  if (!res.ok) {
    onError(`Server returned ${res.status}: ${res.statusText}`);
    return;
  }

  if (!res.body) {
    onError('No response body received');
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;

        const dataStr = trimmed.slice(5).trim();
        if (!dataStr) continue;

        try {
          const payload = JSON.parse(dataStr);
          if (payload.status === 'error') {
            onError(payload.message || 'Model pull error');
            return;
          }
          onProgress(payload);
          if (payload.done) {
            onDone();
            return;
          }
        } catch {
          // Fragmented JSON
        }
      }
    }
    onDone();
  } catch (err: unknown) {
    onError(err instanceof Error ? err.message : String(err));
  }
}

export async function fetchDocuments(): Promise<DocumentInfo[]> {
  const res = await fetch(`${API_BASE}/api/documents`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch documents: ${res.statusText}`);
  }
  return res.json();
}

export async function ingestDirectory(targetDir: string): Promise<IngestResponse> {
  const formData = new FormData();
  formData.append('target_dir', targetDir);

  const res = await fetch(`${API_BASE}/api/ingest`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorData.detail || 'Ingestion failed');
  }
  return res.json();
}

export async function uploadFiles(files: File[]): Promise<IngestResponse> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });

  const res = await fetch(`${API_BASE}/api/ingest`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorData.detail || 'File upload failed');
  }
  return res.json();
}

export async function ingestTextNote(title: string, content: string): Promise<IngestResponse> {
  const res = await fetch(`${API_BASE}/api/ingest/text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorData.detail || 'Failed to index note');
  }
  return res.json();
}

export async function clearDatabase(): Promise<{ status: string; message: string }> {

  const res = await fetch(`${API_BASE}/api/clear`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(`Failed to clear database: ${res.statusText}`);
  }
  return res.json();
}

export async function deleteDocument(filename: string): Promise<{ status: string; filename: string }> {
  const res = await fetch(`${API_BASE}/api/documents/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(`Failed to delete document: ${res.statusText}`);
  }
  return res.json();
}

export interface StreamChatCallbacks {
  onCitations?: (citations: Citation[]) => void;
  onToken?: (token: string) => void;
  onError?: (error: string) => void;
  onDone?: () => void;
}

export async function streamChat(
  query: string,
  history: Message[],
  model?: string,
  callbacks: StreamChatCallbacks = {}
): Promise<void> {
  const chatHistory = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: query,
      history: chatHistory,
      model: model || undefined,
      top_k: 4,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    const errorMsg = errorData.detail || `Server error (${res.status})`;
    callbacks.onError?.(errorMsg);
    return;
  }

  if (!res.body) {
    callbacks.onError?.('No response body received from server.');
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;

        const dataStr = trimmed.slice(5).trim();
        if (!dataStr) continue;

        try {
          const payload = JSON.parse(dataStr);
          if (payload.type === 'citations') {
            callbacks.onCitations?.(payload.data || []);
          } else if (payload.type === 'token') {
            callbacks.onToken?.(payload.token || '');
          } else if (payload.type === 'error') {
            callbacks.onError?.(payload.message || 'Stream error occurred');
          } else if (payload.type === 'done') {
            callbacks.onDone?.();
          }
        } catch {
          // In case of fragmented json
        }
      }
    }
    callbacks.onDone?.();
  } catch (err: unknown) {
    callbacks.onError?.(err instanceof Error ? err.message : String(err));
  }
}
