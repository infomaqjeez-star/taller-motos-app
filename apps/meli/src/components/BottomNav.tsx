"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, Tag, MessageCircle, RotateCcw, Truck } from "lucide-react";
import { getPendientes } from "@/lib/pendientes";

export default function BottomNav() {
  const pathname = usePathname();
  const [pendientes, setPendientes] = useState(0);

  useEffect(() => {
    const refresh = () => setPendientes(getPendientes().length);
    refresh();
    // Refrescar cada 30 seg por si expiran
    const id = setInterval(refresh, 30_000);
    // Refrescar también cuando la ventana recupera el foco
    window.addEventListener("focus", refresh);
    return () => { clearInterval(id); window.removeEventListener("focus", refresh); };
  }, []);

  const tabs = [
    { href: "/",           label: "Inicio",    icon: Home },
    { href: "/etiquetas",  label: "Etiquetas", icon: Tag },
    { href: "/mensajes",   label: "Mensajes",  icon: MessageCircle },
    { href: "/post-venta", label: "Post-Venta",icon: RotateCcw },
    { href: "/flex",       label: "Flex",      icon: Truck },
  ];

  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-40 border-t"
      style={{
        background: "rgba(18,18,18,0.96)",
        borderColor: "rgba(255,255,255,0.08)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        boxShadow: "0 -4px 30px rgba(0,0,0,0.60)",
      }}
    >
      <div className="flex items-stretch" style={{ height: "64px", paddingBottom: "env(safe-area-inset-bottom)" }}>
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href === "/flex" && pathname === "/pendientes");
          const isFlex = href === "/flex";
          return (
            <Link
              key={href}
              href={isFlex && pendientes > 0 ? "/pendientes" : href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-colors"
            >
              {/* Icono con badge de conteo */}
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-all ${active ? "stroke-[2.5]" : ""}`}
                  style={
                    active
                      ? { color: "#FACC15", filter: "drop-shadow(0 0 6px rgba(250,204,21,0.70))" }
                      : { color: "#6B7280" }
                  }
                />
                {isFlex && pendientes > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-black rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 leading-none">
                    {pendientes}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                className="text-[10px] font-semibold"
                style={active ? { color: "#FACC15" } : { color: "#6B7280" }}
              >
                {label}
              </span>

              {/* Texto "pendientes" debajo del label Flex */}
              {isFlex && pendientes > 0 && (
                <span className="text-[8px] font-bold text-red-400 leading-none -mt-0.5">
                  {pendientes} pend.
                </span>
              )}

              {active && (
                <span
                  className="absolute bottom-0 w-10 h-[3px] rounded-full"
                  style={{ background: "#FACC15", boxShadow: "0 0 8px rgba(250,204,21,0.80)" }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
