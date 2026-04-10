export const SYNC_ERROR_MAP: Record<string, { label: string; suggestion: string }> = {
  category_not_allowed: {
    label: "CategorÃ­a no permitida",
    suggestion: "La cuenta destino no puede vender en esta categorÃ­a. VerificÃ¡ permisos de marca.",
  },
  missing_attributes: {
    label: "Ficha tÃ©cnica incompleta",
    suggestion: "AgregÃ¡ EAN, marca o modelo en la publicaciÃ³n original antes de re-sincronizar.",
  },
  title_already_exists: {
    label: "TÃ­tulo duplicado",
    suggestion: "Ya existe una publicaciÃ³n con el mismo tÃ­tulo en la cuenta destino.",
  },
  invalid_images: {
    label: "ImÃ¡genes de baja calidad",
    suggestion: "Las fotos deben ser mÃ­nimo 1200Ã—1200px, sin logos ni bordes blancos.",
  },
  variation_error: {
    label: "Error en variaciones",
    suggestion: "RevisÃ¡ que talles/colores de las variaciones estÃ©n completos en el original.",
  },
  item_not_found: {
    label: "PublicaciÃ³n no encontrada",
    suggestion: "La publicaciÃ³n puede haber sido eliminada. VerificÃ¡ su estado en MeLi.",
  },
  invalid_category: {
    label: "CategorÃ­a invÃ¡lida",
    suggestion: "La categorÃ­a no existe o fue migrada. Re-categorizÃ¡ el producto en MeLi.",
  },
  unknown: {
    label: "Error desconocido",
    suggestion: "RevisÃ¡ los detalles en el log de errores para mÃ¡s informaciÃ³n.",
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
