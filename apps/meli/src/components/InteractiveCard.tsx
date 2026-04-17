"use client";

import { ReactNode, useRef, useState } from "react";

interface InteractiveCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: string;
  delay?: string;
}

export function InteractiveCard({ 
  children, 
  className = "", 
  glowColor = "rgba(255, 255, 255, 0.05)", 
  delay = "0ms" 
}: InteractiveCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState("perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)");
  const [glare, setGlare] = useState({ opacity: 0, background: "" });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -2; 
    const rotateY = ((x - centerX) / centerX) * 2;
    
    setTransform(`perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)`);
    const angle = Math.atan2(y - centerY, x - centerX) * (180 / Math.PI) - 90;
    setGlare({ 
      opacity: 1, 
      background: `linear-gradient(${angle}deg, rgba(255,255,255,0.05) 0%, ${glowColor} 40%, transparent 60%)` 
    });
  };

  const handleMouseLeave = () => {
    setTransform("perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)");
    setGlare({ opacity: 0, background: "" });
  };

  return (
    <div 
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden transition-all duration-500 ease-out ${className}`}
      style={{ transform, animationDelay: delay }}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent z-20" />
      <div 
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-500 z-20 mix-blend-screen"
        style={{ opacity: glare.opacity, background: glare.background }} 
      />
      {children}
    </div>
  );
}
