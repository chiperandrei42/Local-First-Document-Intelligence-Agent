'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { SidebarNav } from '@/components/SidebarNav';
import { DocumentSidebar } from '@/components/DocumentSidebar';
import { ChatInterface } from '@/components/ChatInterface';
import { fetchStatus } from '@/lib/api';
import { StatusResponse } from '@/lib/types';

export default function Home() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('llama3.2');
  const [activeView, setActiveView] = useState<'chat' | 'documents' | 'settings'>('chat');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const loadStatus = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const data = await fetchStatus();
      setStatus(data);
      if (data.default_llm && !selectedModel) {
        setSelectedModel(data.default_llm);
      }
    } catch {
      setStatus(null);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedModel]);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 15000); // Polling status every 15s
    return () => clearInterval(interval);
  }, [loadStatus]);

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
      />

      {/* Main Content Area */}
      <div className="relative flex flex-1 overflow-hidden">
        
        {/* Document Manager Slide-out Panel */}
        <DocumentSidebar
          isOpen={activeView === 'documents'}
          onClose={() => setActiveView('chat')}
          documents={status?.documents || []}
          totalChunks={status?.total_chunks || 0}
          hasVisionModel={status?.has_vision_model}
          visionModel={status?.vision_model}
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
    </main>
  );
}

