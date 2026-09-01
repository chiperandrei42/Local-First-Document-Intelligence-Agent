'use client';

import React, { useState } from 'react';
import Image from 'next/image';
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
    <div className={`group flex w-full gap-4 py-5 px-4 sm:px-6 rounded-2xl transition-colors duration-300 ${
      isUser 
        ? 'bg-white/[0.02] border border-white/5' 
        : 'bg-[#0A0A0C] border border-white/10 shadow-lg'
    }`}>
      {/* Avatar Icon */}
      <div className="flex-shrink-0 mt-1">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg border text-sm transition-all duration-300 ${
          isUser
            ? 'border-white/10 bg-white/5 text-white/60'
            : 'border-[#614DFF]/30 bg-[#614DFF]/10 text-[#614DFF] shadow-[0_0_15px_rgba(97,77,255,0.15)] overflow-hidden p-1'
        }`}>
          {isUser ? (
            <User className="h-4 w-4" />
          ) : (
            <Image 
              src="/cetera-icon-transparent.png" 
              alt="cetera" 
              width={20} 
              height={20}
              className="drop-shadow-[0_0_6px_rgba(97,77,255,0.6)]"
            />
          )}
        </div>
      </div>


      {/* Message Content Container */}
      <div className="min-w-0 flex-1 space-y-3">
        {/* Header: Role & Timestamp & Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tracking-wide text-white/80">
              {isUser ? 'You' : 'cetera'}
            </span>
            <span className="text-[10px] text-white/30">•</span>
            <span className="text-[10px] text-white/40 font-medium">{message.timestamp}</span>
          </div>

          {!isUser && message.content ? (
            <button
              onClick={handleCopy}
              className="cursor-pointer flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-white/40 opacity-0 transition-all hover:bg-white/10 hover:text-white border border-transparent hover:border-white/10 group-hover:opacity-100"
              title="Copy answer"
            >
              {copied ? <Check className="h-3 w-3 text-[#614DFF]" /> : <Copy className="h-3 w-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          ) : null}
        </div>

        {/* Message Body (Markdown for Assistant, Text for User) */}
        <div className="text-sm leading-relaxed text-white/90">
          {isUser ? (
            <p className="whitespace-pre-wrap font-sans text-white/80">{message.content}</p>
          ) : (
            <div className="prose prose-invert max-w-none text-white/80 
              prose-p:my-2 prose-p:leading-relaxed
              prose-headings:text-white prose-headings:font-semibold prose-headings:my-3 
              prose-h2:border-b prose-h2:border-white/10 prose-h2:pb-1 
              prose-pre:my-3 prose-pre:border prose-pre:border-white/10 prose-pre:bg-[#030304] prose-pre:rounded-xl
              prose-ul:my-2 prose-ol:my-2 
              prose-strong:text-white prose-strong:font-semibold
              prose-code:text-[#A79FFF] prose-code:bg-[#614DFF]/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:font-mono prose-code:text-[13px] prose-code:before:content-none prose-code:after:content-none
              prose-blockquote:border-l-[#614DFF] prose-blockquote:bg-[#614DFF]/5 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-blockquote:text-white/70">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
              {message.isStreaming ? (
                <span className="inline-block h-3.5 w-1.5 ml-1 bg-[#614DFF] rounded-full animate-pulse shadow-[0_0_8px_#614DFF]" />
              ) : null}
            </div>
          )}
        </div>

        {/* Citations & Evidence Section */}
        {!isUser && message.citations && message.citations.length > 0 ? (
          <div className="mt-5 pt-4 border-t border-white/5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-[11px] font-medium tracking-wider text-white/50 uppercase">
                <FileText className="h-3.5 w-3.5 text-[#614DFF]" />
                <span>Sources ({message.citations.length})</span>
              </div>
              <button
                onClick={() => onInspectCitations?.(message.citations || [], 0)}
                className="cursor-pointer flex items-center gap-1 text-[11px] font-medium text-[#614DFF] hover:text-[#7563FF] transition-colors"
              >
                <span>View Details</span>
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
                    className="group/chip cursor-pointer flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-1.5 text-xs text-white/70 transition-all hover:border-[#614DFF]/50 hover:bg-[#614DFF]/10 hover:text-white"
                  >
                    <span className="max-w-[140px] truncate font-medium sm:max-w-[220px]">
                      {citation.source}
                    </span>
                    {citation.page !== undefined && citation.page > 0 ? (
                      <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-white/50 border border-white/5 group-hover/chip:border-[#614DFF]/30 group-hover/chip:text-[#614DFF]">
                        p.{citation.page}
                      </span>
                    ) : null}
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold border transition-colors ${
                      isHighConfidence
                        ? 'border-[#614DFF]/30 bg-[#614DFF]/10 text-[#614DFF] group-hover/chip:bg-[#614DFF]/20'
                        : 'border-white/10 bg-white/5 text-white/50 group-hover/chip:border-white/20'
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
