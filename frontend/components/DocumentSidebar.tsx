'use client';

import React, { useState, useRef } from 'react';
import { 
  X, 
  UploadCloud, 
  FolderPlus, 
  FileText, 
  Trash2, 
  Database, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  FileCode,
  BookOpen,
  Sparkles,
  Layers,
  HardDrive
} from 'lucide-react';
import { DocumentInfo } from '@/lib/types';
import { ingestDirectory, uploadFiles, clearDatabase, deleteDocument } from '@/lib/api';

interface DocumentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentInfo[];
  totalChunks: number;
  onRefreshData: () => Promise<void>;
}

export const DocumentSidebar: React.FC<DocumentSidebarProps> = ({
  isOpen,
  onClose,
  documents,
  totalChunks,
  onRefreshData,
}) => {
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestStatus, setIngestStatus] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleIngestExampleData = async () => {
    try {
      setIsIngesting(true);
      setIsError(false);
      setIngestStatus('Ingesting example dataset...');
      const res = await ingestDirectory('example-data');
      setIngestStatus(`Success! Indexed ${res.total_chunks_indexed} chunks.`);
      await onRefreshData();
      setTimeout(() => setIngestStatus(null), 4000);
    } catch (err: unknown) {
      setIsError(true);
      setIngestStatus(err instanceof Error ? err.message : 'Ingestion failed');
    } finally {
      setIsIngesting(false);
    }
  };

  const handleIngestDataFolder = async () => {
    try {
      setIsIngesting(true);
      setIsError(false);
      setIngestStatus('Scanning and indexing /data folder...');
      const res = await ingestDirectory('data');
      setIngestStatus(`Indexed ${res.total_chunks_indexed} chunks from /data.`);
      await onRefreshData();
      setTimeout(() => setIngestStatus(null), 4000);
    } catch (err: unknown) {
      setIsError(true);
      setIngestStatus(err instanceof Error ? err.message : 'Ingestion failed');
    } finally {
      setIsIngesting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsIngesting(true);
      setIsError(false);
      setIngestStatus(`Uploading and parsing ${files.length} document(s)...`);
      const fileArray = Array.from(files);
      const res = await uploadFiles(fileArray);
      setIngestStatus(`Uploaded and indexed ${res.total_chunks_indexed} chunks.`);
      await onRefreshData();
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setIngestStatus(null), 4000);
    } catch (err: unknown) {
      setIsError(true);
      setIngestStatus(err instanceof Error ? err.message : 'File upload failed');
    } finally {
      setIsIngesting(false);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    try {
      setIsIngesting(true);
      setIsError(false);
      setIngestStatus(`Parsing dropped ${files.length} file(s)...`);
      const fileArray = Array.from(files);
      const res = await uploadFiles(fileArray);
      setIngestStatus(`Indexed ${res.total_chunks_indexed} chunks.`);
      await onRefreshData();
      setTimeout(() => setIngestStatus(null), 4000);
    } catch (err: unknown) {
      setIsError(true);
      setIngestStatus(err instanceof Error ? err.message : 'Drop upload failed');
    } finally {
      setIsIngesting(false);
    }
  };

  const handleDeleteDoc = async (filename: string) => {
    if (!confirm(`Remove "${filename}" and its vector embeddings?`)) return;
    try {
      await deleteDocument(filename);
      await onRefreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all indexed documents and vector embeddings?')) return;
    try {
      setIsIngesting(true);
      await clearDatabase();
      await onRefreshData();
      setIngestStatus('Vector database cleared.');
      setTimeout(() => setIngestStatus(null), 3000);
    } catch (err: unknown) {
      setIsError(true);
      setIngestStatus(err instanceof Error ? err.message : 'Failed to clear database');
    } finally {
      setIsIngesting(false);
    }
  };

  const getFileIcon = (type: string, name: string) => {
    if (type === 'pdf' || name.endsWith('.pdf')) return <BookOpen className="h-4 w-4 text-[#00ff88]" />;
    if (type === 'md' || name.endsWith('.md')) return <FileCode className="h-4 w-4 text-emerald-400" />;
    return <FileText className="h-4 w-4 text-slate-400" />;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-emerald-900/40 bg-[#030704]/95 backdrop-blur-2xl shadow-[-10px_0_30px_rgba(0,0,0,0.8)] transition-all duration-300">
      
      {/* Sidebar Header */}
      <div className="flex items-center justify-between border-b border-emerald-900/40 px-6 py-4 bg-[#070e0a]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-950/60 border border-[#00ff88]/40 text-[#00ff88] shadow-[0_0_10px_rgba(0,255,136,0.15)]">
            <Database className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white font-mono">VECTOR_STORE</h2>
            <p className="text-xs text-emerald-400/80 font-mono">
              {documents.length} files • {totalChunks} indexed chunks
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-emerald-950/60 hover:text-[#00ff88] transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        
        {/* Quick Ingestion Actions */}
        <div className="space-y-3">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-400/70">
            INGESTION PIPELINES
          </span>

          <div className="grid grid-cols-1 gap-2.5">
            {/* Quick Ingest Example Data */}
            <button
              onClick={handleIngestExampleData}
              disabled={isIngesting}
              className="cursor-pointer flex items-center justify-between rounded-xl border border-[#00ff88]/30 bg-gradient-to-r from-emerald-950/50 to-[#070e0a] p-3 text-left transition-all hover:border-[#00ff88] hover:shadow-[0_0_15px_rgba(0,255,136,0.2)] disabled:opacity-50 group"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00ff88]/20 border border-[#00ff88]/30 text-[#00ff88]">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-mono font-semibold text-emerald-100 group-hover:text-[#00ff88] transition-colors">
                    Load Example Dataset
                  </div>
                  <div className="text-[11px] text-emerald-400/60">
                    Ingest /example-data public PDF & MD
                  </div>
                </div>
              </div>
              {isIngesting ? <Loader2 className="h-4 w-4 animate-spin text-[#00ff88]" /> : null}
            </button>

            {/* Ingest /data Directory */}
            <button
              onClick={handleIngestDataFolder}
              disabled={isIngesting}
              className="cursor-pointer flex items-center justify-between rounded-xl border border-emerald-900/40 bg-[#070e0a] p-3 text-left transition-all hover:border-emerald-500/50 hover:bg-emerald-950/30 disabled:opacity-50 group"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-950/80 border border-emerald-800/40 text-emerald-400">
                  <HardDrive className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-mono font-semibold text-slate-200 group-hover:text-emerald-300 transition-colors">
                    Index Local /data Folder
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Scan private PDFs and markdown files
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Upload Custom Files Box with Drag and Drop */}
        <div className="space-y-2">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-400/70">
            UPLOAD LOCAL DOCUMENTS
          </span>
          <input
            type="file"
            multiple
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,.md,.markdown,.txt"
            className="hidden"
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 text-center transition-all ${
              isDragging
                ? 'border-[#00ff88] bg-emerald-950/60 shadow-[0_0_20px_rgba(0,255,136,0.3)]'
                : 'border-emerald-900/60 bg-[#070e0a]/60 hover:border-[#00ff88]/60 hover:bg-emerald-950/30'
            }`}
          >
            <UploadCloud className="h-7 w-7 text-[#00ff88] mb-2" />
            <p className="text-xs font-mono font-medium text-emerald-200">
              Click or Drag documents here
            </p>
            <div className="flex gap-1.5 mt-2">
              <span className="rounded bg-emerald-950 px-1.5 py-0.5 text-[10px] font-mono text-emerald-400 border border-emerald-800/40">.PDF</span>
              <span className="rounded bg-emerald-950 px-1.5 py-0.5 text-[10px] font-mono text-emerald-400 border border-emerald-800/40">.MD</span>
              <span className="rounded bg-emerald-950 px-1.5 py-0.5 text-[10px] font-mono text-emerald-400 border border-emerald-800/40">.TXT</span>
            </div>
          </div>
        </div>

        {/* Feedback / Status Alert */}
        {ingestStatus ? (
          <div className={`flex items-center gap-2 rounded-xl p-3 text-xs font-mono font-medium border ${
            isError 
              ? 'border-rose-500/40 bg-rose-950/40 text-rose-300' 
              : 'border-[#00ff88]/40 bg-emerald-950/60 text-[#00ff88] shadow-[0_0_12px_rgba(0,255,136,0.15)]'
          }`}>
            {isError ? <AlertCircle className="h-4 w-4 flex-shrink-0" /> : <CheckCircle2 className="h-4 w-4 flex-shrink-0" />}
            <span className="flex-1">{ingestStatus}</span>
          </div>
        ) : null}

        {/* Ingested Documents List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-400/70">
              INDEXED FILES ({documents.length})
            </span>
          </div>

          {documents.length === 0 ? (
            <div className="rounded-xl border border-emerald-900/30 bg-[#070e0a]/40 p-4 text-center text-xs font-mono text-slate-500">
              No documents indexed in ChromaDB collection yet.
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl border border-emerald-900/40 bg-[#070e0a] p-3 transition-all hover:border-emerald-500/40 hover:bg-emerald-950/20"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-950/80 border border-emerald-900/60 flex-shrink-0">
                      {getFileIcon(doc.source_type, doc.filename)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-mono font-medium text-emerald-100">
                        {doc.filename}
                      </p>
                      <p className="text-[11px] font-mono text-emerald-500/70">
                        {doc.total_chunks} chunks {doc.pages && doc.pages > 1 ? `• ${doc.pages} pages` : ''}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteDoc(doc.filename)}
                    className="cursor-pointer ml-2 rounded-lg p-1.5 text-slate-500 hover:bg-rose-950/40 hover:text-rose-400 transition-colors"
                    title="Delete document vectors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="border-t border-emerald-900/40 bg-[#070e0a] p-4">
        <button
          onClick={handleClearAll}
          disabled={documents.length === 0 || isIngesting}
          className="cursor-pointer w-full flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/30 py-2.5 text-xs font-mono font-semibold text-rose-300 transition-all hover:bg-rose-950/60 hover:border-rose-500/60 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>PURGE VECTOR DATABASE</span>
        </button>
      </div>
    </div>
  );
};
