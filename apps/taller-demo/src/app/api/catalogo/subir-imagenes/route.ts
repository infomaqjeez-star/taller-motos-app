import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

interface ImageBatchItem {
  sku: string;
  imageBase64: string; // sin el prefijo data:image...
  ext: string; // jpg, png, etc.
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServer();

    const authHeader = req.headers.get("authorization");
    if (authHeader !== "Bearer maqjeez-images-2026") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Crear bucket automáticamente si no existe
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === "catalog-images");
    if (!bucketExists) {
      await supabase.storage.createBucket("catalog-images", { public: true });
    }

    const { items }: { items: ImageBatchItem[] } = await req.json();
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Items requeridos" }, { status: 400 });
    }

    const results: { sku: string; ok: boolean; url?: string; error?: string }[] = [];

    for (const item of items) {
      try {
        const buffer = Buffer.from(item.imageBase64, "base64");
        const fileName = `catalog/${item.sku.replace(/[^a-zA-Z0-9\-]/g, "_")}.${item.ext || "jpg"}`;
        const contentType = item.ext === "png" ? "image/png" : item.ext === "webp" ? "image/webp" : "image/jpeg";

        const { error: upErr } = await supabase.storage
          .from("catalog-images")
          .upload(fileName, buffer, { contentType, upsert: true });

        if (upErr) {
          results.push({ sku: item.sku, ok: false, error: upErr.message });
          continue;
        }

        const { data: urlData } = supabase.storage.from("catalog-images").getPublicUrl(fileName);
        const publicUrl = urlData.publicUrl;

        // Actualizar producto en DB
        const { error: dbErr } = await supabase
          .from("catalog_products")
          .update({ image_url: publicUrl })
          .eq("sku", item.sku);

        if (dbErr) {
          results.push({ sku: item.sku, ok: false, error: dbErr.message });
          continue;
        }

        results.push({ sku: item.sku, ok: true, url: publicUrl });
      } catch (err: any) {
        results.push({ sku: item.sku, ok: false, error: err.message });
      }
    }

    const okCount = results.filter((r) => r.ok).length;
    return NextResponse.json({
      success: true,
      processed: results.length,
      uploaded: okCount,
      failed: results.length - okCount,
      results,
    });
  } catch (err: any) {
    console.error("subir-imagenes error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
