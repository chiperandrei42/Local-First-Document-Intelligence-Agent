'use client';

import React from 'react';
import { 
  Cpu, 
  FolderGit2, 
  RefreshCw, 
  Activity,
  Terminal
} from 'lucide-react';
import { StatusResponse } from '@/lib/types';

interface HeaderProps {
  status: StatusResponse | null;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  onRefreshStatus: () => void;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  selectedModel,
  onSelectModel,
  onToggleSidebar,
  isSidebarOpen,
  onRefreshStatus,
  isRefreshing,
}) => {
  const isOllamaConnected = status?.ollama_connected ?? false;
  const models = status?.available_models && status.available_models.length > 0
    ? status.available_models
    : ['llama3.2', 'llama3.1', 'nomic-embed-text'];

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-800 bg-slate-950 transition-all duration-300">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        
        {/* Left: Brand & Telemetry */}
        <div className="flex items-center gap-3.5">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-blue-500 shadow-sm transition-transform duration-300 hover:scale-105">
            <Terminal className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-slate-100 sm:text-base font-mono uppercase">
                cetera
              </h1>
              <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-mono font-medium text-slate-300 border border-slate-700 tracking-wider">
                AIR-GAPPED
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
              <span className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 inline-block opacity-80" />
                Zero Cloud Egress
              </span>
              <span className="text-slate-700">•</span>
              <span className="text-[11px] text-slate-400 hidden sm:inline font-mono">100% Private RAG</span>
            </div>
          </div>
        </div>

        {/* Right: Status HUD & Quick Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Ollama Status Pill */}
          <div className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-mono transition-all duration-300 hover:-translate-y-0.5 ${
            isOllamaConnected 
              ? 'border-blue-900/50 bg-blue-950/30 text-blue-300' 
              : 'border-rose-900/50 bg-rose-950/30 text-rose-300'
          }`}>
            <Activity className={`h-3.5 w-3.5 ${isOllamaConnected ? 'text-blue-500' : 'text-rose-500'}`} />
            <span className="hidden md:inline">{isOllamaConnected ? 'Ollama Online' : 'Ollama Offline'}</span>
            <span className="md:hidden">{isOllamaConnected ? 'Online' : 'Offline'}</span>
            <button
              onClick={onRefreshStatus}
              title="Refresh telemetry status"
              className="ml-1 text-slate-500 hover:text-blue-400 transition-colors p-0.5 active:scale-95"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
            </button>
          </div>

          {/* Model Selector HUD */}
          <div className="relative flex items-center group">
            <Cpu className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 group-hover:text-blue-400 transition-colors pointer-events-none" />
            <select
              value={selectedModel}
              onChange={(e) => onSelectModel(e.target.value)}
              className="h-9 appearance-none rounded-lg border border-slate-800 bg-slate-900 pl-8 pr-7 py-1 text-xs font-mono font-medium text-slate-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all cursor-pointer hover:border-slate-600 hover:bg-slate-800"
            >
              {models.map((m) => (
                <option key={m} value={m} className="bg-slate-900 text-slate-300 font-mono">
                  {m}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-2 text-[9px] text-slate-500 group-hover:text-blue-400 transition-colors">▼</div>
          </div>

          {/* Document Drawer Toggle Button */}
          <button
            onClick={onToggleSidebar}
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-mono font-medium transition-all duration-300 active:scale-95 ${
              isSidebarOpen
                ? 'border-blue-500/50 bg-blue-500/10 text-blue-400 shadow-sm'
                : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-600 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <FolderGit2 className={`h-3.5 w-3.5 transition-colors ${isSidebarOpen ? 'text-blue-400' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">Docs</span>
            <span className={`rounded px-1.5 py-0.2 text-[10px] font-bold border font-mono transition-colors ${
              isSidebarOpen ? 'bg-blue-900/50 text-blue-300 border-blue-500/30' : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}>
              {status?.total_documents ?? 0}
            </span>
            <kbd className={`hidden xl:inline text-[9px] px-1 rounded border transition-colors ${
              isSidebarOpen ? 'text-blue-300 bg-blue-900/30 border-blue-500/20' : 'text-slate-500 bg-slate-800 border-slate-700'
            }`}>⌘K</kbd>
          </button>

        </div>
      </div>
    </header>
  );
};

