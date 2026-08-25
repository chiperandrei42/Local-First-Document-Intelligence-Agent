'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  Sparkles, 
  Copy, 
  Check, 
  Percent, 
  Hash, 
  Layers, 
  BookOpen 
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

  if (!isOpen || citations.length === 0) return null;

  const currentCitation = citations[selectedIndex] || citations[0];
  const confidenceScore = Math.round((currentCitation.similarity_score || 0.8) * 100);

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(currentCitation.snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md transition-all">
      <div className="flex flex-col w-full max-w-3xl max-h-[85vh] rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Context Chunk Inspector</h2>
              <p className="text-xs text-slate-400">
                Retrieved {citations.length} semantic source chunks from ChromaDB
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Source Tabs */}
        <div className="flex overflow-x-auto border-b border-slate-800 bg-slate-950/40 px-6 py-2 gap-2">
          {citations.map((c, idx) => {
            const isSelected = idx === selectedIndex;
            const score = Math.round((c.similarity_score || 0.8) * 100);
            return (
              <button
                key={idx}
                onClick={() => setSelectedIndex(idx)}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                  isSelected
                    ? 'border border-cyan-500/50 bg-cyan-500/10 text-cyan-300 shadow-sm'
                    : 'border border-transparent text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Source #{idx + 1}</span>
                <span className="rounded bg-slate-800 px-1 py-0.2 text-[10px] text-cyan-400">
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
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Document Name
              </span>
              <p className="mt-1 truncate text-xs font-medium text-slate-200">
                {currentCitation.source}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Page Reference
              </span>
              <p className="mt-1 text-xs font-medium text-slate-200">
                {currentCitation.page && currentCitation.page > 0 ? `Page ${currentCitation.page}` : 'Document Body'}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Cosine Similarity Match
              </span>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-2 flex-1 rounded-full bg-slate-800 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full" 
                    style={{ width: `${confidenceScore}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-emerald-400">{confidenceScore}%</span>
              </div>
            </div>
          </div>

          {/* Raw Text Chunk Container */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Exact Chunk Context
              </span>
              <button
                onClick={handleCopySnippet}
                className="flex items-center gap-1 text-xs font-medium text-cyan-400 hover:text-cyan-300"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied to Clipboard' : 'Copy Chunk Text'}</span>
              </button>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs font-mono leading-relaxed text-slate-300 whitespace-pre-wrap selection:bg-cyan-500/30">
              {currentCitation.snippet}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-800 bg-slate-950/80 px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
};
