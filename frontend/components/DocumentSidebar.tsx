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
  Sparkles
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
    if (type === 'pdf' || name.endsWith('.pdf')) return <BookOpen className="h-4 w-4 text-rose-400" />;
    if (type === 'md' || name.endsWith('.md')) return <FileCode className="h-4 w-4 text-cyan-400" />;
    return <FileText className="h-4 w-4 text-slate-400" />;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-slate-800 bg-slate-950/95 backdrop-blur-2xl shadow-2xl transition-all duration-300">
      
      {/* Sidebar Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Database className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Document Store</h2>
            <p className="text-xs text-slate-400">
              {documents.length} files • {totalChunks} indexed chunks
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-900 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        
        {/* Quick Ingestion Actions */}
        <div className="space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Ingestion Pipeline
          </span>

          <div className="grid grid-cols-1 gap-2.5">
            {/* Quick Ingest Example Data */}
            <button
              onClick={handleIngestExampleData}
              disabled={isIngesting}
              className="flex items-center justify-between rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 to-slate-900/60 p-3 text-left transition-all hover:border-cyan-500 hover:bg-cyan-950/60 disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-cyan-200">Load Example Data</div>
                  <div className="text-[11px] text-slate-400">Ingest /example-data public PDF & MD</div>
                </div>
              </div>
              {isIngesting ? <Loader2 className="h-4 w-4 animate-spin text-cyan-400" /> : null}
            </button>

            {/* Ingest /data Directory */}
            <button
              onClick={handleIngestDataFolder}
              disabled={isIngesting}
              className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-left transition-all hover:border-slate-700 hover:bg-slate-850 disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300">
                  <FolderPlus className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200">Index Local /data Folder</div>
                  <div className="text-[11px] text-slate-400">Scan private PDFs and markdown files</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Upload Custom Files Box */}
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Upload Local Files
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
            className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900/40 p-5 text-center transition-all hover:border-cyan-500/60 hover:bg-slate-900/80"
          >
            <UploadCloud className="h-7 w-7 text-cyan-400 mb-2" />
            <p className="text-xs font-medium text-slate-200">
              Click to select local documents
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Supports PDF, Markdown, and TXT files
            </p>
          </div>
        </div>

        {/* Feedback / Status Alert */}
        {ingestStatus && (
          <div className={`flex items-center gap-2 rounded-xl p-3 text-xs font-medium border ${
            isError 
              ? 'border-rose-500/40 bg-rose-950/40 text-rose-300' 
              : 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
          }`}>
            {isError ? <AlertCircle className="h-4 w-4 flex-shrink-0" /> : <CheckCircle2 className="h-4 w-4 flex-shrink-0" />}
            <span className="flex-1">{ingestStatus}</span>
          </div>
        )}

        {/* Ingested Documents List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Indexed Documents ({documents.length})
            </span>
          </div>

          {documents.length === 0 ? (
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/30 p-4 text-center text-xs text-slate-400">
              No documents indexed yet. Click &quot;Load Example Data&quot; or upload files to begin.
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-900/60 p-3 transition-all hover:border-slate-700 hover:bg-slate-900"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 flex-shrink-0">
                      {getFileIcon(doc.source_type, doc.filename)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-slate-200">
                        {doc.filename}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {doc.total_chunks} chunks {doc.pages && doc.pages > 1 ? `• ${doc.pages} pages` : ''}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteDoc(doc.filename)}
                    className="ml-2 rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
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
      <div className="border-t border-slate-800/80 bg-slate-950 p-4">
        <button
          onClick={handleClearAll}
          disabled={documents.length === 0 || isIngesting}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 py-2.5 text-xs font-semibold text-rose-300 transition-all hover:bg-rose-500/20 disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Clear Vector Database</span>
        </button>
      </div>
    </div>
  );
};
