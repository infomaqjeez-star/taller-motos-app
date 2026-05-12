"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef, useLayoutEffect } from "react";
import {
  Package, LayoutDashboard, AlertTriangle,
  MessageCircle, BarChart2, Users, ShoppingCart,
  Clock, Timer, Settings, CheckCircle, Bug, BookOpen, Mail,
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
  const headerRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const apply = () => {
      document.documentElement.style.setProperty(
        "--maqjeez-header-height",
        `${Math.ceil(el.getBoundingClientRect().height)}px`
      );
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty("--maqjeez-header-height");
    };
  }, [overdueCount]);

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
    const interval = setInterval(loadTareasCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const links = [
    { href: "/taller",       label: "Taller",       icon: LayoutDashboard, badge: overdueCount,  badgeColor: "bg-red-500" },
    { href: "/ventas",       label: "Vender",       icon: ShoppingCart,    badge: 0,             badgeColor: "" },
    { href: "/catalogo",   label: "Catálogo",     icon: BookOpen,        badge: 0,             badgeColor: "" },
    { href: "/estadisticas", label: "Estadísticas", icon: BarChart2,       badge: 0,             badgeColor: "" },
    { href: "/agenda",       label: "Agenda",       icon: Users,           badge: 0,             badgeColor: "" },
    { href: "/inventario",   label: "Pedidos",     icon: Package,         badge: lowStockCount, badgeColor: "bg-yellow-500" },
    { href: "/correo",       label: "Correo",       icon: Mail,            badge: 0,             badgeColor: "" },
  ];

  const flexUrgent = flexAlarm && flexAlarm.diff < 1800000;
  const correoUrgent = correoAlarm && correoAlarm.diff < 1800000;

  const linkClass = (active: boolean) =>
    `relative flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-xs font-semibold transition-all sm:text-sm sm:gap-2 sm:px-3 ${
      active ? "bg-brand-panel text-white rounded-t-xl border-t border-x border-white/5 shadow-[0_-5px_15px_rgba(0,0,0,0.15)]" : "text-black/70 hover:text-black hover:bg-black/5"
    }`;

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-50 bg-brand-yellow shadow-sm"
    >
      <div className="mx-auto max-w-[96rem] px-3 sm:px-4 lg:px-8">
        <div className="flex min-h-[3.25rem] items-center justify-between gap-2 py-2">
          <Link
            href="/landing"
            className="relative z-20 flex shrink-0 items-center gap-3 group"
            aria-label="Inicio Maqjeez"
          >
            <div className="relative flex items-center justify-center w-10 h-10 bg-black rounded-lg shadow-[inset_0_-2px_6px_rgba(255,255,255,0.2)] group-hover:-translate-y-0.5 transition-transform">
              <span className="text-brand-yellow text-lg font-black">M</span>
            </div>
            <div className="hidden sm:flex flex-col justify-center">
              <span className="font-black text-[18px] leading-none tracking-tight text-black uppercase">Maqjeez</span>
              <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-black/60 leading-none mt-0.5">Premium POS</span>
            </div>
          </Link>

          <nav
            className="hidden min-w-0 flex-1 flex-wrap items-center justify-center gap-x-0.5 gap-y-1 sm:flex sm:gap-x-1 lg:gap-x-1.5"
            aria-label="Principal"
          >
            {links.map(({ href, label, icon: Icon, badge, badgeColor }) => {
              const active = pathname === href || (href !== "/" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={linkClass(active)}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${active ? "text-brand-yellow" : ""}`} />
                  <span>{label}</span>
                  {badge > 0 && (
                    <span
                      className={`absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${badgeColor}`}
                    >
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
                className={`relative flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-2.5 py-2 text-xs font-semibold transition-colors sm:px-3 sm:text-sm ${
                  notificationCount > 0
                    ? "bg-green-200/40 text-green-800 hover:bg-green-200/60"
                    : "text-black/70 hover:text-black hover:bg-black/5"
                }`}
              >
                <MessageCircle className="h-4 w-4 shrink-0" />
                <span>WhatsApp</span>
                {notificationCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-green-600 px-1 text-[10px] font-bold text-white">
                    {notificationCount}
                  </span>
                )}
              </button>
            )}

            <Link
              href="/tareas"
              className={`relative flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-2.5 py-2 text-xs font-semibold transition-colors sm:px-3 sm:text-sm ${
                pathname === "/tareas"
                  ? "bg-brand-panel text-white hover:bg-brand-panel"
                  : "text-black/70 hover:text-black hover:bg-black/5"
              }`}
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
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:hidden">
            {onOpenNotifications && notificationCount > 0 && (
              <button
                type="button"
                onClick={onOpenNotifications}
                className="relative rounded-xl bg-green-200/40 p-2 text-green-800"
              >
                <MessageCircle className="h-5 w-5" />
                <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-green-600 px-0.5 text-[9px] font-black text-white">
                  {notificationCount}
                </span>
              </button>
            )}
            <ThemeToggle />
          </div>
        </div>

        {/* ── Fila 2: relojes y contadores (toda la barra inferior del header) ── */}
        <div className="no-scrollbar flex flex-nowrap items-center justify-center gap-2 overflow-x-auto border-t border-brand-yellowDark/45 bg-brand-yellowDark/20 px-1 py-2 sm:flex-wrap sm:px-2">
          <div
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-brand-navy/25 bg-gradient-to-br from-white/95 to-white/90 px-2.5 py-1.5 shadow-sm"
            title="Hora Argentina"
          >
            <Clock className="h-4 w-4 shrink-0 text-[#1E3A8A]" />
            <span className="font-mono text-sm font-bold tracking-wide text-black">
              {currentTime || "--:--:--"}
            </span>
          </div>

          {config.flexAlarms.some((a) => a.enabled) && flexAlarm && (
            <div
              className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold ${
                flexUrgent
                  ? "animate-pulse border-red-700 bg-red-600 text-white"
                  : "border-orange-400 bg-gradient-to-br from-orange-100 to-orange-50 text-black"
              }`}
              title="Próxima alarma Flex"
            >
              <Timer className="h-4 w-4 shrink-0" />
              <span className={flexUrgent ? "text-white" : "text-orange-800"}>FLEX</span>
              <span className="font-mono font-bold">
                {flexAlarm.time.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })}
              </span>
              <span className={`font-mono text-[11px] ${flexUrgent ? "text-white/90" : "opacity-90"}`}>
                {formatCountdown(flexAlarm.diff)}
              </span>
            </div>
          )}

          {config.correoAlarms.some((a) => a.enabled) && correoAlarm && (
            <div
              className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold ${
                correoUrgent
                  ? "animate-pulse border-red-700 bg-red-600 text-white"
                  : "border-blue-400 bg-gradient-to-br from-blue-100 to-blue-50 text-black"
              }`}
              title="Próxima alarma Correo"
            >
              <Timer className="h-4 w-4 shrink-0" />
              <span className={`shrink-0 ${correoUrgent ? "text-white" : "text-blue-800"}`}>CORREO</span>
              <span className="font-mono font-bold">
                {correoAlarm.time.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })}
              </span>
              <span className={`font-mono text-[11px] ${correoUrgent ? "text-white/90" : "opacity-90"}`}>
                {formatCountdown(correoAlarm.diff)}
              </span>
            </div>
          )}

          <Link
            href="/configuracion/alarmas"
            className="flex shrink-0 rounded-lg bg-brand-navy/15 p-2 transition-colors hover:bg-brand-navy/25"
            title="Configurar alarmas"
          >
            <Settings className="h-4 w-4 text-brand-navy" />
          </Link>

          <button
            type="button"
            onClick={() => setShowBugReport(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-red-600/40 bg-red-50/90 px-2.5 py-1.5 text-xs font-bold text-red-800 shadow-sm transition-colors hover:bg-red-100 sm:px-3 sm:text-sm"
            title="Reportar un error o bug"
          >
            <Bug className="h-4 w-4 shrink-0" />
            <span>Reportar error</span>
          </button>
        </div>
      </div>

      {showBugReport && <BugReportModal onClose={() => setShowBugReport(false)} />}

      {overdueCount > 0 && (
        <div className="border-t border-red-500/40 bg-red-700/20 px-3 py-2 sm:px-4 lg:px-8">
          <div className="mx-auto flex max-w-[96rem] items-center gap-2 text-sm font-semibold text-red-900">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              {overdueCount} equipo{overdueCount > 1 ? "s" : ""} con más de 90 días esperando retiro
            </span>
          </div>
        </div>
      )}
    </header>
  );
}
