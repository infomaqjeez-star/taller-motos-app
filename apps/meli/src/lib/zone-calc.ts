/**
 * Zonas Flex basadas en localidad/ciudad/CP del destinatario.
 * Clasificacion segun configuracion real de MeLi Flex del vendedor.
 * Fallback por codigo postal cuando el nombre de ciudad no matchea.
 */

// Localidades normalizadas a lowercase para matching
const ZONA_CERCANA: string[] = [
  "ezeiza",
];

const ZONA_MEDIA: string[] = [
  "esteban echeverria",
  "esteban echeverrÃ­a",
  "la matanza sur",
  "monte grande",       // suele aparecer como parte de Esteban Echeverria
  "canning",            // suele aparecer como parte de Esteban Echeverria
  "luis guillon",
  "luis guillÃ³n",
];

const ZONA_LEJANA: string[] = [
  // Lejanas explicitas (config MeLi)
  "berisso",
  "campana",
  "caÃ±uelas",
  "canuelas",
  "del viso",
  "derqui",
  "ensenada",
  "escobar",
  "general rodriguez",
  "general rodrÃ­guez",
  "guernica",
  "ingeniero maschwitz",
  "la plata",
  "la plata centro",
  "la plata norte",
  "la plata oeste",
  "lujan",
  "lujÃ¡n",
  "marcos paz",
  "nordelta",
  "pilar",
  "san vicente",
  "villa rosa",
  "zarate",
  "zÃ¡rate",
  "garin",
  "garÃ­n",
  // GBA amplio
  "almirante brown",
  "avellaneda",
  "berazategui",
  "caba",
  "capital federal",
  "ciudad autonoma de buenos aires",
  "ciudad autÃ³noma de buenos aires",
  "buenos aires",
  "florencio varela",
  "hurlingham",
  "ituzaingo",
  "ituzaingÃ³",
  "jose c paz",
  "josÃ© c paz",
  "jose c. paz",
  "josÃ© c. paz",
  "la matanza",
  "la matanza norte",
  "lanus",
  "lanÃºs",
  "lomas de zamora",
  "malvinas argentinas",
  "merlo",
  "moreno",
  "moron",
  "morÃ³n",
  "quilmes",
  "san fernando",
  "san isidro",
  "san martin",
  "san martÃ­n",
  "san miguel",
  "tigre",
  "tres de febrero",
  "vicente lopez",
  "vicente lÃ³pez",
];

// Clasificacion por CP (codigo postal numerico)
// Rangos de CP para cada zona cuando el nombre de ciudad no matchea
// Fuente: MeLi Flex zones + CP de Argentina
const CP_CERCANA: Array<[number, number]> = [
  [1802, 1804],   // Ezeiza, TristÃ¡n SuÃ¡rez
];

const CP_MEDIA: Array<[number, number]> = [
  [1838, 1838],   // Luis GuillÃ³n
  [1842, 1842],   // Monte Grande
  [1806, 1806],   // Canning (parte de Esteban Echeverria)
  [1841, 1841],   // Esteban Echeverria
  [1839, 1839],   // Luis GuillÃ³n
];

const CP_LEJANA: Array<[number, number]> = [
  [1000, 1499],   // CABA (todos los barrios)
  [1600, 1609],   // Olivos, Florida, MartÃ­nez, San Isidro
  [1610, 1619],   // Boulogne, BÃ©ccar, Victoria, San Fernando
  [1620, 1629],   // Tigre, Don Torcuato, Pacheco
  [1630, 1639],   // San MartÃ­n, Caseros, Santos Lugares
  [1640, 1649],   // Hurlingham, MorÃ³n, Castelar
  [1650, 1659],   // San Justo, La Matanza
  [1660, 1669],   // Merlo, Moreno
  [1670, 1679],   // Merlo
  [1680, 1689],   // Moreno
  [1700, 1709],   // Ramos MejÃ­a, La Matanza
  [1710, 1719],   // LanÃºs, Remedios de Escalada
  [1720, 1729],   // Avellaneda, SarandÃ­
  [1740, 1749],   // Lomas de Zamora
  [1750, 1759],   // Quilmes, Bernal
  [1760, 1769],   // Quilmes Oeste
  [1770, 1779],   // Berazategui
  [1780, 1789],   // Almirante Brown
  [1810, 1819],   // Florencio Varela
  [1820, 1829],   // La Plata, Berisso, Ensenada
  [1870, 1879],   // Pilar, Escobar
  [1880, 1889],   // Del Viso, Villa Rosa
  [1890, 1899],   // JosÃ© C. Paz, San Miguel, Malvinas Argentinas
  [1900, 1929],   // La Plata
  [2800, 2809],   // ZÃ¡rate, Campana
  [1852, 1852],   // Guernica (Pte. PerÃ³n)
  [1814, 1814],   // CaÃ±uelas
  [1835, 1835],   // San Vicente
  [1744, 1744],   // Marcos Paz
  [6700, 6709],   // LujÃ¡n
  [1663, 1663],   // JosÃ© C. Paz
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
 * Extrae el numero de CP (elimina prefijo de letra y sufijo)
 * Ej: "B1802BLV" â†’ 1802, "1427" â†’ 1427, "C1427" â†’ 1427
 */
function extractCpNumber(zip: string): number | null {
  const match = zip.replace(/\s/g, "").match(/[A-Z]?(\d{4})/i);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Clasifica zona Flex por codigo postal
 */
function classifyByZip(zip: string | null | undefined): string | null {
  if (!zip) return null;
  const cpNum = extractCpNumber(zip);
  if (!cpNum) return null;

  for (const [min, max] of CP_CERCANA) {
    if (cpNum >= min && cpNum <= max) return "cercana";
  }
  for (const [min, max] of CP_MEDIA) {
    if (cpNum >= min && cpNum <= max) return "media";
  }
  for (const [min, max] of CP_LEJANA) {
    if (cpNum >= min && cpNum <= max) return "lejana";
  }

  return null;
}

/**
 * Clasifica zona Flex por nombre de ciudad/localidad.
 * Busca coincidencia parcial para cubrir variaciones de nombre.
 * Si no matchea por nombre, intenta por codigo postal.
 */
export function classifyFlexZone(
  city: string | null | undefined,
  zip?: string | null | undefined,
): string {
  // Primero intentar por nombre de ciudad
  if (city) {
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
  }

  // Fallback: clasificar por codigo postal
  const zipResult = classifyByZip(zip);
  if (zipResult) return zipResult;

  // Si no matchea ninguna lista ni CP, es desconocida
  return "desconocida";
}

/**
 * @deprecated Usar classifyFlexZone() con city name + zip
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
