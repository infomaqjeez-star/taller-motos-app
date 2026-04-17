"use client";

import { ReactNode } from "react";

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  sublabel?: string;
  variant?: "default" | "gold" | "success" | "danger";
  className?: string;
}

export function StatCard({ 
  icon, 
  label, 
  value, 
  sublabel, 
  variant = "default",
  className = "" 
}: StatCardProps) {
  const variantStyles = {
    default: "",
    gold: "border-jeez-gold/20 shadow-[inset_0_0_20px_rgba(223,181,90,0.05)]",
    success: "",
    danger: "border-jeez-danger/40 bg-jeez-danger/5 shadow-[0_0_30px_rgba(239,68,68,0.1)]"
  };

  const labelStyles = {
    default: "text-gray-500",
    gold: "text-jeez-gold",
    success: "text-jeez-success",
    danger: "text-jeez-danger drop-shadow-md"
  };

  const valueStyles = {
    default: "text-white",
    gold: "text-white",
    success: "text-white",
    danger: "text-white drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]"
  };

  return (
    <div 
      className={`glass-panel rounded-[1.5rem] p-6 card-hover transition-all duration-300 relative overflow-hidden group ${variantStyles[variant]} ${className}`}
    >
      {variant === "danger" && (
        <div className="absolute inset-0 bg-gradient-to-r from-jeez-danger/0 via-jeez-danger/10 to-jeez-danger/0 animate-glow-sweep pointer-events-none" />
      )}
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        {icon}
      </div>
      <p className={`text-[10px] font-black uppercase tracking-widest mb-1 relative z-10 ${labelStyles[variant]}`}>
        {label}
      </p>
      <div className="flex items-end gap-3 relative z-10">
        <h3 className={`text-4xl font-black tracking-tight ${valueStyles[variant]}`}>
          {value}
        </h3>
        {sublabel && (
          <span className={`text-xs font-bold px-2 py-1 rounded mb-1 ${
            variant === "success" ? "text-jeez-success bg-jeez-success/10" : ""
          }`}>
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
