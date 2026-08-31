'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Bot, 
  User, 
  Copy, 
  Check, 
  FileText, 
  Sparkles, 
  ChevronRight,
  Terminal,
  ShieldCheck
} from 'lucide-react';
import { Message, Citation } from '@/lib/types';

interface MessageBubbleProps {
  message: Message;
  onInspectCitations?: (citations: Citation[], initialIndex?: number) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onInspectCitations,
}) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`group flex w-full gap-4 py-4 px-4 sm:px-6 rounded-2xl transition-all ${
      isUser 
        ? 'bg-[#070e0a]/70 border border-emerald-900/40 text-slate-200' 
        : 'bg-[#070e0a] border border-emerald-500/25 shadow-[0_8px_30px_rgba(0,0,0,0.5)]'
    }`}>
      {/* Avatar Icon */}
      <div className="flex-shrink-0">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl border text-sm font-semibold shadow-inner ${
          isUser
            ? 'border-emerald-800/40 bg-emerald-950/40 text-emerald-300'
            : 'border-[#00ff88]/40 bg-gradient-to-br from-[#00ff88]/20 to-emerald-950/60 text-[#00ff88] shadow-[0_0_12px_rgba(0,255,136,0.15)]'
        }`}>
          {isUser ? <User className="h-4 w-4" /> : <Terminal className="h-4 w-4" />}
        </div>
      </div>

      {/* Message Content Container */}
      <div className="min-w-0 flex-1 space-y-3">
        {/* Header: Role & Timestamp & Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold tracking-wider text-emerald-400">
              {isUser ? 'OPERATOR' : 'INTELLIGENCE_AGENT'}
            </span>
            <span className="text-[11px] font-mono text-emerald-900">•</span>
            <span className="text-[11px] font-mono text-emerald-500/60">{message.timestamp}</span>
          </div>

          {!isUser && message.content ? (
            <button
              onClick={handleCopy}
              className="cursor-pointer flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-mono text-emerald-400/80 opacity-0 transition-all hover:bg-emerald-950/80 hover:text-[#00ff88] border border-transparent hover:border-emerald-500/30 group-hover:opacity-100"
              title="Copy answer"
            >
              {copied ? <Check className="h-3 w-3 text-[#00ff88]" /> : <Copy className="h-3 w-3" />}
              <span>{copied ? 'COPIED' : 'COPY'}</span>
            </button>
          ) : null}
        </div>

        {/* Message Body (Markdown for Assistant, Text for User) */}
        <div className="text-sm leading-relaxed text-[#e2f5ea]">
          {isUser ? (
            <p className="whitespace-pre-wrap font-sans text-slate-200">{message.content}</p>
          ) : (
            <div className="prose prose-invert max-w-none text-[#e2f5ea] 
              prose-p:my-2 prose-p:leading-relaxed
              prose-headings:text-white prose-headings:font-mono prose-headings:my-3 
              prose-h2:border-b prose-h2:border-emerald-900/40 prose-h2:pb-1 
              prose-pre:my-3 prose-pre:border prose-pre:border-emerald-900/60 prose-pre:bg-[#030704]
              prose-ul:my-2 prose-ol:my-2 
              prose-strong:text-[#00ff88] prose-strong:font-semibold
              prose-code:text-[#00ff88] prose-code:bg-[#030704] prose-code:border prose-code:border-emerald-900/40 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono
              prose-blockquote:border-l-[#00ff88] prose-blockquote:bg-emerald-950/20 prose-blockquote:py-1 prose-blockquote:px-3">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
              {message.isStreaming ? (
                <span className="inline-block h-3.5 w-1.5 ml-1 bg-[#00ff88] terminal-cursor align-middle shadow-[0_0_8px_#00ff88]" />
              ) : null}
            </div>
          )}
        </div>

        {/* Citations & Evidence Section */}
        {!isUser && message.citations && message.citations.length > 0 ? (
          <div className="mt-4 pt-3 border-t border-emerald-900/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400">
                <Sparkles className="h-3.5 w-3.5 text-[#00ff88]" />
                <span>GROUNDING SOURCES ({message.citations.length})</span>
              </div>
              <button
                onClick={() => onInspectCitations?.(message.citations || [], 0)}
                className="cursor-pointer flex items-center gap-1 text-[11px] font-mono text-[#00ff88] hover:text-emerald-200 transition-colors"
              >
                <span>INSPECT CHUNKS</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            {/* Citation Pills Grid */}
            <div className="flex flex-wrap gap-2">
              {message.citations.map((citation, idx) => {
                const confidencePct = Math.round((citation.similarity_score || 0.8) * 100);
                const isHighConfidence = confidencePct >= 75;

                return (
                  <button
                    key={idx}
                    onClick={() => onInspectCitations?.(message.citations || [], idx)}
                    className="group/chip cursor-pointer flex items-center gap-2 rounded-lg border border-emerald-900/60 bg-[#030704]/90 px-2.5 py-1.5 text-xs text-slate-300 transition-all hover:border-[#00ff88]/60 hover:bg-emerald-950/60 hover:text-[#00ff88] hover:shadow-[0_0_12px_rgba(0,255,136,0.15)]"
                  >
                    <FileText className="h-3.5 w-3.5 text-[#00ff88] flex-shrink-0" />
                    <span className="max-w-[140px] truncate font-medium sm:max-w-[220px] font-mono text-emerald-200">
                      {citation.source}
                    </span>
                    {citation.page !== undefined && citation.page > 0 ? (
                      <span className="rounded bg-emerald-950 px-1 py-0.5 text-[10px] text-emerald-400 font-mono border border-emerald-900/60">
                        p.{citation.page}
                      </span>
                    ) : null}
                    <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold border ${
                      isHighConfidence
                        ? 'border-[#00ff88]/40 bg-[#00ff88]/15 text-[#00ff88]'
                        : 'border-emerald-500/30 bg-emerald-950/40 text-emerald-300'
                    }`}>
                      {confidencePct}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
