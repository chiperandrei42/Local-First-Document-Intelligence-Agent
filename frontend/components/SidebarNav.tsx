'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { 
  MessageSquare, 
  Folder, 
  Cpu, 
  PanelLeftClose
} from 'lucide-react';
import { StatusResponse } from '@/lib/types';

interface SidebarNavProps {
  status: StatusResponse | null;
  activeView: 'chat' | 'documents' | 'settings';
  onViewChange: (view: 'chat' | 'documents' | 'settings') => void;
}

export function SidebarNav({ status, activeView, onViewChange }: SidebarNavProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  const isExpanded = isHovered || activeView === 'documents' || isPinned;

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative h-full bg-[#060607] border-r border-white/5 flex flex-col justify-between py-5 px-3 z-40 transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] select-none ${
        isExpanded 
          ? 'w-64 shadow-[16px_0_40px_rgba(0,0,0,0.9)]' 
          : 'w-[64px]'
      }`}
    >
      {/* Top Brand & Navigation */}
      <div className="flex flex-col w-full">
        
        {/* Gemini-style Header: Clean Logo on left, Absolute Panel Toggle on right */}
        <div className="relative flex items-center h-10 mb-6">
          {/* Logo + Brand Name */}
          <div 
            onClick={() => onViewChange('chat')}
            className="cursor-pointer flex items-center h-10 min-w-0"
            title="cetera"
          >
            {/* Exact 40x40 Icon Anchor */}
            <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
              <Image 
                src="/cetera-icon-transparent.png" 
                alt="cetera" 
                width={28} 
                height={28}
                className="drop-shadow-[0_0_12px_rgba(97,77,255,0.6)]"
                priority
              />
            </div>

            {/* Clean Brand Text */}
            <span className={`font-sans text-xl font-bold tracking-tight text-white pl-3 transition-opacity duration-200 ${
              isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}>
              cetera
            </span>
          </div>

          {/* Gemini-style Sidebar Panel Toggle Button (Absolute, zero layout shift) */}
          <button
            onClick={() => setIsPinned(!isPinned)}
            title={isPinned ? "Unpin sidebar (auto-collapse on hover leave)" : "Pin sidebar open"}
            className={`cursor-pointer absolute right-0 top-0 h-10 w-10 flex items-center justify-center rounded-xl transition-all duration-200 ${
              isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
            } ${
              isPinned 
                ? 'text-[#614DFF] bg-[#614DFF]/15 hover:bg-[#614DFF]/25 shadow-[0_0_12px_rgba(97,77,255,0.3)]' 
                : 'text-white/40 hover:text-white hover:bg-white/10'
            }`}
          >
            <PanelLeftClose className="w-5 h-5" />
          </button>

        </div>

        {/* Navigation Items (Exact 40x40 Alignment) */}
        <div className="flex flex-col gap-2 w-full">
          <NavTab
            icon={<MessageSquare className="w-5 h-5" />}
            label="Chat"
            isActive={activeView === 'chat'}
            isExpanded={isExpanded}
            onClick={() => onViewChange('chat')}
          />

          <NavTab
            icon={<Folder className="w-5 h-5" />}
            label="Documents"
            badge={status?.total_documents ? `${status.total_documents}` : undefined}
            isActive={activeView === 'documents'}
            isExpanded={isExpanded}
            onClick={() => onViewChange('documents')}
          />

          <NavTab
            icon={<Cpu className="w-5 h-5" />}
            label={status?.default_llm || "Llama 3.2"}
            sublabel="Active Model"
            isActive={false}
            isExpanded={isExpanded}
            onClick={() => {}}
          />
        </div>

      </div>

      {/* Clean Minimalist Status Indicator (Exact 40x40 Alignment) */}
      <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
        <div 
          className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]"
          title="Local Enclave Online"
        />
      </div>
    </aside>
  );
}

interface NavTabProps {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  badge?: string;
  isActive: boolean;
  isExpanded: boolean;
  onClick: () => void;
}

function NavTab({ icon, label, sublabel, badge, isActive, isExpanded, onClick }: NavTabProps) {
  return (
    <button
      onClick={onClick}
      title={!isExpanded ? label : undefined}
      className={`w-full cursor-pointer group flex items-center h-10 rounded-xl overflow-hidden transition-colors duration-150 ${
        isActive
          ? 'bg-[#614DFF] text-white shadow-[0_0_20px_rgba(97,77,255,0.35)]'
          : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
      }`}
    >
      {/* Icon Slot: Fixed 40x40 container */}
      <div className={`w-10 h-10 flex-shrink-0 flex items-center justify-center ${isActive ? 'text-white' : 'text-white/60 group-hover:text-white'}`}>
        {icon}
      </div>

      {/* Permanently fixed-left label container (Zero horizontal drift) */}
      <div className={`w-[180px] flex-shrink-0 flex items-center justify-between pl-3 pr-3 whitespace-nowrap transition-opacity duration-150 ${
        isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}>
        <div className="min-w-0">
          <p className={`text-sm leading-tight ${isActive ? 'font-semibold text-white' : 'font-medium'}`}>
            {label}
          </p>
          {sublabel && (
            <p className={`text-[10px] leading-tight mt-0.5 ${isActive ? 'text-white/70' : 'text-white/40'}`}>
              {sublabel}
            </p>
          )}
        </div>

        {badge && (
          <span className={`ml-auto px-1.5 py-0.5 text-[10px] font-bold rounded-md ${
            isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-white/60'
          }`}>
            {badge}
          </span>
        )}
      </div>
    </button>
  );
}








