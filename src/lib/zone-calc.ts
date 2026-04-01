/**
 * Zonas Flex basadas en localidad/ciudad del destinatario.
 * Clasificacion segun configuracion real de MeLi Flex del vendedor.
 */

// Localidades normalizadas a lowercase para matching
const ZONA_CERCANA: string[] = [
  "ezeiza",
];

const ZONA_MEDIA: string[] = [
  "esteban echeverria",
  "esteban echeverría",
  "la matanza sur",
  "monte grande",       // suele aparecer como parte de Esteban Echeverria
  "canning",            // suele aparecer como parte de Esteban Echeverria
  "luis guillon",
  "luis guillón",
];

const ZONA_LEJANA: string[] = [
  // Lejanas explicitas (config MeLi)
  "berisso",
  "campana",
  "cañuelas",
  "canuelas",
  "del viso",
  "derqui",
  "ensenada",
  "escobar",
  "general rodriguez",
  "general rodríguez",
  "guernica",
  "ingeniero maschwitz",
  "la plata",
  "la plata centro",
  "la plata norte",
  "la plata oeste",
  "lujan",
  "luján",
  "marcos paz",
  "nordelta",
  "pilar",
  "san vicente",
  "villa rosa",
  "zarate",
  "zárate",
  "garin",
  "garín",
  // GBA amplio
  "almirante brown",
  "avellaneda",
  "berazategui",
  "caba",
  "capital federal",
  "ciudad autonoma de buenos aires",
  "ciudad autónoma de buenos aires",
  "buenos aires",
  "florencio varela",
  "hurlingham",
  "ituzaingo",
  "ituzaingó",
  "jose c paz",
  "josé c paz",
  "jose c. paz",
  "josé c. paz",
  "la matanza",
  "la matanza norte",
  "lanus",
  "lanús",
  "lomas de zamora",
  "malvinas argentinas",
  "merlo",
  "moreno",
  "moron",
  "morón",
  "quilmes",
  "san fernando",
  "san isidro",
  "san martin",
  "san martín",
  "san miguel",
  "tigre",
  "tres de febrero",
  "vicente lopez",
  "vicente lópez",
];

/**
 * Normaliza texto para comparacion: lowercase, sin acentos
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Clasifica zona Flex por nombre de ciudad/localidad.
 * Busca coincidencia parcial para cubrir variaciones de nombre.
 */
export function classifyFlexZone(city: string | null | undefined): string {
  if (!city) return "desconocida";

  const normalized = normalize(city);

  // Buscar en cercana primero (mas especifica)
  for (const z of ZONA_CERCANA) {
    if (normalized.includes(normalize(z)) || normalize(z).includes(normalized)) {
      return "cercana";
    }
  }

  // Buscar en media
  for (const z of ZONA_MEDIA) {
    if (normalized.includes(normalize(z)) || normalize(z).includes(normalized)) {
      return "media";
    }
  }

  // Buscar en lejana
  for (const z of ZONA_LEJANA) {
    if (normalized.includes(normalize(z)) || normalize(z).includes(normalized)) {
      return "lejana";
    }
  }

  // Si no matchea ninguna lista, es desconocida
  return "desconocida";
}

/**
 * @deprecated Usar classifyFlexZone() con city name
 * Mantener para compatibilidad con codigo existente
 */
export function calculateZoneDistance(deliveryDate: string | null | undefined): string {
  if (!deliveryDate) return "desconocida";
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const delivery = new Date(deliveryDate);
    delivery.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((delivery.getTime() - today.getTime()) / 86400000);
    if (diffDays <= 2 && diffDays >= 0) return "cercana";
    if (diffDays >= 3 && diffDays <= 7) return "media";
    if (diffDays > 7) return "larga";
    return "desconocida";
  } catch {
    return "desconocida";
  }
}

export const ZONE_CFG: Record<string, { color: string; label: string; bgColor: string }> = {
  cercana: {
    color: "#22C55E",
    label: "CERCANA",
    bgColor: "#22C55E20",
  },
  media: {
    color: "#FFB703",
    label: "MEDIA",
    bgColor: "#FFB70320",
  },
  lejana: {
    color: "#EF4444",
    label: "LEJANA",
    bgColor: "#EF444420",
  },
  larga: {
    color: "#6B7280",
    label: "LARGA",
    bgColor: "#6B728020",
  },
  desconocida: {
    color: "#9CA3AF",
    label: "SIN ZONA",
    bgColor: "#9CA3AF20",
  },
};
