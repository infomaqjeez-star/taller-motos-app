"use client";

import { useState } from "react";
import Image from "next/image";
import { Package } from "lucide-react";
import type { CatalogoProducto } from "@/lib/catalogoMaqjeez";
import { rutasImagenProducto } from "@/lib/catalogoMaqjeez";

export default function CatalogoProductImage({
  producto,
  className = "",
}: {
  producto: CatalogoProducto;
  className?: string;
}) {
  const candidates = rutasImagenProducto(producto);
  const [index, setIndex] = useState(0);

  if (index >= candidates.length) {
    return (
      <div
        className={`flex aspect-square w-full max-w-[450px] flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-black/35 p-4 text-center ${className}`}
      >
        <Package className="mb-2 h-12 w-12 text-gray-600" aria-hidden />
        <span className="break-all font-mono text-xs text-gray-500">{producto.sku}</span>
        <span className="mt-1 text-[10px] text-gray-600">
          Imagen en <span className="font-mono text-gray-400">public/catalogo/</span> (SKU plano o carpeta bajo{" "}
          <span className="font-mono text-gray-500">Catalogo-Abril-2026-Maqjeez-Repuestos/productos/</span>).
        </span>
      </div>
    );
  }

  return (
    <div
      className={`relative mx-auto aspect-square w-full max-w-[450px] overflow-hidden rounded-xl border border-white/10 bg-black/25 ${className}`}
    >
      <Image
        src={candidates[index]}
        alt={producto.nombre}
        width={450}
        height={450}
        className="h-full w-full object-contain"
        sizes="(max-width: 768px) 100vw, 33vw"
        onError={() => setIndex((n) => n + 1)}
        unoptimized
      />
    </div>
  );
}
