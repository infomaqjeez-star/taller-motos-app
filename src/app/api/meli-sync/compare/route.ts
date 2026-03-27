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

async function getAccountItems(userId: string, token: string) {
  // Obtener todos los IDs (activos + pausados)
  const [activeData, pausedData] = await Promise.all([
    meliGet(`/users/${userId}/items/search?status=active&limit=100`, token),
    meliGet(`/users/${userId}/items/search?status=paused&limit=100`, token),
  ]);
  const ids = [
    ...((activeData?.results ?? []) as string[]),
    ...((pausedData?.results ?? []) as string[]),
  ];
  if (!ids.length) return [];

  // Cargar detalles en lotes de 20
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 20) chunks.push(ids.slice(i, i + 20));

  const items: object[] = [];
  // Procesamos con delay para respetar rate limit (300 req/min)
  for (const chunk of chunks) {
    const data = await meliGet(
      `/items?ids=${chunk.join(",")}&attributes=id,title,price,currency_id,available_quantity,sold_quantity,thumbnail,status,permalink,category_id,condition,listing_type_id,logistic_type`,
      token
    );
    const list = (data ?? []) as Array<{ code: number; body: Record<string, unknown> }>;
    for (const entry of list) {
      if (entry.code === 200 && entry.body) {
        const b = entry.body;
        items.push({
          id:                 b.id,
          title:              b.title,
          price:              b.price,
          currency_id:        b.currency_id ?? "ARS",
          available_quantity: b.available_quantity ?? 0,
          sold_quantity:      b.sold_quantity ?? 0,
          thumbnail:          (b.thumbnail as string | undefined)?.replace("http://", "https://") ?? null,
          status:             b.status,
          permalink:          b.permalink,
          category_id:        b.category_id,
          condition:          b.condition,
          listing_type_id:    b.listing_type_id,
          logistic_type:      b.logistic_type,
        });
      }
    }
    // Rate limit: pequeña pausa entre chunks
    if (chunks.length > 3) await new Promise(r => setTimeout(r, 200));
  }
  return items;
}

// GET /api/meli-sync/compare?origin_id=UUID&dest_id=UUID
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const originId = searchParams.get("origin_id");
  const destId   = searchParams.get("dest_id");

  if (!originId || !destId) {
    return NextResponse.json({ error: "origin_id y dest_id son requeridos" }, { status: 400 });
  }

  try {
    const supabase = createClient(SUPA_URL, SERVICE_KEY);
    const { data: accounts } = await supabase
      .from("meli_accounts")
      .select("id, meli_user_id, nickname, access_token_enc")
      .in("id", [originId, destId])
      .eq("status", "active");

    if (!accounts || accounts.length < 2) {
      return NextResponse.json({ error: "No se encontraron las dos cuentas activas" }, { status: 404 });
    }

    const origin = accounts.find(a => a.id === originId)!;
    const dest   = accounts.find(a => a.id === destId)!;

    const [originToken, destToken] = await Promise.all([
      decrypt(origin.access_token_enc, ENC_KEY),
      decrypt(dest.access_token_enc, ENC_KEY),
    ]);

    // Obtener publicaciones de ambas cuentas en paralelo
    const [originItems, destItems] = await Promise.all([
      getAccountItems(String(origin.meli_user_id), originToken),
      getAccountItems(String(dest.meli_user_id), destToken),
    ]);

    // Índice de títulos en destino (normalizado para comparación)
    const destTitlesNorm = new Set(
      (destItems as Array<{ title: string }>).map(i => i.title.toLowerCase().trim())
    );

    // Clasificar cada publicación de origen
    type OriginItem = { id: string; title: string; available_quantity: number; [k: string]: unknown };
    const canClone:   OriginItem[] = [];
    const alreadyExists: OriginItem[] = [];

    for (const item of originItems as OriginItem[]) {
      const normTitle = item.title.toLowerCase().trim();
      if (destTitlesNorm.has(normTitle)) {
        alreadyExists.push(item);
      } else {
        canClone.push(item);
      }
    }

    return NextResponse.json({
      origin: { id: originId, nickname: origin.nickname, total: originItems.length },
      dest:   { id: destId,   nickname: dest.nickname,   total: destItems.length },
      can_clone:     canClone,
      already_exists: alreadyExists,
      summary: {
        origin_total:   originItems.length,
        dest_total:     destItems.length,
        can_clone:      canClone.length,
        already_exists: alreadyExists.length,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
