'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { SidebarNav } from '@/components/SidebarNav';
import { DocumentSidebar } from '@/components/DocumentSidebar';
import { ChatInterface } from '@/components/ChatInterface';
import { OnboardingModal } from '@/components/OnboardingModal';
import { fetchStatus } from '@/lib/api';
import { StatusResponse } from '@/lib/types';

export default function Home() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('llama3.2');
  const [activeView, setActiveView] = useState<'chat' | 'documents' | 'settings'>('chat');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [hasCheckedFirstBoot, setHasCheckedFirstBoot] = useState<boolean>(false);

  const loadStatus = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const data = await fetchStatus();
      setStatus(data);
      if (data.default_llm && !selectedModel) {
        setSelectedModel(data.default_llm);
      }
      // Check first-boot guardrails: if Ollama is offline or required models missing, prompt setup
      if (!hasCheckedFirstBoot && data) {
        setHasCheckedFirstBoot(true);
        const hasEmbed = data.available_models.some((m) => 
          m.toLowerCase().includes('nomic-embed') || 
          m.toLowerCase().includes('bge') || 
          m.toLowerCase().includes('minilm') || 
          m.toLowerCase().includes('embed')
        );
        const hasLlm = data.available_models.some((m) => 
          m.toLowerCase().includes('llama') || 
          m.toLowerCase().includes('mistral') || 
          m.toLowerCase().includes('qwen') || 
          m.toLowerCase().includes('gemma') || 
          m.toLowerCase().includes('phi') || 
          m.toLowerCase().includes('deepseek') || 
          m.toLowerCase().includes('minicpm')
        );
        if (!data.ollama_connected || !hasEmbed || !hasLlm) {
          setIsOnboardingOpen(true);
        }
      }
    } catch {
      setStatus(null);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedModel, hasCheckedFirstBoot]);

  useEffect(() => {
    loadStatus();
    // Fast poll (1.5s) while connecting so the UI responds immediately once backend finishes booting; 15s thereafter
    const pollInterval = status === null ? 1500 : 15000;
    const interval = setInterval(loadStatus, pollInterval);
    return () => clearInterval(interval);
  }, [loadStatus, status]);

  // Keyboard shortcut support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setActiveView(prev => prev === 'documents' ? 'chat' : 'documents');
      } else if (e.key === 'Escape' && activeView === 'documents') {
        setActiveView('chat');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeView]);

  return (
    <main className="flex h-screen w-full overflow-hidden bg-[#060607] text-[#FEFDFF]">
      {/* Narrow Left Sidebar */}
      <SidebarNav 
        status={status}
        activeView={activeView}
        onViewChange={(view) => setActiveView(activeView === view && view === 'documents' ? 'chat' : view)}
        onOpenSetup={() => setIsOnboardingOpen(true)}
      />

      {/* Main Content Area */}
      <div className="relative flex flex-1 overflow-hidden">
        
        {/* Document Manager Slide-out Panel */}
        <DocumentSidebar
          isOpen={activeView === 'documents'}
          onClose={() => setActiveView('chat')}
          documents={status?.documents || []}
          totalChunks={status?.total_chunks || 0}
          onRefreshData={loadStatus}
        />

        {/* Chat Interface (Always visible, might shift or get overlaid) */}
        <div className="flex-1 relative overflow-hidden">
          <ChatInterface
            selectedModel={selectedModel}
            totalDocs={status?.total_documents ?? 0}
            onOpenSidebar={() => setActiveView('documents')}
          />
        </div>
        
      </div>

      {/* 5-Step First-Boot & Hardware Guardrails Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        status={status}
        onRefreshStatus={loadStatus}
      />
    </main>
  );
}

