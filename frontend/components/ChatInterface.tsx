'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
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

const GREETING_OPTIONS = [
  'Where would you like to begin?',
  'Ready when you are.',
  'What shall we analyze today?',
  'How can I assist your research?',
  'What questions are on your mind?',
  'Ready to explore your documents.',
  'What insights are we uncovering today?',
  'Your private enclave is ready.',
  'Ask anything across your knowledge base.',
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
  const [greeting, setGreeting] = useState('Where would you like to begin?');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Pick a fresh greeting on each app session
  useEffect(() => {
    const random = GREETING_OPTIONS[Math.floor(Math.random() * GREETING_OPTIONS.length)];
    setGreeting(random);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);


  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming, scrollToBottom]);

  // Auto-resize textarea to fit text content smoothly without scrollbars
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [inputQuery]);

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
    <div className="flex flex-1 flex-col h-full overflow-hidden bg-[#060607]">
      
      {/* Scrollable Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-4xl space-y-6">
          
          {/* Empty Welcome State */}
          {messages.length === 0 ? (
            <div className="my-12 flex flex-col items-center text-center animate-slide-up">
              
              {/* Canonical Cetera Hero Emblem (Stable Hover) */}
              <div className="relative mb-5">
                <div className="absolute inset-0 bg-[#614DFF]/20 blur-3xl rounded-full scale-110 pointer-events-none" />
                <div className="relative flex items-center justify-center p-2">
                  <Image 
                    src="/cetera-logo-transparent.png" 
                    alt="cetera" 
                    width={180} 
                    height={216}
                    className="drop-shadow-[0_0_25px_rgba(97,77,255,0.4)]"
                    priority
                  />
                </div>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold tracking-widest text-white/60 mb-5 uppercase">
                <Lock className="h-3.5 w-3.5 text-[#614DFF]" />
                <span>Secure Local Enclave</span>
              </div>

              <h2 
                suppressHydrationWarning
                className="text-3xl font-bold tracking-tight text-white sm:text-4xl font-sans mb-3"
              >
                {greeting}
              </h2>




              <p className="max-w-md text-base leading-relaxed text-white/40">
                What shall we analyze today? All intelligence remains strictly offline on your hardware.
              </p>



              {/* Status Alert if No Documents */}
              {totalDocs === 0 ? (
                <div className="mt-8 flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] px-6 py-4 text-sm text-white/60 shadow-lg animate-slide-up backdrop-blur-md">
                  <Zap className="h-5 w-5 text-[#614DFF] flex-shrink-0" />
                  <span>Your database is empty. Load documents to begin.</span>
                  <button
                    onClick={onOpenSidebar}
                    className="ml-4 cursor-pointer rounded-xl bg-white/10 border border-white/5 px-4 py-2 font-semibold text-white hover:bg-white/20 active:scale-95 transition-all"
                  >
                    Open Documents
                  </button>
                </div>
              ) : null}

              {/* Starter Query Cards Grid */}
              <div className="mt-12 grid w-full max-w-3xl grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                {STARTER_PROMPTS.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(item.prompt)}
                    className="group cursor-pointer flex flex-col justify-between rounded-3xl p-6 text-left border border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04] transition-all duration-300 active:scale-[0.98] shadow-lg backdrop-blur-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="rounded-lg bg-[#614DFF]/10 px-2 py-1 text-[10px] font-bold text-[#614DFF] uppercase tracking-wider">
                          {item.tag}
                        </span>
                        <span className="text-sm font-semibold text-white/90">
                          {item.title}
                        </span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-white/30 group-hover:text-white/80 group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-white/40 group-hover:text-white/60 transition-colors duration-300 line-clamp-2">
                      {item.prompt}
                    </p>
                  </button>
                ))}
              </div>

            </div>
          ) : null}

          {/* Rendered Messages */}
          {messages.map((message) => (
            <div key={message.id} className="animate-slide-up">
              <MessageBubble
                message={message}
                onInspectCitations={handleInspectCitations}
              />
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Bar Fixed at Bottom */}
      <div className="bg-gradient-to-t from-[#060607] via-[#060607] to-transparent pt-10 pb-6 px-4 sm:px-8 absolute bottom-0 left-0 w-full z-10 pointer-events-none">
        <div className="mx-auto max-w-4xl pointer-events-auto">
          
          <div className="relative flex items-center rounded-[2rem] border border-white/10 bg-[#060607]/80 backdrop-blur-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] focus-within:border-white/20 focus-within:bg-white/[0.02] transition-all duration-300 p-2">
            
            {/* Query Textarea */}
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your documents..."
              className="w-full resize-none bg-transparent px-4 py-3 text-sm font-sans text-white placeholder-white/30 focus:outline-none max-h-36 overflow-y-auto no-scrollbar"
              style={{ scrollbarWidth: 'none' }}
            />


            {/* Actions: Clear Chat & Submit */}
            <div className="flex items-center gap-2 flex-shrink-0 px-2">
              {messages.length > 0 ? (
                <button
                  type="button"
                  onClick={handleClearChat}
                  title="Clear conversation"
                  className="cursor-pointer rounded-full p-3 text-white/30 hover:bg-white/5 hover:text-white/80 transition-all active:scale-95"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!inputQuery.trim() || isStreaming}
                className="primary-glow-btn flex h-12 w-12 items-center justify-center rounded-full cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none active:scale-95"
              >
                {isStreaming ? (
                  <StopCircle className="h-5 w-5 animate-pulse" />
                ) : (
                  <Send className="h-5 w-5 -ml-0.5" />
                )}
              </button>
            </div>

          </div>

          <div className="mt-4 flex items-center justify-center gap-4 text-[10px] uppercase tracking-widest font-semibold text-white/30">
            <span className="flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-white/40" />
              {selectedModel}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#614DFF] shadow-[0_0_8px_rgba(97,77,255,0.8)]" />
              Zero-Exfiltration Active
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

