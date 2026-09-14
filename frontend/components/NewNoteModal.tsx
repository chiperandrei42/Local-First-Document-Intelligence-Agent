'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { ingestTextNote } from '../lib/api';

interface NewNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const NewNoteModal: React.FC<NewNoteModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setContent('');
      setError(null);
      // Subtle delayed focus so animation completes smoothly
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, title, content]);

  if (!isOpen || !mounted) return null;

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim()) {
      setError('Please enter or paste note content.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const noteTitle = title.trim() || `Note - ${new Date().toLocaleDateString()}`;
      await ingestTextNote(noteTitle, content.trim());
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to index note');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Glassmorphic Studio Card */}
      <div 
        className="relative w-full max-w-[640px] rounded-[26px] border border-white/[0.14] bg-gradient-to-b from-[#12101C]/95 to-[#08070D]/98 p-6 sm:p-8 shadow-[0_30px_90px_rgba(0,0,0,0.9),0_0_60px_rgba(97,77,255,0.15),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-[40px] transition-all animate-in zoom-in-95 duration-200 text-white flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-2">
          <div className="flex items-center gap-4">
            <div className="w-[44px] h-[44px] rounded-[14px] bg-[#614DFF]/15 border border-[#614DFF]/30 flex items-center justify-center shadow-[0_0_20px_rgba(97,77,255,0.25)] flex-shrink-0">
              <FileText className="w-5 h-5 text-[#C3BBFF] drop-shadow-[0_0_8px_rgba(97,77,255,0.8)]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-[-0.01em]">Direct Knowledge Ingestion</h3>
              <p className="text-xs text-white/45 mt-0.5">Embed text directly into your local vector database</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer w-8 h-8 rounded-[10px] bg-white/[0.04] border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all flex-shrink-0"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 space-y-4">
          {/* Note Title Input Card */}
          <div className="bg-white/[0.025] border border-white/[0.08] focus-within:border-[#614DFF]/50 focus-within:bg-white/[0.04] focus-within:shadow-[0_0_25px_rgba(97,77,255,0.15)] rounded-[16px] p-4 transition-all">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.06em] text-white/40 mb-2">
              <span>Note Title</span>
              <span className="text-[10px] text-white/25 normal-case font-normal">Optional</span>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q3 Strategy, Clinical Notes, Interview Transcript..."
              className="w-full bg-transparent border-0 outline-none text-white text-sm font-medium placeholder:text-white/25 focus:ring-0 focus:outline-none p-0"
            />
          </div>

          {/* Content Payload Card */}
          <div className="flex-1 flex flex-col min-h-0 bg-white/[0.025] border border-white/[0.08] focus-within:border-[#614DFF]/50 focus-within:bg-white/[0.04] focus-within:shadow-[0_0_25px_rgba(97,77,255,0.15)] rounded-[16px] p-4 transition-all">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.06em] text-white/40 mb-2">
              <span>Content Payload <span className="text-[#A79FFF]">*</span></span>
              <div className="flex items-center gap-2 font-mono text-[11px] text-white/40">
                <span>{wordCount} words</span>
                <span>•</span>
                <span>{charCount} chars</span>
              </div>
            </div>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type or paste any text directly here (meeting notes, research excerpts, thoughts)..."
              rows={8}
              className="w-full flex-1 min-h-[190px] bg-transparent border-0 outline-none text-white text-sm leading-relaxed placeholder:text-white/25 focus:ring-0 focus:outline-none resize-none font-sans p-0"
              required
            />
          </div>

          {error && (
            <div className="flex items-center gap-2.5 text-xs text-red-300 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-[14px] animate-in fade-in">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
              <span className="flex-1">{error}</span>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/[0.08]">
            <div className="inline-flex items-center gap-1.5 text-xs text-white/40">
              <span>Press</span>
              <kbd className="bg-white/[0.08] border border-white/[0.12] rounded-[6px] px-2 py-0.5 font-mono text-[10px] text-white/70">
                Ctrl + Enter
              </kbd>
              <span>to store</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="cursor-pointer px-4 py-2 text-xs font-semibold text-white/50 hover:text-white hover:bg-white/[0.06] rounded-[10px] transition-all disabled:opacity-40"
              >
                Dismiss
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !content.trim()}
                className="cursor-pointer flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-[#614DFF] to-[#8C7DFF] hover:brightness-110 active:scale-[0.98] rounded-[12px] shadow-[0_0_25px_rgba(97,77,255,0.4)] hover:shadow-[0_0_35px_rgba(97,77,255,0.65)] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Indexing into Memory...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 text-white/90" />
                    <span>Index into Memory</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
