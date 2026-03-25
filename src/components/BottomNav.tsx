"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, BarChart2, Users, Truck } from "lucide-react";

interface Props {
  notificationCount?: number;
  onOpenNotifications?: () => void;
}

export default function BottomNav({ notificationCount = 0, onOpenNotifications }: Props) {
  const pathname = usePathname();

  const tabs = [
    { href: "/", label: "Órdenes", icon: LayoutDashboard },
    { href: "/inventario", label: "Inventario", icon: Package },
    { href: "/estadisticas", label: "Stats", icon: BarChart2 },
    { href: "/agenda", label: "Agenda", icon: Users },
    { href: "/flex", label: "Flex", icon: Truck },
  ];

  return (
    <nav className="sm:hidden fixed top-0 left-0 right-0 z-40 bg-gray-900/95 backdrop-blur-md border-b border-gray-700/80 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
      <div className="flex items-stretch" style={{ height: "56px", paddingTop: "env(safe-area-inset-top)" }}>
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors
                ${active ? "text-orange-400" : "text-gray-500 active:text-gray-300"}`}
            >
              <Icon className={`w-5 h-5 ${active ? "stroke-[2.5]" : ""}`} />
              <span className={`text-[10px] font-semibold ${active ? "text-orange-400" : "text-gray-500"}`}>
                {label}
              </span>
              {active && (
                <span className="absolute top-0 w-8 h-0.5 bg-orange-400 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
