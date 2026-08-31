'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  Sparkles, 
  Copy, 
  Check, 
  Terminal,
  Activity
} from 'lucide-react';
import { Citation } from '@/lib/types';

interface SourceInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  citations: Citation[];
  initialIndex?: number;
}

export const SourceInspectorModal: React.FC<SourceInspectorModalProps> = ({
  isOpen,
  onClose,
  citations,
  initialIndex = 0,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSelectedIndex(initialIndex);
  }, [initialIndex, isOpen]);

  // Keyboard shortcut: Escape to close modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen || citations.length === 0) return null;

  const currentCitation = citations[selectedIndex] || citations[0];
  const confidenceScore = Math.round((currentCitation.similarity_score || 0.8) * 100);

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(currentCitation.snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#030704]/85 backdrop-blur-xl transition-all">
      <div className="flex flex-col w-full max-w-3xl max-h-[85vh] rounded-2xl border border-emerald-500/30 bg-[#070e0a] shadow-[0_0_50px_rgba(0,0,0,0.9),0_0_30px_rgba(0,255,136,0.15)] overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-emerald-900/40 bg-[#030704] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-950/80 border border-[#00ff88]/40 text-[#00ff88] shadow-[0_0_10px_rgba(0,255,136,0.15)]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white font-mono">CONTEXT_CHUNK_INSPECTOR</h2>
              <p className="text-xs font-mono text-emerald-400/70">
                ChromaDB Vector Hit • {citations.length} Grounding Chunks
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-emerald-950 hover:text-[#00ff88] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Source Tabs */}
        <div className="flex overflow-x-auto border-b border-emerald-900/30 bg-[#030704]/60 px-6 py-2.5 gap-2">
          {citations.map((c, idx) => {
            const isSelected = idx === selectedIndex;
            const score = Math.round((c.similarity_score || 0.8) * 100);
            return (
              <button
                key={idx}
                onClick={() => setSelectedIndex(idx)}
                className={`cursor-pointer flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-mono font-medium whitespace-nowrap transition-all ${
                  isSelected
                    ? 'border border-[#00ff88] bg-[#00ff88]/15 text-[#00ff88] shadow-[0_0_12px_rgba(0,255,136,0.2)]'
                    : 'border border-emerald-950 text-slate-400 hover:bg-emerald-950/40 hover:text-emerald-300'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>SOURCE #{idx + 1}</span>
                <span className="rounded bg-emerald-950 px-1 py-0.2 text-[10px] text-[#00ff88] border border-emerald-800/40">
                  {score}%
                </span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* Metadata Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-emerald-900/40 bg-[#030704] p-3">
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-emerald-500/70">
                DOCUMENT IDENTIFIER
              </span>
              <p className="mt-1 truncate text-xs font-mono font-medium text-emerald-100">
                {currentCitation.source}
              </p>
            </div>

            <div className="rounded-xl border border-emerald-900/40 bg-[#030704] p-3">
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-emerald-500/70">
                PAGE / OFFSET
              </span>
              <p className="mt-1 text-xs font-mono font-medium text-emerald-100">
                {currentCitation.page && currentCitation.page > 0 ? `Page ${currentCitation.page}` : 'Document Body'}
              </p>
            </div>

            <div className="rounded-xl border border-emerald-900/40 bg-[#030704] p-3">
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-emerald-500/70">
                COSINE SIMILARITY
              </span>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-2 flex-1 rounded-full bg-emerald-950 overflow-hidden border border-emerald-900/60">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-600 to-[#00ff88] rounded-full shadow-[0_0_8px_#00ff88]" 
                    style={{ width: `${confidenceScore}%` }}
                  />
                </div>
                <span className="text-xs font-mono font-bold text-[#00ff88]">{confidenceScore}%</span>
              </div>
            </div>
          </div>

          {/* Raw Text Chunk Container */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-400/80">
                EXACT CHUNK CONTEXT
              </span>
              <button
                onClick={handleCopySnippet}
                className="cursor-pointer flex items-center gap-1 text-xs font-mono text-[#00ff88] hover:text-emerald-300 transition-colors"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-[#00ff88]" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'COPIED TO CLIPBOARD' : 'COPY RAW TEXT'}</span>
              </button>
            </div>

            <div className="rounded-xl border border-emerald-900/60 bg-[#030704] p-4 text-xs font-mono leading-relaxed text-emerald-100/90 whitespace-pre-wrap selection:bg-[#00ff88]/30 selection:text-white border-l-2 border-l-[#00ff88]">
              {currentCitation.snippet}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-emerald-900/40 bg-[#030704] px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="cursor-pointer rounded-xl border border-emerald-900/60 bg-emerald-950/40 px-4 py-2 text-xs font-mono font-medium text-emerald-200 hover:border-[#00ff88]/60 hover:text-[#00ff88] transition-all"
          >
            CLOSE_INSPECTOR [ESC]
          </button>
        </div>

      </div>
    </div>
  );
};
