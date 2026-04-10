export const SYNC_ERROR_MAP: Record<string, { label: string; suggestion: string }> = {
  category_not_allowed: {
    label: "Categoría no permitida",
    suggestion: "La cuenta destino no puede vender en esta categoría. Verificá permisos de marca.",
  },
  missing_attributes: {
    label: "Ficha técnica incompleta",
    suggestion: "Agregá EAN, marca o modelo en la publicación original antes de re-sincronizar.",
  },
  title_already_exists: {
    label: "Título duplicado",
    suggestion: "Ya existe una publicación con el mismo título en la cuenta destino.",
  },
  invalid_images: {
    label: "Imágenes de baja calidad",
    suggestion: "Las fotos deben ser mínimo 1200×1200px, sin logos ni bordes blancos.",
  },
  variation_error: {
    label: "Error en variaciones",
    suggestion: "Revisá que talles/colores de las variaciones estén completos en el original.",
  },
  item_not_found: {
    label: "Publicación no encontrada",
    suggestion: "La publicación puede haber sido eliminada. Verificá su estado en MeLi.",
  },
  invalid_category: {
    label: "Categoría inválida",
    suggestion: "La categoría no existe o fue migrada. Re-categorizá el producto en MeLi.",
  },
  unknown: {
    label: "Error desconocido",
    suggestion: "Revisá los detalles en el log de errores para más información.",
  },
};

export function humanizeError(code: string): { label: string; suggestion: string } {
  return SYNC_ERROR_MAP[code] ?? SYNC_ERROR_MAP.unknown;
}

export function extractErrorCode(reason: string): string {
  if (!reason) return "unknown";
  const lower = reason.toLowerCase();
  const codes = Object.keys(SYNC_ERROR_MAP).filter(k => k !== "unknown");
  for (const code of codes) {
    if (lower.includes(code.replace(/_/g, " ")) || lower.includes(code)) return code;
  }
  // Try common MeLi patterns
  if (lower.includes("categor")) return "invalid_category";
  if (lower.includes("attrib") || lower.includes("ficha")) return "missing_attributes";
  if (lower.includes("title") || lower.includes("titulo")) return "title_already_exists";
  if (lower.includes("image") || lower.includes("foto")) return "invalid_images";
  if (lower.includes("variation")) return "variation_error";
  return "unknown";
}
