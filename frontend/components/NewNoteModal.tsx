'use client';

import React, { useState, useEffect } from 'react';
import { X, FileText, CheckCircle2, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { ingestTextNote } from '../lib/api';

interface NewNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const NewNoteModal: React.FC<NewNoteModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setContent('');
      setError(null);
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

  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div 
        className="relative w-full max-w-xl rounded-2xl border border-white/10 bg-[#0B0B0E] p-6 shadow-2xl transition-all animate-in zoom-in-95 text-white flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#614DFF]/15 text-[#A79FFF] border border-[#614DFF]/30">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-wide">Quick Note / Direct Text Ingestion</h2>
              <p className="text-[11px] text-white/40">Paste notes, research summaries, or clipboard text directly into vector memory</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-white/40 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 space-y-4">
          <div>
            <label className="block text-[11px] font-medium text-white/60 mb-1.5">
              Note Title <span className="text-white/30 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Meeting Minutes, Research Summary, Project Outline..."
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs text-white placeholder-white/20 focus:border-[#614DFF]/60 focus:bg-white/[0.07] focus:outline-none transition-all"
            />
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-medium text-white/60">
                Note Content <span className="text-[#A79FFF]">*</span>
              </label>
              <div className="flex items-center gap-2 text-[10px] text-white/30 font-mono">
                <span>{wordCount} words</span>
                <span>•</span>
                <span>{charCount} chars</span>
              </div>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste or write your meeting notes, research summaries, draft text, or ideas here..."
              rows={9}
              className="w-full flex-1 min-h-[160px] rounded-xl border border-white/10 bg-white/5 p-3.5 text-xs text-white placeholder-white/20 focus:border-[#614DFF]/60 focus:bg-white/[0.07] focus:outline-none transition-all resize-none font-sans leading-relaxed"
              required
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-white/5">
            <span className="text-[10px] text-white/30">
              Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/60 font-mono">Ctrl + Enter</kbd> to index
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="cursor-pointer px-3.5 py-2 text-xs text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !content.trim()}
                className="cursor-pointer flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-[#614DFF] to-[#7B69FF] hover:from-[#6B58FF] hover:to-[#8C7DFF] rounded-xl transition-all shadow-[0_0_15px_rgba(97,77,255,0.25)] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Indexing Vector Memory...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Index Note</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
