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
    <header className="sticky top-0 z-30 w-full border-b border-emerald-900/30 bg-[#030704]/90 backdrop-blur-2xl transition-all">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        
        {/* Left: Cyber Intelligence Brand & Security Telemetry */}
        <div className="flex items-center gap-3.5">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#00ff88]/20 to-[#10b981]/10 border border-[#00ff88]/40 text-[#00ff88] shadow-[0_0_15px_rgba(0,255,136,0.15)]">
            <Terminal className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff88] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00ff88]" />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-white sm:text-base font-mono">
                LOCAL<span className="text-[#00ff88]">_INTEL</span>
              </h1>
              <span className="rounded-md bg-emerald-950/60 px-2 py-0.5 text-[10px] font-mono font-semibold text-[#00ff88] border border-emerald-500/30 tracking-wider">
                AIR-GAPPED
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00ff88] glow-emerald-pulse inline-block" />
                Zero Cloud Egress
              </span>
              <span className="text-emerald-900">•</span>
              <span className="text-[11px] text-slate-400 hidden sm:inline font-mono">100% Private RAG</span>
            </div>
          </div>
        </div>

        {/* Right: Status HUD & Quick Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Ollama Status Pill */}
          <div className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-mono backdrop-blur-md transition-all ${
            isOllamaConnected 
              ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300 shadow-[0_0_10px_rgba(0,255,136,0.08)]' 
              : 'border-rose-500/40 bg-rose-950/40 text-rose-300'
          }`}>
            <Activity className="h-3.5 w-3.5 text-[#00ff88]" />
            <span className="hidden md:inline">{isOllamaConnected ? 'Ollama Online' : 'Ollama Offline'}</span>
            <span className="md:hidden">{isOllamaConnected ? 'Online' : 'Offline'}</span>
            <button
              onClick={onRefreshStatus}
              title="Refresh telemetry status"
              className="ml-1 text-slate-400 hover:text-[#00ff88] transition-colors p-0.5"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin text-[#00ff88]' : ''}`} />
            </button>
          </div>

          {/* Model Selector HUD */}
          <div className="relative flex items-center">
            <Cpu className="absolute left-2.5 h-3.5 w-3.5 text-[#00ff88] pointer-events-none" />
            <select
              value={selectedModel}
              onChange={(e) => onSelectModel(e.target.value)}
              className="h-9 appearance-none rounded-lg border border-emerald-900/50 bg-[#070e0a] pl-8 pr-7 py-1 text-xs font-mono font-medium text-emerald-200 shadow-inner focus:border-[#00ff88] focus:outline-none focus:ring-1 focus:ring-[#00ff88] transition-all cursor-pointer hover:border-emerald-700/60"
            >
              {models.map((m) => (
                <option key={m} value={m} className="bg-[#070e0a] text-emerald-300 font-mono">
                  {m}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-2 text-[9px] text-[#00ff88]">▼</div>
          </div>

          {/* Document Drawer Toggle Button */}
          <button
            onClick={onToggleSidebar}
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-mono font-medium transition-all ${
              isSidebarOpen
                ? 'border-[#00ff88] bg-[#00ff88]/15 text-[#00ff88] shadow-[0_0_15px_rgba(0,255,136,0.2)]'
                : 'border-emerald-900/50 bg-[#070e0a] text-slate-300 hover:border-[#00ff88]/60 hover:bg-emerald-950/40 hover:text-[#00ff88]'
            }`}
          >
            <FolderGit2 className="h-3.5 w-3.5 text-[#00ff88]" />
            <span className="hidden sm:inline">Docs</span>
            <span className="rounded bg-emerald-950 px-1.5 py-0.2 text-[10px] font-bold text-[#00ff88] border border-emerald-500/40 font-mono">
              {status?.total_documents ?? 0}
            </span>
            <kbd className="hidden xl:inline text-[9px] text-emerald-400/80 bg-emerald-950/60 px-1 rounded border border-emerald-800/40">⌘K</kbd>
          </button>

        </div>
      </div>
    </header>
  );
};
