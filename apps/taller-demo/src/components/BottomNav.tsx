"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  BarChart2,
  Users,
  Truck,
  ShoppingCart,
  CheckCircle,
  BookOpen,
  Mail,
} from "lucide-react";

interface Props {
  notificationCount?: number;
  onOpenNotifications?: () => void;
}

const ACCENT = "#FFC107";
const ACCENT_GLOW = "rgba(255, 193, 7, 0.45)";

export default function BottomNav(_props: Props) {
  const pathname = usePathname();

  const tabs = [
    { href: "/taller", label: "Taller", icon: LayoutDashboard },
    { href: "/inventario", label: "Stock", icon: Package },
    { href: "/catalogo", label: "Catálogo", icon: BookOpen },
    { href: "/ventas", label: "Vender", icon: ShoppingCart },
    { href: "/tareas", label: "Tareas", icon: CheckCircle },
    { href: "/flex", label: "Flex", icon: Truck },
    { href: "/estadisticas", label: "Stats", icon: BarChart2 },
    { href: "/agenda", label: "Agenda", icon: Users },
    { href: "/correo", label: "Correo", icon: Mail },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[rgba(18,18,18,0.97)] backdrop-blur-xl [html.light_&]:border-gray-200 [html.light_&]:bg-[rgba(255,255,255,0.98)] sm:hidden"
      style={{
        WebkitBackdropFilter: "blur(16px)",
        boxShadow: "0 -6px 28px rgba(0,0,0,0.55)",
        paddingBottom: "max(0.25rem, env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div
        className="no-scrollbar flex snap-x snap-mandatory justify-start gap-0.5 overflow-x-auto px-2 pt-1"
        style={{ minHeight: "3.65rem", WebkitOverflowScrolling: "touch" }}
      >
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="relative flex min-w-[3.35rem] max-w-[4.25rem] flex-1 snap-center flex-col items-center justify-center gap-0.5 py-1.5 transition-transform active:scale-[0.96] sm:min-w-0 sm:max-w-none sm:flex-1"
            >
              <Icon
                className="h-[18px] w-[18px] shrink-0"
                strokeWidth={active ? 2.5 : 2}
                style={
                  active
                    ? {
                        color: ACCENT,
                        filter: `drop-shadow(0 0 5px ${ACCENT_GLOW})`,
                      }
                    : { color: "#9CA3AF" }
                }
              />
              <span
                className="w-full truncate px-0.5 text-center text-[9px] font-bold leading-none tracking-tight"
                style={{ color: active ? ACCENT : "#9CA3AF" }}
              >
                {label}
              </span>
              {active && (
                <span
                  className="absolute bottom-0.5 left-1/2 h-[3px] w-7 -translate-x-1/2 rounded-full"
                  style={{
                    background: ACCENT,
                    boxShadow: `0 0 8px ${ACCENT_GLOW}`,
                  }}
                  aria-hidden
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
