'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';


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
  HardDrive,
  Info,
  Check,
  Edit3,
  Plus
} from 'lucide-react';

import { DocumentInfo } from '@/lib/types';
import { ingestDirectory, uploadFiles, clearDatabase, deleteDocument } from '@/lib/api';
import { NewNoteModal } from './NewNoteModal';


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
  const [mounted, setMounted] = useState(false);
  const [isNewNoteOpen, setIsNewNoteOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    setMounted(true);
  }, []);




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

    const fileArray = Array.from(files);

    try {
      setIsIngesting(true);
      setIsError(false);
      setIngestStatus(`Uploading and parsing ${files.length} document(s)...`);
      const res = await uploadFiles(fileArray);
      
      if (res.total_chunks_indexed > 0) {
        setIngestStatus(`Successfully uploaded and indexed ${res.total_chunks_indexed} chunks.`);
        setIsError(false);
      } else {
        setIsError(true);
        setIngestStatus(res.details || 'No extractable text found in uploaded file(s). If scanned, ensure document has an OCR text layer.');
      }

      await onRefreshData();
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setIngestStatus(null), 6000);
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

    const fileArray = Array.from(files);

    try {
      setIsIngesting(true);
      setIsError(false);
      setIngestStatus(`Parsing dropped ${files.length} file(s)...`);
      const res = await uploadFiles(fileArray);

      if (res.total_chunks_indexed > 0) {
        setIngestStatus(`Successfully indexed ${res.total_chunks_indexed} chunks.`);
        setIsError(false);
      } else {
        setIsError(true);
        setIngestStatus(res.details || 'No extractable text found in dropped file(s).');
      }

      await onRefreshData();
      setTimeout(() => setIngestStatus(null), 6000);
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
    const ext = name.toLowerCase().split('.').pop() || '';
    if (type === 'note' || ext === 'note') {
      return <Edit3 className="h-4 w-4 text-[#A79FFF]" />;
    }
    if (type === 'pdf' || ext === 'pdf') return <BookOpen className="h-4 w-4 text-violet-400" />;
    if (type === 'md' || ext === 'md' || ext === 'markdown') return <FileCode className="h-4 w-4 text-[#614DFF]" />;
    return <FileText className="h-4 w-4 text-white/50" />;
  };



  return (
    <div 
      className={`h-full flex-shrink-0 flex flex-col border-r border-white/5 bg-[#060607]/80 backdrop-blur-md shadow-2xl transition-all duration-300 overflow-hidden ${
        isOpen ? 'w80 sm:w-96 opacity-100' : 'w-0 opacity-0 border-r-0'
      }`}
    >
      <div className="w-80 sm:w-96 h-full flex flex-col">
        {/* Sidebar Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.03] border border-white/10 p-1.5 shadow-[0_0_15px_rgba(97,77,255,0.15)]">
              <Image 
                src="/cetera-icon-transparent.png" 
                alt="cetera" 
                width={26} 
                height={26}
                className="drop-shadow-[0_0_6px_rgba(97,77,255,0.5)]"
              />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-wide">Document Storage</h2>
              <p className="text-xs text-white/40 mt-0.5">
                {documents.length} files • {totalChunks} chunks
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg p-2 text-white/40 hover:bg-white/5 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
          
          {/* Quick Ingestion Actions */}
          <div className="space-y-3">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
              Pipelines
            </span>

            <div className="grid grid-cols-1 gap-3">
              {/* Direct Note / Paste Ingestion */}
              <button
                onClick={() => setIsNewNoteOpen(true)}
                disabled={isIngesting}
                className="cursor-pointer flex items-center gap-3 rounded-2xl border border-[#614DFF]/30 bg-[#614DFF]/10 p-4 text-left transition-all duration-200 hover:bg-[#614DFF]/20 hover:border-[#614DFF]/50 disabled:opacity-50 group shadow-[0_0_15px_rgba(97,77,255,0.1)]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#614DFF]/20 text-[#A79FFF] group-hover:bg-[#614DFF]/30 transition-colors duration-200">
                  <Edit3 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-white group-hover:text-white transition-colors duration-200">
                    New Note / Paste Text
                  </div>
                  <div className="text-xs text-[#A79FFF]/70 mt-0.5 truncate">
                    Direct text or tablet transcript
                  </div>
                </div>
                <Plus className="h-4 w-4 text-[#A79FFF] ml-auto flex-shrink-0" />
              </button>

              {/* Quick Ingest Example Data */}
              <button
                onClick={handleIngestExampleData}
                disabled={isIngesting}
                className="cursor-pointer flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-left transition-colors duration-200 hover:bg-white/[0.05] hover:border-white/10 disabled:opacity-50 group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white/60 group-hover:bg-white/10 group-hover:text-white transition-colors duration-200">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white/90 group-hover:text-white transition-colors duration-200">
                    Example Dataset
                  </div>
                  <div className="text-xs text-white/40 mt-0.5">
                    Load sample public data
                  </div>
                </div>
                {isIngesting && <Loader2 className="h-4 w-4 animate-spin text-[#614DFF] ml-auto" />}
              </button>

              {/* Ingest /data Directory */}
              <button
                onClick={handleIngestDataFolder}
                disabled={isIngesting}
                className="cursor-pointer flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-left transition-colors duration-200 hover:bg-white/[0.05] hover:border-white/10 disabled:opacity-50 group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white/60 group-hover:bg-white/10 group-hover:text-white transition-colors duration-200">
                  <HardDrive className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white/90 group-hover:text-white transition-colors duration-200">
                    Local Folder
                  </div>
                  <div className="text-xs text-white/40 mt-0.5">
                    Index /data directory
                  </div>
                </div>
              </button>

            </div>
          </div>

          {/* Upload Custom Files Box */}
          <div className="space-y-3">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
              Upload
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
              className={`flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed p-6 text-center transition-all duration-300 ${
                isDragging
                  ? 'border-[#614DFF] bg-[#614DFF]/10'
                  : 'border-white/20 bg-white/[0.02] hover:border-[#614DFF]/50 hover:bg-white/[0.04]'
              }`}
            >
              <UploadCloud className={`h-8 w-8 mb-3 transition-colors ${isDragging ? 'text-[#614DFF]' : 'text-white/60'}`} />
              <p className="text-sm font-medium text-white/80">
                Click or drag files here
              </p>
              <p className="text-[11px] text-white/40 mt-1">
                Supports PDF, Markdown & text files
              </p>
              <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] text-white/40">PDF</span>
                <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] text-white/40">MD</span>
                <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] text-white/40">TXT</span>
              </div>
            </div>
          </div>


          {/* Feedback / Status Alert */}
          {ingestStatus && (
            <div className={`flex items-center gap-3 rounded-2xl p-4 text-sm font-medium border animate-slide-up ${
              isError 
                ? 'border-red-500/20 bg-red-500/10 text-red-400' 
                : 'border-[#614DFF]/20 bg-[#614DFF]/10 text-[#7563FF]'
            }`}>
              {isError ? <AlertCircle className="h-5 w-5 flex-shrink-0" /> : <CheckCircle2 className="h-5 w-5 flex-shrink-0" />}
              <span className="flex-1 leading-snug">{ingestStatus}</span>
            </div>
          )}

          {/* Ingested Documents List */}
          <div className="space-y-3">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
              Indexed Files ({documents.length})
            </span>

            {documents.length === 0 ? (
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 text-center text-sm text-white/40">
                No documents indexed yet.
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.06] group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 flex-shrink-0">
                        {getFileIcon(doc.source_type, doc.filename)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white/90">
                          {doc.filename}
                        </p>
                        <p className="text-[11px] text-white/40 mt-0.5">
                          {doc.total_chunks} chunks {doc.pages && doc.pages > 1 ? `• ${doc.pages} pages` : ''}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteDoc(doc.filename)}
                      className="cursor-pointer ml-2 rounded-xl p-2 text-white/40 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400 transition-all focus:opacity-100"
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
        <div className="border-t border-white/5 bg-[#060607] p-5">
          <button
            onClick={handleClearAll}
            disabled={!mounted || documents.length === 0 || isIngesting}
            suppressHydrationWarning
            className="cursor-pointer w-full flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 py-3 text-sm font-semibold text-red-400 transition-all hover:bg-red-500/20 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Trash2 className="h-4 w-4" />
            <span>Purge Database</span>
          </button>
        </div>

      </div>

      {/* Direct Quick Note / Paste Modal */}
      <NewNoteModal 
        isOpen={isNewNoteOpen} 
        onClose={() => setIsNewNoteOpen(false)} 
        onSuccess={onRefreshData} 
      />
    </div>
  );
};



