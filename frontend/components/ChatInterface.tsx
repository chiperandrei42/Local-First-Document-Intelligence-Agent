'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  Trash2, 
  StopCircle, 
  ShieldCheck, 
  Layers, 
  Bot,
  Zap,
  ArrowRight
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
    title: 'Local RAG Architecture',
    prompt: 'What are the core pillars of Local-First RAG and how is zero-data exfiltration guaranteed?',
  },
  {
    title: '8GB VRAM Optimization',
    prompt: 'How is memory managed to stay within the 8GB VRAM hardware limit during ingestion and inference?',
  },
  {
    title: 'Data Privacy Policy',
    prompt: 'Summarize the private data processing rules in Project Falcon.',
  },
  {
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

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
    <div className="flex flex-1 flex-col h-full overflow-hidden">
      
      {/* Scrollable Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-4xl space-y-6">
          
          {/* Empty Welcome State */}
          {messages.length === 0 && (
            <div className="my-8 flex flex-col items-center text-center">
              
              {/* Glowing Hero Icon */}
              <div className="relative mb-6">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-500 opacity-30 blur-lg" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-500/30 bg-slate-900 text-cyan-400 shadow-2xl">
                  <ShieldCheck className="h-8 w-8" />
                </div>
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Private Document Intelligence
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
                Ask questions against your local documents using on-device LLMs. 
                Embeddings and generation are strictly contained inside your machine.
              </p>

              {/* Status Alert if No Documents */}
              {totalDocs === 0 && (
                <div className="mt-6 flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-3 text-xs text-amber-300">
                  <Zap className="h-4 w-4 text-amber-400 flex-shrink-0" />
                  <span>No documents are indexed yet. Click &quot;Load Example Data&quot; to test.</span>
                  <button
                    onClick={onOpenSidebar}
                    className="ml-2 rounded-lg bg-amber-500/20 px-3 py-1 font-semibold text-amber-200 hover:bg-amber-500/30"
                  >
                    Open Manager
                  </button>
                </div>
              )}

              {/* Starter Query Cards */}
              <div className="mt-8 grid w-full grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                {STARTER_PROMPTS.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(item.prompt)}
                    className="group flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-left transition-all hover:border-cyan-500/40 hover:bg-slate-850 hover:shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-cyan-300">
                        {item.title}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-400 group-hover:text-slate-300">
                      {item.prompt}
                    </p>
                  </button>
                ))}
              </div>

            </div>
          )}

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
      <div className="border-t border-slate-800/80 bg-slate-950/90 backdrop-blur-xl px-4 py-4 sm:px-8">
        <div className="mx-auto max-w-4xl">
          
          <div className="relative flex items-end rounded-2xl border border-slate-700 bg-slate-900/90 shadow-xl focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500 transition-all">
            
            {/* Query Textarea */}
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your local documents (Enter to send, Shift+Enter for new line)..."
              className="w-full resize-none bg-transparent px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none max-h-36 overflow-y-auto"
            />

            {/* Actions: Clear Chat & Submit */}
            <div className="flex items-center gap-1.5 p-2 flex-shrink-0">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearChat}
                  title="Clear conversation"
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!inputQuery.trim() || isStreaming}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isStreaming ? (
                  <StopCircle className="h-4 w-4 animate-pulse" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>

          </div>

          <div className="mt-2 flex items-center justify-between px-1 text-[11px] text-slate-500">
            <span>Model: <strong className="text-slate-400">{selectedModel}</strong> via Ollama</span>
            <span>Zero-exfiltration architecture active</span>
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
