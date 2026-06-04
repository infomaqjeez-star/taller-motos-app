import type { MetadataRoute } from "next";

const BASE = "https://appjeezpro.store";

// Revalidacion: 6 horas. Cambiar si productos varian con mas frecuencia.
export const revalidate = 21600;

type SitemapItem = {
  url: string;
  lastModified: Date;
  changeFrequency: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority: number;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // 1) Paginas estaticas publicas
  const staticItems: SitemapItem[] = [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE}/landing`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/catalogo`, lastModified: now, changeFrequency: "daily", priority: 0.95 },
    { url: `${BASE}/catalogo/promo`, lastModified: now, changeFrequency: "daily", priority: 0.85 },
    { url: `${BASE}/catalogo/descuentos`, lastModified: now, changeFrequency: "daily", priority: 0.85 },
    { url: `${BASE}/ayuda`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/terminos`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/privacidad`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/cookies`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/cancelacion`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  // 2) Productos del catalogo (SKUs activos con precio mayor a 0)
  // Si la query falla, devolvemos solo las paginas estaticas.
  let productItems: SitemapItem[] = [];
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseKey) {
      const all: { sku: string; updated_at: string }[] = [];
      let offset = 0;
      const pageSize = 1000;
      while (offset < 5000) {
        const u = `${supabaseUrl}/rest/v1/catalog_products?select=sku,updated_at&active=eq.true&catalog_price=gt.0&order=sku&limit=${pageSize}&offset=${offset}`;
        const res = await fetch(u, {
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
          next: { revalidate: 21600 },
        });
        if (!res.ok) break;
        const page = (await res.json()) as { sku: string; updated_at: string }[];
        if (!page || page.length === 0) break;
        all.push(...page);
        if (page.length < pageSize) break;
        offset += pageSize;
      }
      productItems = all.map((p) => ({
        url: `${BASE}/catalogo/producto/${encodeURIComponent(p.sku)}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : now,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }));
    }
  } catch {
    // ignorar errores: si Supabase no responde devolvemos solo paginas estaticas
  }

  return [...staticItems, ...productItems];
}
