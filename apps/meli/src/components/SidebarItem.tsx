"use client";

import { LucideIcon } from "lucide-react";

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  id: string;
  activeTab: string;
  onClick: (id: string) => void;
  badge?: number;
}

export function SidebarItem({ icon: Icon, label, id, activeTab, onClick, badge }: SidebarItemProps) {
  const active = activeTab === id;
  
  return (
    <button 
      onClick={() => onClick(id)}
      className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl transition-all duration-300 group relative overflow-hidden mb-1
      ${active 
        ? 'bg-gradient-to-r from-amber-500/15 to-transparent text-amber-400 font-bold shadow-[inset_4px_0_0_0_#fbbf24]' 
        : 'text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-100 shadow-[inset_4px_0_0_0_transparent]'}`}
    >
      {active && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[sweepLight_3s_ease-in-out_infinite] skew-x-12 z-0" />
      )}
      <div className="flex items-center gap-3.5 relative z-10">
        <Icon className={`w-5 h-5 transition-all duration-300 ${
          active ? 'text-amber-400 scale-110 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]' : 'text-zinc-500 group-hover:text-zinc-300'
        }`} 
        />
        <span className="text-[13px] tracking-wide">{label}</span>
      </div>
      {badge && badge > 0 && (
        <span className="relative z-10 bg-gradient-to-br from-red-500 to-rose-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-[0_2px_8px_rgba(225,29,72,0.6)] animate-pulse">
          {badge}
        </span>
      )}
    </button>
  );
}
