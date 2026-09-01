'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  Sparkles, 
  Copy, 
  Check, 
  ChevronRight
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#060607]/80 backdrop-blur-md transition-all duration-300">
      <div className="flex flex-col w-full max-w-3xl max-h-[85vh] rounded-2xl border border-white/10 bg-[#0A0A0C] shadow-2xl overflow-hidden animate-slide-up">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#614DFF]/10 border border-[#614DFF]/20 text-[#614DFF] shadow-[0_0_15px_rgba(97,77,255,0.15)]">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-wide">Source Inspector</h2>
              <p className="text-xs text-white/50 mt-0.5">
                {citations.length} Grounding document{citations.length !== 1 ? 's' : ''} retrieved
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-xl p-2 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Source Tabs */}
        <div className="flex overflow-x-auto border-b border-white/5 bg-black/20 px-6 py-3 gap-2">
          {citations.map((c, idx) => {
            const isSelected = idx === selectedIndex;
            const score = Math.round((c.similarity_score || 0.8) * 100);
            return (
              <button
                key={idx}
                onClick={() => setSelectedIndex(idx)}
                className={`cursor-pointer flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                  isSelected
                    ? 'border border-[#614DFF]/50 bg-[#614DFF]/10 text-white shadow-[0_0_15px_rgba(97,77,255,0.1)]'
                    : 'border border-transparent text-white/50 hover:bg-white/5 hover:text-white'
                 }`}
              >
                <span>Source {idx + 1}</span>
                <span className={`rounded-md px-1.5 py-0.5 text-[10px] border ${
                  isSelected ? 'bg-[#614DFF] border-[#614DFF] text-white' : 'bg-white/5 border-white/10 text-white/40'
                }`}>
                  {score}%
                </span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Metadata Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 flex flex-col justify-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                Document Name
              </span>
              <p className="mt-1.5 truncate text-sm font-medium text-white/90" title={currentCitation.source}>
                {currentCitation.source}
              </p>
            </div>

            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 flex flex-col justify-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                Location
              </span>
              <p className="mt-1.5 text-sm font-medium text-white/90">
                {currentCitation.page && currentCitation.page > 0 ? `Page ${currentCitation.page}` : 'Document Body'}
              </p>
            </div>

            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 flex flex-col justify-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                Relevance Match
              </span>
              <div className="mt-2 flex items-center gap-3">
                <div className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden">
                  <div 
                    className="h-full bg-[#614DFF] rounded-full shadow-[0_0_10px_#614DFF]" 
                    style={{ width: `${confidenceScore}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-[#614DFF]">{confidenceScore}%</span>
              </div>
            </div>
          </div>

          {/* Raw Text Chunk Container */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                Extracted Context
              </span>
              <button
                onClick={handleCopySnippet}
                className="cursor-pointer flex items-center gap-1.5 text-[11px] font-medium text-[#614DFF] hover:text-[#7563FF] transition-colors"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-[#614DFF]" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied to clipboard' : 'Copy context'}</span>
              </button>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/40 p-5 text-[13px] leading-loose text-white/80 whitespace-pre-wrap selection:bg-[#614DFF]/30 selection:text-white border-l-2 border-l-[#614DFF] shadow-inner">
              {currentCitation.snippet}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-white/5 bg-white/[0.01] px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="cursor-pointer rounded-xl border border-white/10 bg-white/5 px-5 py-2 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-all"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
