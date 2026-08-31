'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Send, 
  Sparkles, 
  Trash2, 
  StopCircle, 
  ShieldCheck, 
  Layers, 
  Bot,
  Zap,
  ArrowRight,
  Terminal,
  Cpu,
  Lock
} from 'lucide-react';
import { Message, Citation } from '@/lib/types';
import { streamChat } from '@/lib/api';
import { MessageBubble } from './MessageBubble';
import { SourceInspectorModal } from './SourceInspectorModal';

interface ChatInterfaceProps {
  selectedModel: string;
  totalDocs: number;
  onOpenSidebar: () => void;
}

const STARTER_PROMPTS = [
  {
    tag: 'ARCH_01',
    title: 'Local RAG Architecture',
    prompt: 'What are the core pillars of Local-First RAG and how is zero-data exfiltration guaranteed?',
  },
  {
    tag: 'HW_02',
    title: '8GB VRAM Optimization',
    prompt: 'How is memory managed to stay within the 8GB VRAM hardware limit during ingestion and inference?',
  },
  {
    tag: 'SEC_03',
    title: 'Data Privacy Policy',
    prompt: 'Summarize the private data processing rules in Project Falcon.',
  },
  {
    tag: 'PERF_04',
    title: 'Hardware Benchmarks',
    prompt: 'What are the edge hardware benchmark results (TTFT, throughput, ingestion speed)?',
  },
];

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  selectedModel,
  totalDocs,
  onOpenSidebar,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [inspectorCitations, setInspectorCitations] = useState<Citation[]>([]);
  const [inspectorIndex, setInspectorIndex] = useState(0);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming, scrollToBottom]);

  const handleInspectCitations = (citations: Citation[], initialIndex = 0) => {
    setInspectorCitations(citations);
    setInspectorIndex(initialIndex);
    setIsInspectorOpen(true);
  };

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || isStreaming) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const assistantMessageId = `assistant-${Date.now()}`;
    const initialAssistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      citations: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMessage, initialAssistantMessage]);
    setInputQuery('');
    setIsStreaming(true);

    let accumulatedContent = '';
    let accumulatedCitations: Citation[] = [];

    await streamChat(
      textToSend.trim(),
      messages,
      selectedModel,
      {
        onCitations: (citations) => {
          accumulatedCitations = citations;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, citations: accumulatedCitations }
                : msg
            )
          );
        },
        onToken: (token) => {
          accumulatedContent += token;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: accumulatedContent }
                : msg
            )
          );
        },
        onError: (err) => {
          accumulatedContent += `\n\n> ⚠️ **Error:** ${err}`;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: accumulatedContent, isStreaming: false }
                : msg
            )
          );
          setIsStreaming(false);
        },
        onDone: () => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, isStreaming: false }
                : msg
            )
          );
          setIsStreaming(false);
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    if (messages.length === 0) return;
    if (confirm('Clear the current chat conversation?')) {
      setMessages([]);
    }
  };

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden bg-[#030704]">
      
      {/* Scrollable Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-4xl space-y-6">
          
          {/* Empty Welcome State */}
          {messages.length === 0 ? (
            <div className="my-8 flex flex-col items-center text-center">
              
              {/* Glowing Hero Icon */}
              <div className="relative mb-6">
                <div className="absolute -inset-2 rounded-3xl bg-[#00ff88]/20 blur-xl" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-[#00ff88]/40 bg-[#070e0a] text-[#00ff88] shadow-[0_0_30px_rgba(0,255,136,0.2)]">
                  <ShieldCheck className="h-10 w-10" />
                </div>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/60 px-3 py-1 text-xs font-mono text-[#00ff88] mb-3">
                <Lock className="h-3 w-3 text-[#00ff88]" />
                <span>SECURE ENCLAVE ACTIVE</span>
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-4xl font-mono">
                LOCAL<span className="text-[#00ff88]">_DOCUMENT</span> INTELLIGENCE
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-400">
                Ground answers directly against your vector database. All vector generation, token embeddings, and model inferences execute completely on local hardware.
              </p>

              {/* Status Alert if No Documents */}
              {totalDocs === 0 ? (
                <div className="mt-6 flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-amber-950/30 px-5 py-3 text-xs text-amber-300">
                  <Zap className="h-4 w-4 text-amber-400 flex-shrink-0" />
                  <span>No documents are indexed yet. Load example data to initialize semantic retrieval.</span>
                  <button
                    onClick={onOpenSidebar}
                    className="ml-2 cursor-pointer rounded-lg bg-amber-500/20 border border-amber-500/40 px-3 py-1 font-mono font-semibold text-amber-200 hover:bg-amber-500/30 transition-all"
                  >
                    Open Manager
                  </button>
                </div>
              ) : null}

              {/* Starter Query Cards Grid */}
              <div className="mt-8 grid w-full grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                {STARTER_PROMPTS.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(item.prompt)}
                    className="cyber-card group cursor-pointer flex flex-col justify-between rounded-2xl p-4 text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-emerald-950/80 px-1.5 py-0.5 text-[10px] font-mono font-bold text-[#00ff88] border border-emerald-500/30">
                          {item.tag}
                        </span>
                        <span className="text-xs font-semibold text-emerald-200 font-mono">
                          {item.title}
                        </span>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-emerald-500/40 group-hover:text-[#00ff88] group-hover:translate-x-1 transition-all" />
                    </div>
                    <p className="mt-2.5 text-xs leading-relaxed text-slate-400 group-hover:text-slate-200 transition-colors">
                      {item.prompt}
                    </p>
                  </button>
                ))}
              </div>

            </div>
          ) : null}

          {/* Rendered Messages */}
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onInspectCitations={handleInspectCitations}
            />
          ))}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Bar Fixed at Bottom */}
      <div className="border-t border-emerald-900/30 bg-[#030704]/95 backdrop-blur-xl px-4 py-4 sm:px-8">
        <div className="mx-auto max-w-4xl">
          
          <div className="relative flex items-end rounded-2xl border border-emerald-900/60 bg-[#070e0a] shadow-[0_4px_25px_rgba(0,0,0,0.6)] focus-within:border-[#00ff88] focus-within:ring-1 focus-within:ring-[#00ff88] focus-within:shadow-[0_0_20px_rgba(0,255,136,0.15)] transition-all">
            
            {/* Terminal prompt symbol */}
            <div className="pl-3.5 pb-3 text-[#00ff88] font-mono text-sm select-none opacity-80">
              &gt;
            </div>

            {/* Query Textarea */}
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your local documents (Enter to send, Shift+Enter for new line)..."
              className="w-full resize-none bg-transparent px-3 py-3 text-sm font-sans text-emerald-100 placeholder-emerald-900/80 focus:outline-none max-h-36 overflow-y-auto"
            />

            {/* Actions: Clear Chat & Submit */}
            <div className="flex items-center gap-1.5 p-2 flex-shrink-0">
              {messages.length > 0 ? (
                <button
                  type="button"
                  onClick={handleClearChat}
                  title="Clear conversation"
                  className="cursor-pointer rounded-xl p-2 text-slate-500 hover:bg-rose-950/40 hover:text-rose-400 border border-transparent hover:border-rose-800/40 transition-all"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!inputQuery.trim() || isStreaming}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-[#00ff88] to-[#059669] text-black font-bold shadow-[0_0_15px_rgba(0,255,136,0.3)] transition-all hover:opacity-95 hover:shadow-[0_0_25px_rgba(0,255,136,0.6)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer disabled:shadow-none"
              >
                {isStreaming ? (
                  <StopCircle className="h-4 w-4 animate-pulse text-black" />
                ) : (
                  <Send className="h-4 w-4 text-black" />
                )}
              </button>
            </div>

          </div>

          <div className="mt-2.5 flex items-center justify-between px-1 text-[11px] font-mono text-emerald-500/70">
            <span className="flex items-center gap-1.5">
              <Cpu className="h-3 w-3 text-[#00ff88]" />
              Model: <strong className="text-emerald-300 font-semibold">{selectedModel}</strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1 w-1 rounded-full bg-[#00ff88]" />
              Zero-exfiltration architecture active
            </span>
          </div>

        </div>
      </div>

      {/* Context Chunk Inspector Modal */}
      <SourceInspectorModal
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        citations={inspectorCitations}
        initialIndex={inspectorIndex}
      />

    </div>
  );
};
