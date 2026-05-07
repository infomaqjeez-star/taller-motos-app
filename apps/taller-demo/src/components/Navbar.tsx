"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Package, LayoutDashboard, AlertTriangle,
  MessageCircle, BarChart2, Users, Truck, ShoppingCart,
  Clock, Timer, Settings,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useAlarms } from "../hooks/useAlarms";

interface NavbarProps {
  overdueCount?: number;
  lowStockCount?: number;
  notificationCount?: number;
  onOpenNotifications?: () => void;
}

export default function Navbar({
  overdueCount = 0,
  lowStockCount = 0,
  notificationCount = 0,
  onOpenNotifications,
}: NavbarProps) {
  const pathname = usePathname();
  const [currentTime, setCurrentTime] = useState<string>("");
  const { flexAlarm, correoAlarm, formatCountdown, config } = useAlarms();

  // Actualizar reloj cada segundo
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("es-AR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
          timeZone: "America/Argentina/Buenos_Aires",
        })
      );
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const links = [
    { href: "/taller",       label: "Taller",       icon: LayoutDashboard, badge: overdueCount,  badgeColor: "bg-red-500" },
    { href: "/ventas",       label: "Vender",       icon: ShoppingCart,    badge: 0,             badgeColor: "" },
    { href: "/estadisticas", label: "Estadísticas", icon: BarChart2,       badge: 0,             badgeColor: "" },
    { href: "/agenda",       label: "Agenda",       icon: Users,           badge: 0,             badgeColor: "" },
    { href: "/inventario",   label: "Pedidos",     icon: Package,         badge: lowStockCount, badgeColor: "bg-yellow-500" },
  ];

  return (
    <header className="bg-[#FDB71A] border-b border-[#E09A00] sticky top-0 z-50 shadow-lg">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">

          {/* Logo — clic lleva al inicio */}
          <Link href="/" className="flex items-center h-full py-1">
            <Image
              src="/logo-maqjeez.png"
              alt="MAQJEEZ"
              width={130}
              height={44}
              className="object-contain h-full w-auto"
              priority
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-1">
            {links.map(({ href, label, icon: Icon, badge, badgeColor }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  style={active ? {
                    background: "rgba(30,58,138,0.92)",
                    boxShadow: "0 0 14px 2px rgba(0,229,255,0.35)",
                    border: "1px solid rgba(0,229,255,0.50)",
                  } : {}}
                  className={`relative flex items-center gap-2 px-3 py-2 rounded-xl font-semibold text-sm transition-all
                    ${active
                      ? "text-white"
                      : "text-[#1E3A8A] hover:bg-[#E09A00]/40"}`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                  {badge > 0 && (
                    <span className={`absolute -top-1 -right-1 ${badgeColor} text-white text-[10px]
                      font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1`}>
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}

            {onOpenNotifications && (
              <button
                onClick={onOpenNotifications}
                className={`relative flex items-center gap-2 px-3 py-2 rounded-xl font-semibold text-sm transition-colors
                  ${notificationCount > 0
                    ? "text-green-800 bg-green-200/40 hover:bg-green-200/60"
                    : "text-[#1E3A8A] hover:bg-[#E09A00]/40"}`}
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-green-600 text-white text-[10px]
                    font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {notificationCount}
                  </span>
                )}
              </button>
            )}

            <ThemeToggle />

            {/* Reloj y Cuenta Regresiva - Diseño Profesional con 3 Relojes */}
            <div className="hidden sm:flex items-center gap-3 ml-4 pl-4 border-l border-[#E09A00]/30">
              {/* Reloj Principal */}
              <div 
                className="flex items-center gap-2 bg-gradient-to-br from-white/95 to-white/90 px-3 py-1.5 rounded-xl shadow-lg border-2 border-[#1E3A8A]/20 hover:border-[#1E3A8A]/40 transition-all"
                title="Hora Argentina"
              >
                <Clock className="w-4 h-4 text-[#1E3A8A]" />
                <span className="font-mono font-bold text-[#1E3A8A] text-sm tracking-wider">
                  {currentTime || "--:--:--"}
                </span>
                <span className="text-[10px] font-bold text-[#1E3A8A]/60 bg-[#1E3A8A]/10 px-1.5 py-0.5 rounded">ARG</span>
              </div>

              {/* Alarma Flex con Cuenta Regresiva debajo */}
              {config.flexAlarm.enabled && flexAlarm && (
                <div className="flex flex-col gap-1">
                  <div 
                    className="flex items-center gap-2 px-3 py-1 rounded-xl shadow-md border-2 bg-gradient-to-br from-orange-100 to-orange-50 border-orange-400"
                    title={`Alarma Flex: ${config.flexAlarm.message}`}
                  >
                    <Clock className="w-3.5 h-3.5 text-orange-600" />
                    <span className="font-mono font-bold text-orange-700 text-xs tracking-wider">
                      {flexAlarm.time.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })}
                    </span>
                    <span className="text-[9px] font-bold text-orange-600 bg-orange-200 px-1.5 py-0.5 rounded">FLEX</span>
                  </div>
                  <div 
                    className={`flex items-center justify-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-mono font-bold ${
                      flexAlarm.diff < 300000
                        ? "bg-red-100 border-red-300 text-red-700 animate-pulse"
                        : flexAlarm.diff < 900000
                        ? "bg-yellow-100 border-yellow-300 text-yellow-700"
                        : "bg-green-100 border-green-300 text-green-700"
                    }`}
                  >
                    <Timer className="w-3 h-3" />
                    {formatCountdown(flexAlarm.diff)}
                  </div>
                </div>
              )}

              {/* Alarma Correo */}
              {config.correoAlarm.enabled && correoAlarm && (
                <div 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl shadow-md border-2 bg-gradient-to-br from-blue-100 to-blue-50 border-blue-400"
                  title={`Alarma Correo: ${config.correoAlarm.message}`}
                >
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="font-mono font-bold text-blue-700 text-sm tracking-wider">
                    {correoAlarm.time.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })}
                  </span>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-200 px-1.5 py-0.5 rounded">CORREO</span>
                </div>
              )}

              {/* Configuración de alarmas */}
              <Link 
                href="/configuracion/alarmas"
                className="p-2 rounded-xl bg-[#1E3A8A]/10 hover:bg-[#1E3A8A]/20 transition-all hover:scale-110"
                title="Configurar alarmas"
              >
                <Settings className="w-4 h-4 text-[#1E3A8A]" />
              </Link>
            </div>
          </nav>

          {/* Mobile: iconos rápidos */}
          <div className="sm:hidden flex items-center gap-2">
            {onOpenNotifications && notificationCount > 0 && (
              <button
                onClick={onOpenNotifications}
                className="relative p-2 rounded-xl bg-green-200/40 text-green-800"
              >
                <MessageCircle className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 bg-green-600 text-white text-[9px]
                  font-black rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
                  {notificationCount}
                </span>
              </button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Alerta equipos vencidos */}
      {overdueCount > 0 && (
        <div className="bg-red-700/20 border-t border-red-500/40 px-4 py-2">
          <div className="max-w-5xl mx-auto flex items-center gap-2 text-red-800 text-sm font-semibold">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>
              {overdueCount} equipo{overdueCount > 1 ? "s" : ""} con más de 90 días esperando retiro
            </span>
          </div>
        </div>
      )}
    </header>
  );
}
