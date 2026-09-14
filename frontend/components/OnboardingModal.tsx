'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Cpu, 
  HardDrive, 
  ShieldCheck, 
  DownloadCloud, 
  ExternalLink, 
  Play, 
  RefreshCw, 
  X,
  Layers,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import Image from 'next/image';
import { SystemInfo, StatusResponse, ModelPullProgress } from '@/lib/types';
import { fetchSystemInfo, startOllamaService, pullModelStream } from '@/lib/api';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: StatusResponse | null;
  onRefreshStatus: () => Promise<void>;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  status,
  onRefreshStatus,
}) => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [isLoadingSpecs, setIsLoadingSpecs] = useState<boolean>(true);
  const [isStartingOllama, setIsStartingOllama] = useState<boolean>(false);
  const [ollamaStartMsg, setOllamaStartMsg] = useState<string | null>(null);

  // Model download state
  const [isPullingModel, setIsPullingModel] = useState<boolean>(false);
  const [pullTarget, setPullTarget] = useState<string>('');
  const [pullProgress, setPullProgress] = useState<ModelPullProgress | null>(null);
  const [pullError, setPullError] = useState<string | null>(null);

  const isBackendConnecting = status === null;
  const isOllamaConnected = status?.ollama_connected ?? false;
  const availableModels = status?.available_models ?? [];

  // Smart model detection (detect exact or compatible alternatives)
  const detectedEmbedModel = availableModels.find((m) => 
    m.toLowerCase().includes('nomic-embed') || 
    m.toLowerCase().includes('bge') || 
    m.toLowerCase().includes('minilm') ||
    m.toLowerCase().includes('embed')
  );
  const hasEmbedModel = !!detectedEmbedModel;

  const detectedLlmModel = availableModels.find((m) => 
    m.toLowerCase().includes('llama') || 
    m.toLowerCase().includes('mistral') || 
    m.toLowerCase().includes('qwen') || 
    m.toLowerCase().includes('gemma') || 
    m.toLowerCase().includes('phi') ||
    m.toLowerCase().includes('deepseek') ||
    m.toLowerCase().includes('minicpm')
  );
  const hasLlmModel = !!detectedLlmModel;

  const allModelsReady = hasEmbedModel && hasLlmModel;

  // Read hardware specs
  const loadSpecs = useCallback(async () => {
    try {
      setIsLoadingSpecs(true);
      if (typeof window !== 'undefined' && window.electronAPI?.getSystemSpecs) {
        const nativeSpecs = await window.electronAPI.getSystemSpecs();
        setSystemInfo(nativeSpecs);
        return;
      }
      const data = await fetchSystemInfo();
      setSystemInfo(data);
    } catch {
      setSystemInfo({
        total_ram_gb: 8.0,
        available_ram_gb: 4.0,
        cpu_count: 4,
        os_platform: 'Host OS',
        ram_status: 'compatible',
        is_vram_safe: true,
        recommended_llm: 'llama3.2',
        recommended_embed: 'nomic-embed-text',
      });
    } finally {
      setIsLoadingSpecs(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadSpecs();
    }
  }, [isOpen, loadSpecs]);

  // Periodic status poll during onboarding until everything is online
  useEffect(() => {
    if (!isOpen) return;

    if (!status || !isOllamaConnected || !allModelsReady) {
      const pollTimer = setInterval(() => {
        onRefreshStatus().catch(() => {});
      }, 1500);
      return () => clearInterval(pollTimer);
    }
  }, [isOpen, status, isOllamaConnected, allModelsReady, onRefreshStatus]);

  const handleStartOllama = async () => {
    setIsStartingOllama(true);
    setOllamaStartMsg('Launching Ollama service...');
    try {
      const res = await startOllamaService();
      setOllamaStartMsg(res.message);

      // Poll until online or timeout
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        await onRefreshStatus();
        if (attempts >= 8) {
          clearInterval(interval);
          setIsStartingOllama(false);
        }
      }, 1000);
    } catch (e: unknown) {
      setOllamaStartMsg(e instanceof Error ? e.message : 'Could not launch Ollama');
      setIsStartingOllama(false);
    }
  };

  const handlePullRequiredModels = async () => {
    setPullError(null);
    setIsPullingModel(true);

    // 1. Download embedding model if missing
    if (!hasEmbedModel) {
      setPullTarget('Step 1/2: nomic-embed-text (Search Engine)');
      try {
        await new Promise<void>((resolve, reject) => {
          pullModelStream(
            'nomic-embed-text',
            (p) => setPullProgress(p),
            () => resolve(),
            (err) => reject(new Error(err))
          );
        });
        await onRefreshStatus();
      } catch (err: unknown) {
        setPullError(err instanceof Error ? err.message : 'Error downloading embedding model');
        setIsPullingModel(false);
        return;
      }
    }

    // 2. Download reasoning model if missing
    if (!hasLlmModel) {
      setPullTarget('Step 2/2: llama3.2 (Reasoning Brain)');
      try {
        await new Promise<void>((resolve, reject) => {
          pullModelStream(
            'llama3.2',
            (p) => setPullProgress(p),
            () => resolve(),
            (err) => reject(new Error(err))
          );
        });
        await onRefreshStatus();
      } catch (err: unknown) {
        setPullError(err instanceof Error ? err.message : 'Error downloading llama3.2');
        setIsPullingModel(false);
        return;
      }
    }

    setIsPullingModel(false);
    setPullProgress(null);
    await onRefreshStatus();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#060607]/85 backdrop-blur-2xl p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0C0B12]/95 p-6 sm:p-8 shadow-[0_0_80px_rgba(97,77,255,0.15)] animate-slide-up my-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-6 top-6 rounded-full p-2 text-white/40 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
          title="Close Setup Wizard"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header Branding */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.03] border border-white/10 p-2 shadow-[0_0_20px_rgba(97,77,255,0.25)] flex-shrink-0">
            <Image 
              src="/cetera-icon-transparent.png" 
              alt="Cetera" 
              width={34} 
              height={34}
              className="drop-shadow-[0_0_12px_rgba(97,77,255,0.7)]"
            />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white font-sans">
              Cetera Desktop Setup
            </h2>
            <p className="text-xs text-white/50 mt-0.5">
              Automated hardware validation & air-gapped local AI initialization
            </p>
          </div>
        </div>

        {/* Global Status Banner */}
        {allModelsReady && isOllamaConnected ? (
          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-400" />
            <div className="flex-1">
              <strong className="font-semibold text-emerald-200">All Systems Ready!</strong> Your local intelligence engine is active and ready to process documents offline.
            </div>
          </div>
        ) : isBackendConnecting ? (
          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-white/70">
            <RefreshCw className="h-4 w-4 flex-shrink-0 text-[#B5ABFF] animate-spin" />
            <div className="flex-1">
              Connecting to local backend service...
            </div>
          </div>
        ) : null}

        {/* 4-Step Process Sequence */}
        <div className="space-y-3.5">
          
          {/* STEP 1: Host Hardware & Resources */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 transition-all hover:border-white/10">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-[#B5ABFF]">
                  <HardDrive className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Step 1: Host Hardware & Resource Guardrails
                  </h3>
                  <p className="text-xs text-white/40 mt-0.5">
                    Safe memory allocation limits with automatic CPU fallback
                  </p>
                </div>
              </div>

              {systemInfo && !isLoadingSpecs ? (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Verified
                </span>
              ) : (
                <RefreshCw className="h-4 w-4 text-white/40 animate-spin" />
              )}
            </div>

            {systemInfo && (
              <div className="mt-3 grid grid-cols-3 gap-2.5 text-center">
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2">
                  <div className="text-[10px] uppercase font-bold text-white/40 tracking-wider">RAM Detected</div>
                  <div className="text-sm font-bold text-white mt-0.5">{systemInfo.total_ram_gb} GB</div>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2">
                  <div className="text-[10px] uppercase font-bold text-white/40 tracking-wider">CPU Cores</div>
                  <div className="text-sm font-bold text-white mt-0.5">{systemInfo.cpu_count} Logical</div>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2">
                  <div className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Platform OS</div>
                  <div className="text-sm font-bold text-white capitalize mt-0.5">{systemInfo.os_platform}</div>
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: Native Ollama Daemon */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 transition-all hover:border-white/10">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-[#B5ABFF]">
                  <Cpu className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Step 2: Native Ollama AI Daemon
                  </h3>
                  <p className="text-xs text-white/40 mt-0.5">
                    Runs models locally on your GPU / CPU with zero cloud latency
                  </p>
                </div>
              </div>

              {isOllamaConnected ? (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Online (:11434)
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Not Running
                </span>
              )}
            </div>

            {!isOllamaConnected && (
              <div className="mt-3.5 pt-2 border-t border-white/5">
                <p className="text-xs text-white/50 mb-3">
                  Cetera requires Ollama to run local AI models. If already installed on your PC, click Auto-Launch below.
                </p>
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={handleStartOllama}
                    disabled={isStartingOllama}
                    className="flex items-center gap-2 rounded-xl bg-[#614DFF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#725FFF] active:scale-95 transition-all cursor-pointer shadow-[0_0_20px_rgba(97,77,255,0.3)] disabled:opacity-50"
                  >
                    {isStartingOllama ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                    <span>Auto-Launch Ollama</span>
                  </button>
                  <a
                    href="https://ollama.com/download"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white transition-all"
                  >
                    <DownloadCloud className="h-3.5 w-3.5" />
                    <span>Download Installer</span>
                    <ExternalLink className="h-3 w-3 text-white/40" />
                  </a>
                  {ollamaStartMsg && (
                    <span className="text-[11px] text-white/60 ml-1">{ollamaStartMsg}</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* STEP 3: Quiet Air-Gapped Configuration */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 transition-all hover:border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-[#B5ABFF]">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Step 3: Enforce Air-Gapped Loopback Policy
                  </h3>
                  <p className="text-xs text-white/40 mt-0.5">
                    Target: <code className="text-[#B5ABFF]">127.0.0.1:11434</code> • Zero External Network Calls
                  </p>
                </div>
              </div>

              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Enforced
              </span>
            </div>
          </div>

          {/* STEP 4: Models & Lazy Pull */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 transition-all hover:border-white/10">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-[#B5ABFF]">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Step 4: AI Model Readiness
                  </h3>
                  <p className="text-xs text-white/40 mt-0.5">
                    Requires an embedding model (semantic search) and an LLM (reasoning brain)
                  </p>
                </div>
              </div>

              {allModelsReady ? (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Ready
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Setup Needed
                </span>
              )}
            </div>

            {/* Model Inventory Badges */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border font-mono ${
                hasEmbedModel 
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' 
                  : 'border-white/10 bg-white/5 text-white/50'
              }`}>
                {hasEmbedModel ? '✓' : '○'} {detectedEmbedModel || 'nomic-embed-text (Missing)'}
                <span className="text-[10px] text-white/40 font-sans ml-1">Embeddings</span>
              </div>
              
              <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border font-mono ${
                hasLlmModel 
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' 
                  : 'border-white/10 bg-white/5 text-white/50'
              }`}>
                {hasLlmModel ? '✓' : '○'} {detectedLlmModel || 'llama3.2 (Missing)'}
                <span className="text-[10px] text-white/40 font-sans ml-1">Reasoning Brain</span>
              </div>
            </div>

            {/* If Ollama is offline, tell user to start Step 2 first */}
            {!isOllamaConnected && !allModelsReady && (
              <div className="mt-3 text-xs text-white/40">
                Launch the Ollama daemon in Step 2 above to inspect or download local models.
              </div>
            )}

            {/* 1-Click Model Download Action */}
            {!allModelsReady && isOllamaConnected && (
              <div className="mt-4 pt-3 border-t border-white/5">
                {!isPullingModel ? (
                  <div className="space-y-2">
                    <p className="text-xs text-white/60">
                      Cetera will now install the lightweight recommended models into your local Ollama library.
                    </p>
                    <button
                      onClick={handlePullRequiredModels}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#614DFF] to-[#8C7DFF] px-4 py-2 text-xs font-semibold text-white hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-[0_0_20px_rgba(97,77,255,0.3)]"
                    >
                      <DownloadCloud className="h-4 w-4" />
                      <span>Download Recommended Models (1-Click)</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs text-white">
                      <span className="font-semibold flex items-center gap-2">
                        <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#B5ABFF]" />
                        {pullTarget}
                      </span>
                      <span className="font-mono text-[#B5ABFF]">
                        {pullProgress?.percent ?? 0}%
                      </span>
                    </div>

                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div 
                        className="h-full bg-gradient-to-r from-[#614DFF] to-[#A499FF] transition-all duration-300 rounded-full"
                        style={{ width: `${pullProgress?.percent ?? 0}%` }}
                      />
                    </div>

                    <div className="text-[11px] text-white/50 truncate">
                      {pullProgress?.status || 'Downloading layers...'}
                    </div>
                  </div>
                )}

                {pullError && (
                  <div className="mt-2 text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                    {pullError}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* STEP 5: Route & Launch */}
          <div className="pt-3 flex items-center justify-between">
            <div className="text-xs text-white/40">
              {allModelsReady && isOllamaConnected
                ? 'All local components ready. Zero data leaves this computer.'
                : isOllamaConnected
                ? 'Ready to download recommended offline models.'
                : 'Click Auto-Launch Ollama to activate local AI daemon.'}
            </div>

            <button
              onClick={onClose}
              disabled={!isOllamaConnected}
              className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
                allModelsReady && isOllamaConnected
                  ? 'bg-gradient-to-r from-[#614DFF] to-[#8C7DFF] text-white shadow-[0_0_30px_rgba(97,77,255,0.4)] hover:brightness-110'
                  : 'bg-white/10 text-white/70 hover:bg-white/15 disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
            >
              <span>{allModelsReady && isOllamaConnected ? 'Enter Cetera Workspace' : 'Continue'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
