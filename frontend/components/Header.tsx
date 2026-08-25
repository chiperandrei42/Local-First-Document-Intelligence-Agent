'use client';

import React from 'react';
import { 
  ShieldCheck, 
  Cpu, 
  Database, 
  Server, 
  FolderGit2, 
  RefreshCw, 
  Zap,
  CheckCircle2,
  AlertTriangle
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
    <header className="sticky top-0 z-30 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl transition-all">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        
        {/* Left: Brand & Invariant Badge */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 text-cyan-400 shadow-inner">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white sm:text-lg">
                Local-First Document Intelligence
              </h1>
              <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[11px] font-semibold text-cyan-400 border border-cyan-500/20">
                RAG Agent
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 glow-emerald inline-block" />
                100% Air-Gapped
              </span>
              <span className="text-slate-600">•</span>
              <span>Zero Cloud Egress</span>
            </div>
          </div>
        </div>

        {/* Right: Status & Action Pills */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Ollama Status Pill */}
          <div className={`hidden sm:flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium backdrop-blur-md transition-all ${
            isOllamaConnected 
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' 
              : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
          }`}>
            <Server className="h-3.5 w-3.5" />
            <span>{isOllamaConnected ? 'Ollama Online' : 'Ollama Offline'}</span>
            <button
              onClick={onRefreshStatus}
              title="Refresh status"
              className="ml-1 hover:text-white transition-colors"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Model Selector */}
          <div className="relative flex items-center">
            <Cpu className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <select
              value={selectedModel}
              onChange={(e) => onSelectModel(e.target.value)}
              className="h-9 appearance-none rounded-lg border border-slate-700 bg-slate-900/90 pl-8 pr-7 py-1 text-xs font-medium text-slate-200 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              {models.map((m) => (
                <option key={m} value={m} className="bg-slate-900 text-slate-200">
                  {m}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-2 text-[10px] text-slate-400">▼</div>
          </div>

          {/* VRAM Limit Indicator Pill */}
          <div className="hidden lg:flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1.5 text-xs text-slate-300">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span>8GB VRAM Safe</span>
          </div>

          {/* Document Drawer Toggle Button */}
          <button
            onClick={onToggleSidebar}
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium shadow-sm transition-all ${
              isSidebarOpen
                ? 'border-cyan-500 bg-cyan-500/20 text-cyan-200'
                : 'border-slate-700 bg-slate-900/90 text-slate-300 hover:border-slate-600 hover:bg-slate-800'
            }`}
          >
            <FolderGit2 className="h-3.5 w-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Documents</span>
            <span className="rounded-full bg-cyan-950 px-1.5 py-0.2 text-[10px] font-bold text-cyan-300 border border-cyan-500/30">
              {status?.total_documents ?? 0}
            </span>
          </button>

        </div>
      </div>
    </header>
  );
};
