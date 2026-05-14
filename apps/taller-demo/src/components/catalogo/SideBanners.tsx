"use client";

import React, { useState, useRef } from 'react';
import { 
  Crown, TrendingUp, Flame, Gift, Zap, Globe, 
  Sparkles, Star, ArrowRight
} from 'lucide-react';

const hyperVisualStyles = `
  @keyframes float-extreme {
    0%, 100% { transform: translateY(0px) scale(1); }
    50% { transform: translateY(-20px) scale(1.05); }
  }
  @keyframes pulse-ring {
    0% { transform: scale(0.8); opacity: 0.5; }
    80%, 100% { transform: scale(2.5); opacity: 0; }
  }
  @keyframes hologram-sweep {
    0% { transform: translateY(-100%) rotate(45deg); opacity: 0; }
    20% { opacity: 0.5; }
    40%, 100% { transform: translateY(200%) rotate(45deg); opacity: 0; }
  }
  @keyframes marquee {
    0% { transform: translateX(0%); }
    100% { transform: translateX(-50%); }
  }

  .perspective-container {
    perspective: 1200px;
    transform-style: preserve-3d;
  }

  .card-3d-wrapper {
    transform-style: preserve-3d;
    transition: transform 0.1s ease-out;
    will-change: transform;
  }

  .z-pop-1 { transform: translateZ(30px); }
  .z-pop-2 { transform: translateZ(60px); }
  .z-pop-3 { transform: translateZ(100px); }
  .z-pop-4 { transform: translateZ(140px); }

  .glass-dark {
    background: linear-gradient(135deg, rgba(15,15,20,0.95) 0%, rgba(5,5,10,0.98) 100%);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255,255,255,0.1);
  }
`;

interface HyperBannerProps {
  type: 'seller' | 'buyer';
  badges: string;
  title: string;
  highlight: string;
  subtitle: string;
  features: string[];
  cta: string;
  colors: {
    neon1: string;
    neon2: string;
    glareColor: string;
    glowShadow: string;
    gradientBg: string;
    gradientText: string;
    btnGradient: string;
    iconColor: string;
  };
}

const HyperBanner = ({ type, badges, title, highlight, subtitle, features, cta, colors }: HyperBannerProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const [glare, setGlare] = useState({ opacity: 0, x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left; 
    const y = e.clientY - rect.top;  
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((y - centerY) / centerY) * -20; 
    const rotateY = ((x - centerX) / centerX) * 20;

    setStyle({
      transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
    });
    setGlare({ opacity: 1, x, y });
  };

  const handleMouseLeave = () => {
    setStyle({
      transform: 'rotateX(0deg) rotateY(0deg)',
      transition: 'transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)'
    });
    setGlare({ opacity: 0, x: 0, y: 0 });
  };

  const handleClick = () => {
    window.location.href = 'https://www.madsjeez.com.ar';
  };

  const isSeller = type === 'seller';

  return (
    <div 
      className="perspective-container w-[280px] h-[75vh] max-h-[800px] min-h-[650px] cursor-pointer group"
      style={{ '--color-1': colors.neon1, '--color-2': 'transparent' } as React.CSSProperties}
    >
      <style>{hyperVisualStyles}</style>
      <style>{`
        .neon-box-${type}::before {
          content: '';
          position: absolute;
          inset: -3px;
          background: linear-gradient(135deg, ${colors.neon1}, ${colors.neon2}, ${colors.neon1});
          border-radius: 2.2rem;
          z-index: -1;
          opacity: 0.6;
          transition: opacity 0.3s;
        }
        .perspective-container:hover .neon-box-${type}::before {
          opacity: 1;
        }
      `}</style>

      <div 
        ref={cardRef}
        className={`card-3d-wrapper relative w-full h-full rounded-[2rem] glass-dark neon-box-${type} flex flex-col items-center p-5 shadow-2xl`}
        style={{ ...style, boxShadow: `0 30px 60px -15px ${colors.glowShadow}` }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        {/* Glare dinámico que sigue el ratón */}
        <div 
          className="absolute inset-0 pointer-events-none rounded-[2rem] z-50 mix-blend-screen transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle 250px at ${glare.x}px ${glare.y}px, ${colors.glareColor}, transparent 100%)`,
            opacity: glare.opacity,
          }}
        />

        {/* Barrido holográfico (Scanline) */}
        <div className="absolute inset-0 overflow-hidden rounded-[2rem] pointer-events-none z-40">
          <div className="absolute top-0 left-0 w-full h-[200%] bg-gradient-to-b from-transparent via-white/10 to-transparent -translate-y-full opacity-0 group-hover:animate-[hologram-sweep_3s_ease-in-out_infinite]" />
        </div>

        {/* Malla de fondo tecnológica */}
        <div className="absolute inset-0 z-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:30px_30px] rounded-[2rem] opacity-30" />

        {/* ===================== CENTRO VISUAL 3D MASIVO ===================== */}
        <div className="relative w-full h-[40%] min-h-[220px] flex items-center justify-center mt-4 mb-4 transform-style-preserve-3d">
          
          {/* Anillos de energía de fondo (z-pop-1) */}
          <div className="absolute w-44 h-44 rounded-full border border-dashed z-pop-1 opacity-30" style={{ borderColor: colors.neon1 }} />
          <div className="absolute w-56 h-56 rounded-full border border-solid z-pop-1 opacity-10" style={{ borderColor: colors.neon2 }} />
          
          {/* Pulsos de energía */}
          <div className="absolute w-28 h-28 rounded-full z-0 animate-[pulse-ring_2s_ease-out_infinite]" style={{ backgroundColor: colors.neon1 }} />

          {/* Objeto Principal Flotante (z-pop-3) */}
          <div className="relative z-pop-3 animate-[float-extreme_4s_ease-in-out_infinite]">
            <div className={`w-28 h-28 rounded-3xl bg-gradient-to-br ${colors.gradientBg} p-1 shadow-[0_0_80px_rgba(0,0,0,0.8)] relative overflow-hidden flex items-center justify-center group-hover:scale-110 transition-transform duration-500`}>
              {/* Brillo interior */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
              
              {/* Icono Gigante */}
              <div className="relative z-20">
                {isSeller ? (
                  <Crown className="w-14 h-14 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]" />
                ) : (
                  <Gift className="w-14 h-14 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]" />
                )}
              </div>
            </div>
          </div>

          {/* Partículas / Elementos Orbitales (z-pop-4 para salir mucho de la pantalla) */}
          <div className={`absolute top-10 right-6 p-2.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 z-pop-4 animate-[float-extreme_3s_ease-in-out_infinite_0.5s] shadow-[0_0_20px_${colors.glowShadow}]`}>
            {isSeller ? <TrendingUp className={`w-5 h-5 ${colors.iconColor}`} /> : <Zap className={`w-5 h-5 ${colors.iconColor}`} />}
          </div>
          <div className={`absolute bottom-10 left-6 p-2.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 z-pop-4 animate-[float-extreme_5s_ease-in-out_infinite_1s] shadow-[0_0_20px_${colors.glowShadow}]`}>
            {isSeller ? <Flame className={`w-5 h-5 ${colors.iconColor}`} /> : <Globe className={`w-5 h-5 ${colors.iconColor}`} />}
          </div>
        </div>

        {/* ===================== TIPOGRAFÍA 3D ===================== */}
        <div className="text-center w-full z-pop-2 flex flex-col items-center">
          <div className={`px-4 py-1.5 rounded-full border border-white/10 bg-black/50 backdrop-blur-md flex items-center gap-2 mb-5 shadow-[0_0_15px_${colors.glowShadow}]`}>
            <Sparkles className={`w-4 h-4 ${colors.iconColor}`} />
            <span className={`text-xs font-black tracking-[0.2em] uppercase text-transparent bg-clip-text bg-gradient-to-r ${colors.gradientText}`}>{badges}</span>
          </div>

          <h2 className="text-3xl lg:text-4xl font-black tracking-tighter leading-[1] text-white drop-shadow-2xl mb-2">
            {title}
            <br />
            <span className={`text-transparent bg-clip-text bg-gradient-to-r ${colors.gradientText} filter drop-shadow-[0_0_10px_${colors.glowShadow}]`}>
              {highlight}
            </span>
          </h2>
          
          <p className="text-sm text-gray-400 font-medium leading-relaxed px-2 mt-4">
            {subtitle}
          </p>
        </div>

        <div className="flex-grow" />

        {/* ===================== MARQUEE & BOTÓN CTA (z-pop-3) ===================== */}
        <div className="w-full relative z-pop-2 mb-5">
          <div className="relative w-full overflow-hidden flex whitespace-nowrap opacity-50 py-2 mask-image-linear-edges">
            <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[#0a0a0f] to-transparent z-10" />
            <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[#0a0a0f] to-transparent z-10" />
            <div className="flex animate-[marquee_15s_linear_infinite] gap-5">
              {[...features, ...features, ...features].map((feat, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Star className={`w-3 h-3 ${colors.iconColor}`} />
                  <span className="text-[10px] font-black tracking-widest text-gray-400 uppercase">{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="w-full z-pop-3 pb-2">
          <button className={`w-full relative overflow-hidden rounded-2xl group/btn p-[2px] transition-transform active:scale-95`}>
            {/* Borde de botón */}
            <span className={`absolute inset-0 bg-gradient-to-r ${colors.btnGradient} opacity-70 group-hover/btn:opacity-100`} />
            
            <div className="relative bg-[#050508] hover:bg-transparent transition-colors duration-300 rounded-[14px] px-4 py-4 flex items-center justify-center gap-3">
              <span className="font-black uppercase tracking-[0.2em] text-sm text-white drop-shadow-lg">
                {cta}
              </span>
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 group-hover/btn:bg-white/20 transition-colors">
                <ArrowRight className="w-4 h-4 text-white group-hover/btn:translate-x-1 transition-transform" />
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

function MobileBanner() {
  const handleClick = () => {
    window.location.href = 'https://www.madsjeez.com.ar';
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] xl:hidden">
      <div className="flex gap-2 p-2" style={{ background: 'rgba(3,3,5,0.95)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        {/* Banner Vendedor Mobile */}
        <button onClick={handleClick} className="flex-1 relative overflow-hidden rounded-xl p-[1.5px] active:scale-[0.98] transition-transform">
          <span className="absolute inset-0 bg-gradient-to-r from-[#ff2a00] to-[#ff9900] opacity-80" />
          <div className="relative bg-[#0a0a0f] rounded-[10px] px-3 py-2.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#ff2a00] to-[#ffaa00] flex items-center justify-center shrink-0">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div className="text-left min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#ffaa00]">Madsjeez Pro</p>
              <p className="text-xs font-black text-white truncate">Domina el Mercado</p>
            </div>
            <ArrowRight className="w-4 h-4 text-[#ffaa00] shrink-0 ml-auto" />
          </div>
        </button>

        {/* Banner Comprador Mobile */}
        <button onClick={handleClick} className="flex-1 relative overflow-hidden rounded-xl p-[1.5px] active:scale-[0.98] transition-transform">
          <span className="absolute inset-0 bg-gradient-to-r from-[#00e5ff] to-[#aa00ff] opacity-80" />
          <div className="relative bg-[#0a0a0f] rounded-[10px] px-3 py-2.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#00e5ff] to-[#aa00ff] flex items-center justify-center shrink-0">
              <Gift className="w-5 h-5 text-white" />
            </div>
            <div className="text-left min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#00e5ff]">Acceso Total</p>
              <p className="text-xs font-black text-white truncate">Universo de Ofertas</p>
            </div>
            <ArrowRight className="w-4 h-4 text-[#00e5ff] shrink-0 ml-auto" />
          </div>
        </button>
      </div>
    </div>
  );
}

export default function SideBanners() {
  return (
    <>
      {/* Desktop xl+: Banners laterales verticales */}
      <div className="fixed left-4 top-1/2 -translate-y-1/2 z-40 hidden xl:block">
        <HyperBanner 
          type="seller"
          badges="Madsjeez Pro"
          title="DOMINA EL"
          highlight="MERCADO"
          subtitle="Vende tus productos a todo el país. Multiplica tu facturación con exposición masiva."
          features={["Exposición Nivel Dios", "Pagos Diarios", "Cero Límites", "Soporte AI"]}
          cta="Crear Imperio"
          colors={{
            neon1: '#ff2a00',
            neon2: '#ff9900',
            glareColor: 'rgba(255, 80, 0, 0.25)',
            glowShadow: 'rgba(255, 42, 0, 0.5)',
            gradientBg: 'from-[#ff2a00] via-[#ff6a00] to-[#ffaa00]',
            gradientText: 'from-[#ffaa00] via-[#ff5500] to-[#ff2a00]',
            btnGradient: 'from-[#ff2a00] to-[#ffaa00]',
            iconColor: 'text-[#ffaa00]',
          }}
        />
      </div>

      <div className="fixed right-4 top-1/2 -translate-y-1/2 z-40 hidden xl:block">
        <HyperBanner 
          type="buyer"
          badges="Acceso Total"
          title="UNIVERSO DE"
          highlight="OFERTAS"
          subtitle="Descubre productos exclusivos, envíos relámpago y precios que rompen la matriz."
          features={["Envíos Flash", "Garantía Blindada", "Precios Épicos", "Compra 100% Segura"]}
          cta="Explorar Todo"
          colors={{
            neon1: '#00e5ff',
            neon2: '#aa00ff',
            glareColor: 'rgba(0, 229, 255, 0.25)',
            glowShadow: 'rgba(0, 229, 255, 0.5)',
            gradientBg: 'from-[#00e5ff] via-[#0077ff] to-[#aa00ff]',
            gradientText: 'from-[#00e5ff] via-[#55aaff] to-[#aa00ff]',
            btnGradient: 'from-[#00e5ff] to-[#aa00ff]',
            iconColor: 'text-[#00e5ff]',
          }}
        />
      </div>

      {/* Mobile/Tablet: Banner horizontal sticky bottom */}
      <MobileBanner />
    </>
  );
}
