"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Tag, MessageCircle, RotateCcw, Truck } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: "/",             label: "Inicio",     icon: Home },
    { href: "/etiquetas",    label: "Etiquetas",  icon: Tag },
    { href: "/mensajes",     label: "Mensajes",   icon: MessageCircle },
    { href: "/post-venta",   label: "Post-Venta", icon: RotateCcw },
    { href: "/flex",         label: "Flex",       icon: Truck },
  ];

  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{ background: "#1C1C1C", borderColor: "rgba(255,255,255,0.08)" }}
    >
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-yellow-400 font-black text-lg tracking-tight">MeLi</span>
            <span className="text-white font-semibold text-sm opacity-60">Dashboard</span>
          </Link>

          <nav className="hidden sm:flex items-center gap-1">
            {links.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                    active
                      ? "bg-yellow-400/15 text-yellow-300 border border-yellow-400/30"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
