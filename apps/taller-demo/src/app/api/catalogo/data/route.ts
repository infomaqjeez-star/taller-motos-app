import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { normalizarDocumento, textoMaqjeez, type CatalogoDocumento, type CatalogoProducto } from "@/lib/catalogoMaqjeez";

/** Solo campos seguros para compartir el catálogo en público (sin datos internos). */
function sanitizePublic(doc: CatalogoDocumento) {
  return {
    titulo: textoMaqjeez(doc.titulo ?? ""),
    subtitulo: textoMaqjeez(doc.subtitulo ?? ""),
    categorias: doc.categorias.map((c) => ({
      id: String(c.id).slice(0, 80),
      nombre: textoMaqjeez(String(c.nombre).slice(0, 200)),
      ...(typeof c.orden === "number" ? { orden: c.orden } : {}),
    })),
    productos: doc.productos.map((p: CatalogoProducto) => {
      const row: Record<string, string | number> = {
        sku: String(p.sku).slice(0, 120),
        nombre: textoMaqjeez(String(p.nombre).slice(0, 400)),
        precio: typeof p.precio === "number" && Number.isFinite(p.precio) ? Math.max(0, Math.round(p.precio)) : 0,
        categoriaId: String(p.categoriaId).slice(0, 80),
      };
      if (p.imagen && typeof p.imagen === "string") {
        const img = p.imagen.trim().slice(0, 320);
        /* Ruta relativa bajo /catalogo (puede incluir subcarpetas; sin .. ni caracteres raros) */
        if (/^[A-Za-z0-9_/.\-]+$/.test(img) && !img.includes("..")) row.imagen = img;
      }
      return row;
    }),
  };
}

export async function GET() {
  const filePath = join(process.cwd(), "data", "catalogo-public.json");
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    const doc = normalizarDocumento(parsed);
    return NextResponse.json(sanitizePublic(doc), {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch {
    return NextResponse.json(
      {
        titulo: "Catálogo Maqjeez",
        subtitulo: "Catálogo en preparación.",
        categorias: [],
        productos: [],
      },
      { status: 200 }
    );
  }
}
