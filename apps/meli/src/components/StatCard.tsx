"use client";

import { ReactNode } from "react";
import { InteractiveCard } from "./InteractiveCard";

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  sublabel?: string;
  trend?: string;
  variant?: "neutral" | "green" | "amber" | "red";
  delay?: string;
  className?: string;
}

export function StatCard({ 
  icon, 
  label, 
  value, 
  sublabel,
  trend,
  variant = "neutral",
  delay = "0ms",
  className = "" 
}: StatCardProps) {
  const colors = {
    neutral: { 
      bg: 'bg-[#0f0f13]/80', 
      text: 'text-zinc-300', 
      iconBg: 'bg-zinc-800/50', 
      border: 'border-white/[0.04]', 
      glow: 'rgba(255,255,255,0.03)',
      valueColor: 'text-white'
    },
    green: { 
      bg: 'bg-[#061810]/80', 
      text: 'text-emerald-400', 
      iconBg: 'bg-emerald-500/10', 
      border: 'border-emerald-500/20', 
      glow: 'rgba(52,211,153,0.1)',
      valueColor: 'text-emerald-400'
    },
    amber: { 
      bg: 'bg-[#1a1205]/80', 
      text: 'text-amber-400', 
      iconBg: 'bg-amber-500/10', 
      border: 'border-amber-500/20', 
      glow: 'rgba(251,191,36,0.1)',
      valueColor: 'text-amber-400'
    },
    red: { 
      bg: 'bg-[#1a0505]/80', 
      text: 'text-red-400', 
      iconBg: 'bg-red-500/10', 
      border: 'border-red-500/20', 
      glow: 'rgba(239,68,68,0.1)',
      valueColor: 'text-red-400'
    }
  };

  const style = colors[variant];

  return (
    <InteractiveCard 
      className={`rounded-[1.5rem] p-7 border backdrop-blur-2xl ${style.bg} ${style.border} group ${className}`} 
      glowColor={style.glow} 
      delay={delay}
    >
      <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full blur-[50px] opacity-30 group-hover:opacity-50 transition-opacity" style={{ backgroundColor: style.glow }} />
      <div className="flex justify-between items-start mb-5 relative z-10">
        <div>
          <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-1.5">{label}</h4>
          <div className="flex items-baseline gap-2.5">
            <h2 className={`text-3xl md:text-[2.5rem] font-black tracking-tight drop-shadow-lg ${style.valueColor}`}>
              {value}
            </h2>
            {trend && (
              <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded shadow-[0_2px_10px_rgba(52,211,153,0.15)]">
                ↑ {trend}
              </span>
            )}
          </div>
        </div>
        <div className={`p-3.5 rounded-2xl ${style.iconBg} ${style.text} border border-white/5 shadow-inner`}>
          {icon}
        </div>
      </div>
      {sublabel && <p className="text-[11px] text-zinc-500 font-medium relative z-10">{sublabel}</p>}
    </InteractiveCard>
  );
}
