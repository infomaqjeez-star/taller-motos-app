/**
 * Sistema de Historial Inteligente para Auto-respuesta
 * Búsqueda por keywords sin IA - zero cost
 */

import { supabase } from "./supabase";

export interface KnowledgeItem {
  id: string;
  pregunta_original: string;
  respuesta_exitosa: string;
  palabras_clave: string[];
  tags: string[];
  uso_count: number;
  created_at: string;
}

// Stop words comunes en español para filtrar
const STOP_WORDS = new Set([
  "el", "la", "de", "que", "y", "a", "en", "es", "se", "los", "las",
  "un", "una", "unos", "unas", "del", "al", "son", "por", "con", "sin",
  "como", "para", "este", "ese", "este", "del", "pero", "más", "o", "si",
  "me", "te", "le", "nos", "os", "les", "mi", "tu", "su", "nuestro",
  "vuestro", "mío", "tuyo", "suyo", "nuestro", "vuestro"
]);

/**
 * Extraer palabras clave de un texto
 * - Normaliza a lowercase
 * - Remueve acentos
 * - Filtra palabras cortas y stopwords
 * - Retorna array único
 */
export function extractKeywords(text: string): string[] {
  if (!text || text.length === 0) return [];

  // Normalizar: lowercase y remover acentos
  const normalized = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remover diacríticos
    .replace(/[^a-z0-9\s]/g, " ") // Solo letras, números, espacios
    .split(/\s+/)
    .filter((word) => word.length > 0);

  // Filtrar: palabras cortas (< 3 chars) y stopwords
  const filtered = normalized.filter(
    (word) => word.length >= 3 && !STOP_WORDS.has(word)
  );

  // Retornar único
  return Array.from(new Set(filtered));
}

/**
 * Calcular similitud Jaccard entre dos arrays de keywords
 * Rango: 0-1 (0-100%)
 */
export function calculateSimilarity(
  keywords1: string[],
  keywords2: string[]
): number {
  if (keywords1.length === 0 || keywords2.length === 0) return 0;

  const set1 = new Set(keywords1);
  const set2 = new Set(keywords2);

  // Jaccard: intersección / unión
  const intersection = Array.from(set1).filter((k) => set2.has(k)).length;
  const union = new Set(Array.from(set1).concat(Array.from(set2))).size;

  return union > 0 ? intersection / union : 0;
}

/**
 * Buscar sugerencia en knowledge_base
 * Retorna el resultado con mayor similitud si supera el threshold (40%)
 * NOTA: Si hay error de permisos (401), retorna null silenciosamente
 */
export async function searchKnowledgeBase(
  pregunta: string,
  threshold: number = 0.4
): Promise<KnowledgeItem | null> {
  try {
    const keywords = extractKeywords(pregunta);
    if (keywords.length === 0) return null;

    // Buscar en Supabase: respuestas que compartan al menos 1 keyword
    const { data, error } = await supabase
      .from("knowledge_base")
      .select("*")
      .order("uso_count", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(20); // Traer top 20 para comparar

    if (error) {
      // Silenciar errores de permisos (401) - la tabla puede tener RLS
      if (error.code === "401" || error.message?.includes("Unauthorized")) {
        console.log("[KB] Sin acceso a knowledge_base (RLS)");
      } else {
        console.error("Error buscando en knowledge_base:", error);
      }
      return null;
    }

    if (!data || data.length === 0) return null;

    // Calcular similitud con cada resultado
    let bestMatch: KnowledgeItem | null = null;
    let bestSimilarity = threshold;

    for (const item of data as KnowledgeItem[]) {
      const similarity = calculateSimilarity(keywords, item.palabras_clave);

      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = item;
      }
    }

    console.log(
      `[KB] Búsqueda: "${pregunta.substring(0, 50)}..." → ${
        bestMatch ? `Similitud: ${(bestSimilarity * 100).toFixed(0)}%` : "Sin coincidencias"
      }`
    );

    return bestMatch;
  } catch (error) {
    console.error("Error en searchKnowledgeBase:", error);
    return null;
  }
}

/**
 * Guardar nueva respuesta exitosa en knowledge_base
 * NOTA: Si hay error de permisos (401), no guarda pero no muestra error
 */
export async function saveToKnowledgeBase(
  pregunta: string,
  respuesta: string,
  tags: string[] = []
): Promise<string | null> {
  try {
    if (!pregunta.trim() || !respuesta.trim()) {
      console.warn("[KB] Pregunta o respuesta vacías, no guardadas");
      return null;
    }

    const palabras_clave = extractKeywords(respuesta); // Extraer de la respuesta

    const { data, error } = await supabase
      .from("knowledge_base")
      .insert({
        pregunta_original: pregunta.substring(0, 500),
        respuesta_exitosa: respuesta.substring(0, 2000),
        palabras_clave,
        tags,
        uso_count: 0,
      })
      .select("id")
      .single();

    if (error) {
      // Silenciar errores de permisos (401) - la tabla puede tener RLS
      if (error.code === "401" || error.message?.includes("Unauthorized")) {
        console.log("[KB] Sin permisos para guardar en knowledge_base (RLS)");
      } else {
        console.error("[KB] Error guardando respuesta:", error);
      }
      return null;
    }

    console.log(
      `[KB] Respuesta guardada (${palabras_clave.length} keywords): ${pregunta.substring(0, 50)}...`
    );

    return data?.id ?? null;
  } catch (error) {
    console.error("[KB] Error en saveToKnowledgeBase:", error);
    return null;
  }
}

/**
 * Incrementar contador de uso cuando se reutiliza una sugerencia
 */
export async function incrementUsageCount(id: string): Promise<void> {
  try {
    const { error } = await supabase.rpc("increment_kb_usage", {
      kb_id: id,
    });

    if (error) {
      // Si no existe la función RPC, hacer update directo leyendo primero
      console.log("[KB] RPC no disponible, usando update directo");
      
      const { data } = await supabase
        .from("knowledge_base")
        .select("uso_count")
        .eq("id", id)
        .single();

      if (data) {
        await supabase
          .from("knowledge_base")
          .update({ uso_count: data.uso_count + 1 })
          .eq("id", id);
      }
    }
  } catch (error) {
    console.error("[KB] Error incrementando uso:", error);
  }
}

/**
 * Crear la tabla knowledge_base (para setup inicial)
 * Ejecutar en SQL Editor de Supabase:
 *
 * CREATE TABLE IF NOT EXISTS knowledge_base (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   pregunta_original TEXT NOT NULL,
 *   respuesta_exitosa TEXT NOT NULL,
 *   palabras_clave TEXT[] NOT NULL,
 *   tags TEXT[] DEFAULT '{}',
 *   uso_count INT DEFAULT 0,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 *   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 *
 * CREATE INDEX IF NOT EXISTS idx_palabras_clave ON knowledge_base USING GIN(palabras_clave);
 *
 * CREATE OR REPLACE FUNCTION increment_kb_usage(kb_id UUID)
 * RETURNS void AS $$
 * BEGIN
 *   UPDATE knowledge_base SET uso_count = uso_count + 1, updated_at = NOW()
 *   WHERE id = kb_id;
 * END;
 * $$ LANGUAGE plpgsql;
 */
