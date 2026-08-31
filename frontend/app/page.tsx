'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { DocumentSidebar } from '@/components/DocumentSidebar';
import { ChatInterface } from '@/components/ChatInterface';
import { fetchStatus } from '@/lib/api';
import { StatusResponse } from '@/lib/types';

export default function Home() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('llama3.2');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
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
      // Backend may be starting or offline
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

  // Keyboard shortcut support (Cmd+K / Ctrl+K for documents, Escape to close sidebar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSidebarOpen]);

  return (
    <main className="relative flex h-screen w-full flex-col overflow-hidden bg-[#030704] text-[#e2f5ea]">
      {/* Top Navigation Header */}
      <Header
        status={status}
        selectedModel={selectedModel}
        onSelectModel={setSelectedModel}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        isSidebarOpen={isSidebarOpen}
        onRefreshStatus={loadStatus}
        isRefreshing={isRefreshing}
      />

      {/* Main Content Area */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Chat Stream & Interaction */}
        <ChatInterface
          selectedModel={selectedModel}
          totalDocs={status?.total_documents ?? 0}
          onOpenSidebar={() => setIsSidebarOpen(true)}
        />

        {/* Document Ingestion & Management Sidebar */}
        <DocumentSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          documents={status?.documents || []}
          totalChunks={status?.total_chunks || 0}
          onRefreshData={loadStatus}
        />
      </div>
    </main>
  );
}
