"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Wrench,
  Package,
  LayoutDashboard,
  AlertTriangle,
  MessageCircle,
  BarChart2,
  Users,
  Truck,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

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

  const links = [
    { href: "/",             label: "Dashboard",     icon: LayoutDashboard, badge: overdueCount,  badgeColor: "bg-red-500" },
    { href: "/inventario",   label: "Inventario",    icon: Package,         badge: lowStockCount, badgeColor: "bg-yellow-500" },
    { href: "/estadisticas", label: "Estadísticas",  icon: BarChart2,       badge: 0,             badgeColor: "" },
    { href: "/agenda",       label: "Agenda",        icon: Users,           badge: 0,             badgeColor: "" },
    { href: "/flex",         label: "Flex",          icon: Truck,           badge: 0,             badgeColor: "" },
  ];

  return (
    <header className="bg-gray-900 border-b border-gray-700 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">

          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="bg-orange-500 rounded-xl p-1.5">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-orange-400 text-xl tracking-tight">MAQJEEZ</span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-1">
            {links.map(({ href, label, icon: Icon, badge, badgeColor }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative flex items-center gap-2 px-3 py-2 rounded-xl font-semibold text-sm transition-colors
                    ${active
                      ? "bg-orange-500 text-white shadow-lg shadow-orange-500/25"
                      : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"}`}
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
                    ? "bg-green-700/30 text-green-400 hover:bg-green-700/50"
                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"}`}
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[10px]
                    font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {notificationCount}
                  </span>
                )}
              </button>
            )}

            <ThemeToggle />
          </nav>

          {/* Mobile: solo iconos de acción rápida */}
          <div className="sm:hidden flex items-center gap-2">
            {onOpenNotifications && notificationCount > 0 && (
              <button
                onClick={onOpenNotifications}
                className="relative p-2 rounded-xl bg-green-700/30 text-green-400"
              >
                <MessageCircle className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[9px]
                  font-black rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
                  {notificationCount}
                </span>
              </button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Alerta barra roja */}
      {overdueCount > 0 && (
        <div className="bg-red-600/20 border-t border-red-600/40 px-4 py-2">
          <div className="max-w-5xl mx-auto flex items-center gap-2 text-red-400 text-sm font-semibold">
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
