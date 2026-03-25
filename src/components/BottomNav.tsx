"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, BarChart2, Users, MessageCircle } from "lucide-react";

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
  ];

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-gray-900 border-t border-gray-700 safe-bottom">
      <div className="flex items-stretch h-16">
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
                <span className="absolute bottom-0 w-8 h-0.5 bg-orange-400 rounded-full" />
              )}
            </Link>
          );
        })}

        {/* WhatsApp / Notificaciones */}
        {onOpenNotifications ? (
          <button
            onClick={onOpenNotifications}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 relative text-gray-500 active:text-green-400"
          >
            <div className="relative">
              <MessageCircle className="w-5 h-5" />
              {notificationCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-green-500 text-white text-[9px]
                  font-black rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
                  {notificationCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-semibold">WA</span>
          </button>
        ) : (
          <Link
            href="/"
            className="flex-1 flex flex-col items-center justify-center gap-0.5 text-gray-500"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-[10px] font-semibold">WA</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
