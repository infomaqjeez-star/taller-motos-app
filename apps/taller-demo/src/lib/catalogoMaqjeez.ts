/**
 * Catálogo de precios Maqjeez (reemplaza branding Konecta).
 * Datos: public/catalogo/catalogo.json
 * Imágenes: public/catalogo/{sku}.webp|jpg|png (recomendado 480×480; el SKU define el archivo).
 */

export interface CatalogoCategoria {
  id: string;
  nombre: string;
  orden?: number;
}

export interface CatalogoProducto {
  sku: string;
  nombre: string;
  precio: number;
  categoriaId: string;
  /** Nombre de archivo dentro de /catalogo/ (ej: "ABC-12.webp"). Si falta, se prueba por SKU. */
  imagen?: string;
}

export interface CatalogoDocumento {
  titulo?: string;
  subtitulo?: string;
  categorias: CatalogoCategoria[];
  productos: CatalogoProducto[];
}

const EXTENSIONES = [".webp", ".jpg", ".jpeg", ".png"] as const;

/** SKU seguro para URL/path (sin barras ni caracteres raros en nombre de archivo) */
export function skuToFilenameBase(sku: string): string {
  return sku.trim().replace(/[/\\:*?"<>|]/g, "-").replace(/\s+/g, "_");
}

/** Rutas candidatas para la imagen de un producto */
export function rutasImagenProducto(p: CatalogoProducto): string[] {
  const base = "/catalogo";
  if (p.imagen?.trim()) {
    const n = p.imagen.trim().replace(/^\.+/, "");
    return [`${base}/${encodeURIComponent(n)}`];
  }
  const slug = skuToFilenameBase(p.sku);
  return EXTENSIONES.map((ext) => `${base}/${encodeURIComponent(slug + ext)}`);
}

export function ordenarCategorias(cats: CatalogoCategoria[]): CatalogoCategoria[] {
  return [...cats].sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999) || a.nombre.localeCompare(b.nombre));
}

export function normalizarDocumento(raw: unknown): CatalogoDocumento {
  const o = raw as Record<string, unknown>;
  const titulo = typeof o.titulo === "string" ? o.titulo : "Catálogo de precios";
  const subtitulo =
    typeof o.subtitulo === "string"
      ? o.subtitulo
      : "Maqjeez Repuestos — lista consultiva para el taller";
  const categorias = Array.isArray(o.categorias)
    ? (o.categorias as CatalogoCategoria[]).filter((c) => c?.id && c?.nombre)
    : [];
  const productos = Array.isArray(o.productos)
    ? (o.productos as CatalogoProducto[]).filter((p) => p?.sku && p?.nombre && p?.categoriaId)
    : [];
  return { titulo, subtitulo, categorias, productos };
}

export async function fetchCatalogoJson(): Promise<CatalogoDocumento> {
  const res = await fetch("/catalogo/catalogo.json", { cache: "no-store" });
  if (!res.ok) {
    return {
      titulo: "Catálogo Maqjeez",
      subtitulo: "Creá public/catalogo/catalogo.json con categorías y productos.",
      categorias: [],
      productos: [],
    };
  }
  const json = await res.json();
  return normalizarDocumento(json);
}
