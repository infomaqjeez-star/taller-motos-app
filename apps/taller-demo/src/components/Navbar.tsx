"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Package, LayoutDashboard, AlertTriangle,
  MessageCircle, BarChart2, Users, Truck, ShoppingCart,
  Clock, Timer, Settings, CheckCircle, Bug, BookOpen,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useAlarms } from "../hooks/useAlarms";
import BugReportModal from "@/components/BugReportModal";

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
  const [tareasPendientes, setTareasPendientes] = useState<number>(0);
  const [showBugReport, setShowBugReport] = useState(false);
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

  // Cargar conteo de tareas nuevas
  useEffect(() => {
    const loadTareasCount = async () => {
      try {
        const res = await fetch("/api/tareas?action=count_nuevas");
        const data = await res.json();
        setTareasPendientes(data.count || 0);
      } catch (e) {
        console.error("Error cargando conteo de tareas:", e);
      }
    };
    loadTareasCount();
    const interval = setInterval(loadTareasCount, 30000); // Actualizar cada 30s
    return () => clearInterval(interval);
  }, []);

  const links = [
    { href: "/taller",       label: "Taller",       icon: LayoutDashboard, badge: overdueCount,  badgeColor: "bg-red-500" },
    { href: "/ventas",       label: "Vender",       icon: ShoppingCart,    badge: 0,             badgeColor: "" },
    { href: "/catalogo",   label: "Catálogo",     icon: BookOpen,        badge: 0,             badgeColor: "" },
    { href: "/estadisticas", label: "Estadísticas", icon: BarChart2,       badge: 0,             badgeColor: "" },
    { href: "/agenda",       label: "Agenda",       icon: Users,           badge: 0,             badgeColor: "" },
    { href: "/inventario",   label: "Pedidos",     icon: Package,         badge: lowStockCount, badgeColor: "bg-yellow-500" },
  ];

  const flexUrgent = flexAlarm && flexAlarm.diff < 1800000;
  const correoUrgent = correoAlarm && correoAlarm.diff < 1800000;

  return (
    <header className="sticky top-0 z-50 border-b border-[#E09A00] bg-[#FDB71A] shadow-md shadow-black/10">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4 sm:gap-3 sm:px-5 lg:px-6">
        {/* Logo: siempre fijo, por encima del scroll del menú */}
        <Link
          href="/landing"
          className="relative z-20 flex shrink-0 items-center"
          aria-label="Inicio Maqjeez"
        >
          <span className="flex h-10 w-10 select-none items-center justify-center rounded-xl bg-gradient-to-br from-[#FDB71A] to-[#E09A00] text-lg font-black leading-none text-black shadow-sm ring-1 ring-black/10">
            M
          </span>
        </Link>

        {/* Escritorio: menú scrollable + relojes compactos (una sola fila, h-14) */}
        <div className="hidden min-h-0 min-w-0 flex-1 items-center sm:flex">
          <nav
            className="no-scrollbar flex min-w-0 flex-1 items-center justify-end gap-0.5 overflow-x-auto pr-1 lg:gap-1"
            aria-label="Principal"
          >
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
                  className={`relative flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 py-2 text-sm font-semibold transition-all sm:gap-2 sm:px-3
                    ${active
                      ? "text-white"
                      : "text-[#1E3A8A] hover:bg-[#E09A00]/40"}`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{label}</span>
                  {badge > 0 && (
                    <span className={`absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${badgeColor}`}>
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}

            {onOpenNotifications && (
              <button
                type="button"
                onClick={onOpenNotifications}
                className={`relative flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-2.5 py-2 text-sm font-semibold transition-colors sm:px-3
                  ${notificationCount > 0
                    ? "bg-green-200/40 text-green-800 hover:bg-green-200/60"
                    : "text-[#1E3A8A] hover:bg-[#E09A00]/40"}`}
              >
                <MessageCircle className="h-4 w-4 shrink-0" />
                <span className="hidden md:inline">WhatsApp</span>
                {notificationCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-green-600 px-1 text-[10px] font-bold text-white">
                    {notificationCount}
                  </span>
                )}
              </button>
            )}

            <Link
              href="/tareas"
              className={`relative flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-2.5 py-2 text-sm font-semibold transition-colors sm:px-3
                ${pathname === "/tareas"
                  ? "bg-[#1E3A8A]/90 text-white hover:bg-[#1E3A8A]"
                  : "text-[#1E3A8A] hover:bg-[#E09A00]/40"}`}
            >
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>Tareas</span>
              {tareasPendientes > 0 && (
                <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] animate-pulse items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                  {tareasPendientes}
                </span>
              )}
            </Link>

            <div className="flex shrink-0 items-center">
              <ThemeToggle />
            </div>

            <button
              type="button"
              onClick={() => setShowBugReport(true)}
              className="relative flex shrink-0 items-center gap-1.5 rounded-xl px-2 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100/40 sm:px-3"
              title="Reportar un error o bug"
            >
              <Bug className="h-4 w-4 shrink-0" />
              <span className="hidden lg:inline">Reportar Error</span>
            </button>
          </nav>

          {/* Relojes: fila única, no encoge (evita solapar el logo) */}
          <div className="ml-1 flex shrink-0 items-center gap-1.5 border-l border-[#E09A00]/40 pl-2 md:gap-2 md:pl-3">
            <div
              className="flex items-center gap-1.5 rounded-lg border border-[#1E3A8A]/25 bg-gradient-to-br from-white/95 to-white/90 px-2 py-1 shadow-sm md:px-2.5"
              title="Hora Argentina"
            >
              <Clock className="h-3.5 w-3.5 shrink-0 text-[#1E3A8A] md:h-4 md:w-4" />
              <span className="font-mono text-xs font-bold tracking-wide text-black md:text-sm">
                {currentTime || "--:--:--"}
              </span>
            </div>

            {config.flexAlarms.some(a => a.enabled) && flexAlarm && (
              <div
                className={`flex max-w-[9.5rem] items-center gap-1 rounded-lg border px-1.5 py-1 text-[10px] font-bold leading-tight md:max-w-none md:gap-1.5 md:px-2 md:text-xs ${
                  flexUrgent
                    ? "animate-pulse border-red-700 bg-red-600 text-white"
                    : "border-orange-400 bg-gradient-to-br from-orange-100 to-orange-50 text-black"
                }`}
                title="Próxima alarma Flex y cuenta regresiva"
              >
                <Timer className="h-3 w-3 shrink-0" />
                <span className={flexUrgent ? "text-white" : "text-orange-800"}>FLEX</span>
                <span className="font-mono font-bold">
                  {flexAlarm.time.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })}
                </span>
                <span className={`font-mono text-[9px] md:text-[10px] ${flexUrgent ? "text-white/90" : "opacity-90"}`}>
                  {formatCountdown(flexAlarm.diff)}
                </span>
              </div>
            )}

            {config.correoAlarms.some(a => a.enabled) && correoAlarm && (
              <div
                className={`flex max-w-[9.5rem] items-center gap-1 rounded-lg border px-1.5 py-1 text-[10px] font-bold leading-tight md:max-w-none md:gap-1.5 md:px-2 md:text-xs ${
                  correoUrgent
                    ? "animate-pulse border-red-700 bg-red-600 text-white"
                    : "border-blue-400 bg-gradient-to-br from-blue-100 to-blue-50 text-black"
                }`}
                title="Próxima alarma Correo y cuenta regresiva"
              >
                <Timer className="h-3 w-3 shrink-0" />
                <span className={`shrink-0 text-[9px] font-bold md:text-[10px] ${correoUrgent ? "text-white" : "text-blue-800"}`}>
                  CORREO
                </span>
                <span className="font-mono font-bold">
                  {correoAlarm.time.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })}
                </span>
                <span className={`font-mono text-[9px] md:text-[10px] ${correoUrgent ? "text-white/90" : "opacity-90"}`}>
                  {formatCountdown(correoAlarm.diff)}
                </span>
              </div>
            )}

            <Link
              href="/configuracion/alarmas"
              className="flex shrink-0 rounded-lg bg-[#1E3A8A]/10 p-1.5 transition-colors hover:bg-[#1E3A8A]/20 md:p-2"
              title="Configurar alarmas"
            >
              <Settings className="h-4 w-4 text-[#1E3A8A]" />
            </Link>
          </div>
        </div>

        {/* Mobile: iconos rápidos */}
        <div className="flex shrink-0 items-center gap-2 sm:hidden">
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
            <button
              onClick={() => setShowBugReport(true)}
              className="p-2 rounded-xl bg-red-100/40 text-red-700"
              title="Reportar error"
            >
              <Bug className="w-5 h-5" />
            </button>
            <ThemeToggle />
          </div>
      </div>

      {showBugReport && <BugReportModal onClose={() => setShowBugReport(false)} />}

      {overdueCount > 0 && (
        <div className="border-t border-red-500/40 bg-red-700/20 px-4 py-2 sm:px-5 lg:px-6">
          <div className="mx-auto flex max-w-5xl items-center gap-2 text-sm font-semibold text-red-900">
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
