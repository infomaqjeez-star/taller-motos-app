import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic  = "force-dynamic";
export const revalidate = 0;

const SUPA_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ENC_KEY     = process.env.APPJEEZ_MELI_ENCRYPTION_KEY!;

async function deriveKey(passphrase: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const km  = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode("appjeez-meli-salt"), iterations: 100000, hash: "SHA-256" },
    km, { name: "AES-GCM", length: 256 }, false, ["decrypt"]
  );
}
async function decrypt(enc64: string, pass: string): Promise<string> {
  const key      = await deriveKey(pass);
  const combined = Uint8Array.from(atob(enc64), c => c.charCodeAt(0));
  const plain    = await crypto.subtle.decrypt({ name: "AES-GCM", iv: combined.slice(0, 12) }, key, combined.slice(12));
  return new TextDecoder().decode(plain);
}

async function meliGet(path: string, token: string) {
  try {
    const res = await fetch(`https://api.mercadolibre.com${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

async function meliPost(path: string, token: string, body: unknown) {
  try {
    const res = await fetch(`https://api.mercadolibre.com${path}`, {
      method:  "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body:    JSON.stringify(body),
      signal:  AbortSignal.timeout(15000),
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: { message: (e as Error).message } };
  }
}

interface CloneRequest {
  origin_id: string;   // UUID cuenta origen en Supabase
  dest_id:   string;   // UUID cuenta destino en Supabase
  item_ids:  string[]; // IDs de publicaciones a clonar (ej: ["MLA123","MLA456"])
}

// POST /api/meli-sync/clone
export async function POST(req: Request) {
  let body: CloneRequest;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }

  const { origin_id, dest_id, item_ids } = body;
  if (!origin_id || !dest_id || !item_ids?.length) {
    return NextResponse.json({ error: "origin_id, dest_id y item_ids son requeridos" }, { status: 400 });
  }

  try {
    const supabase = createClient(SUPA_URL, SERVICE_KEY);
    const { data: accounts } = await supabase
      .from("meli_accounts")
      .select("id, meli_user_id, nickname, access_token_enc")
      .in("id", [origin_id, dest_id])
      .eq("status", "active");

    if (!accounts || accounts.length < 2) {
      return NextResponse.json({ error: "Cuentas no encontradas o inactivas" }, { status: 404 });
    }

    const origin = accounts.find(a => a.id === origin_id)!;
    const dest   = accounts.find(a => a.id === dest_id)!;

    const [originToken, destToken] = await Promise.all([
      decrypt(origin.access_token_enc, ENC_KEY),
      decrypt(dest.access_token_enc, ENC_KEY),
    ]);

    // Obtener títulos existentes en destino (anti-duplicado)
    const [activeData, pausedData] = await Promise.all([
      meliGet(`/users/${dest.meli_user_id}/items/search?status=active&limit=100`, destToken),
      meliGet(`/users/${dest.meli_user_id}/items/search?status=paused&limit=100`, destToken),
    ]);
    const destIds = [
      ...((activeData?.results ?? []) as string[]),
      ...((pausedData?.results ?? []) as string[]),
    ];
    const destTitlesNorm = new Set<string>();
    if (destIds.length) {
      for (let i = 0; i < destIds.length; i += 20) {
        const chunk = destIds.slice(i, i + 20);
        const data = await meliGet(`/items?ids=${chunk.join(",")}&attributes=title`, destToken);
        const list = (data ?? []) as Array<{ code: number; body: { title: string } }>;
        for (const e of list) {
          if (e.code === 200) destTitlesNorm.add(e.body.title.toLowerCase().trim());
        }
      }
    }

    const results: Array<{
      item_id: string;
      title:   string;
      status:  "cloned" | "skipped_duplicate" | "error";
      new_id?: string;
      reason?: string;
    }> = [];

    // Procesar en serie con rate limiting (evitar ban de MeLi)
    for (const itemId of item_ids.slice(0, 100)) { // máx 100 por request
      try {
        // Obtener detalles completos del item origen
        const res = await fetch(`https://api.mercadolibre.com/items/${itemId}`, {
          headers: { Authorization: `Bearer ${originToken}` },
          signal:  AbortSignal.timeout(10000),
        });
        if (!res.ok) {
          results.push({ item_id: itemId, title: itemId, status: "error", reason: `HTTP ${res.status}` });
          continue;
        }
        const item = await res.json() as Record<string, unknown>;
        const title = (item.title as string) ?? "";

        // Verificar duplicado por título
        if (destTitlesNorm.has(title.toLowerCase().trim())) {
          results.push({ item_id: itemId, title, status: "skipped_duplicate", reason: "Título ya existe en destino" });
          continue;
        }

        // Obtener descripción
        const descRes = await meliGet(`/items/${itemId}/description`, originToken);
        const description = (descRes?.plain_text as string) ?? "";

        // Construir payload de la nueva publicación
        const newItem: Record<string, unknown> = {
          title:            item.title,
          category_id:      item.category_id,
          price:            item.price,
          currency_id:      item.currency_id ?? "ARS",
          available_quantity: item.available_quantity ?? 1,
          buying_mode:      item.buying_mode ?? "buy_it_now",
          condition:        item.condition ?? "new",
          listing_type_id:  item.listing_type_id ?? "gold_special",
          description:      { plain_text: description },
        };

        // Incluir fotos (hasta 12)
        const pictures = (item.pictures as Array<{ url: string }> | undefined) ?? [];
        if (pictures.length) {
          newItem.pictures = pictures.slice(0, 12).map(p => ({
            source: (p.url as string).replace("http://", "https://"),
          }));
        }

        // Incluir atributos si existen
        if (Array.isArray(item.attributes) && (item.attributes as unknown[]).length) {
          newItem.attributes = item.attributes;
        }

        // Incluir variantes si existen
        if (Array.isArray(item.variations) && (item.variations as unknown[]).length) {
          newItem.variations = item.variations;
        }

        // Publicar en cuenta destino
        const postRes = await meliPost("/items", destToken, newItem);

        if (postRes.ok) {
          const newId = (postRes.data as Record<string, unknown>)?.id as string;
          destTitlesNorm.add(title.toLowerCase().trim()); // evitar duplicado en la misma tanda
          results.push({ item_id: itemId, title, status: "cloned", new_id: newId });
        } else {
          const errMsg = (postRes.data as Record<string, unknown>)?.message as string | undefined;
          results.push({ item_id: itemId, title, status: "error", reason: errMsg ?? `HTTP ${postRes.status}` });
        }

        // Rate limit: 300 req/min → ~200ms entre publicaciones
        await new Promise(r => setTimeout(r, 250));

      } catch (e) {
        results.push({ item_id: itemId, title: itemId, status: "error", reason: (e as Error).message });
      }
    }

    const cloned   = results.filter(r => r.status === "cloned").length;
    const skipped  = results.filter(r => r.status === "skipped_duplicate").length;
    const errors   = results.filter(r => r.status === "error").length;

    return NextResponse.json({
      origin:  origin.nickname,
      dest:    dest.nickname,
      results,
      summary: { total: results.length, cloned, skipped_duplicate: skipped, errors },
    });

  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
