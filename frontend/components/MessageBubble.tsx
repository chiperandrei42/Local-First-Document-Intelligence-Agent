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
  ExternalLink,
  ChevronRight
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
        ? 'bg-slate-900/40 border border-slate-800/40' 
        : 'bg-slate-950/60 border border-slate-800/70 shadow-lg'
    }`}>
      {/* Avatar Icon */}
      <div className="flex-shrink-0">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl border text-sm font-semibold shadow-inner ${
          isUser
            ? 'border-indigo-500/40 bg-gradient-to-br from-indigo-600/30 to-indigo-900/40 text-indigo-300'
            : 'border-cyan-500/40 bg-gradient-to-br from-cyan-600/30 to-slate-900/50 text-cyan-300'
        }`}>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </div>
      </div>

      {/* Message Content Container */}
      <div className="min-w-0 flex-1 space-y-3">
        {/* Header: Role & Timestamp & Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {isUser ? 'You' : 'Document Intelligence Agent'}
            </span>
            <span className="text-[11px] text-slate-500">{message.timestamp}</span>
          </div>

          {!isUser && message.content && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-slate-400 opacity-0 transition-opacity hover:bg-slate-800 hover:text-slate-200 group-hover:opacity-100"
              title="Copy answer"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          )}
        </div>

        {/* Message Body (Markdown for Assistant, Text for User) */}
        <div className="text-sm leading-relaxed text-slate-200">
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-invert max-w-none prose-p:my-2 prose-headings:my-3 prose-pre:my-3 prose-ul:my-2 prose-ol:my-2 prose-code:text-cyan-300 prose-code:bg-slate-900 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
              {message.isStreaming && (
                <span className="inline-block h-3.5 w-1.5 ml-1 animate-pulse bg-cyan-400 align-middle" />
              )}
            </div>
          )}
        </div>

        {/* Citations & Evidence Section */}
        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                <span>Retrieved Grounding Sources ({message.citations.length})</span>
              </div>
              <button
                onClick={() => onInspectCitations?.(message.citations || [], 0)}
                className="flex items-center gap-1 text-[11px] font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <span>Inspect Context Chunks</span>
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
                    className="group/chip flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/90 px-2.5 py-1.5 text-xs text-slate-300 transition-all hover:border-cyan-500/50 hover:bg-slate-850 hover:text-cyan-200"
                  >
                    <FileText className="h-3.5 w-3.5 text-cyan-400 flex-shrink-0" />
                    <span className="max-w-[140px] truncate font-medium sm:max-w-[220px]">
                      {citation.source}
                    </span>
                    {citation.page !== undefined && citation.page > 0 && (
                      <span className="rounded bg-slate-800 px-1 py-0.5 text-[10px] text-slate-400">
                        p.{citation.page}
                      </span>
                    )}
                    <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold border ${
                      isHighConfidence
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                        : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400'
                    }`}>
                      {confidencePct}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
