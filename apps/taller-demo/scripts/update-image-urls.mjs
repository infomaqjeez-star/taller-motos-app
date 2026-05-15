import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://eetoajcxbwcecbpsqorr.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const STORAGE_URL = "https://eetoajcxbwcecbpsqorr.supabase.co/storage/v1/object/public/catalog-images";

async function updateImages() {
  console.log("Obteniendo productos activos...");
  const { data: products, error } = await supabase
    .from("catalog_products")
    .select("sku, image_url")
    .eq("active", true);

  if (error) {
    console.error("Error:", error.message);
    return;
  }

  console.log(`${products.length} productos activos encontrados`);

  let updated = 0;
  let errors = 0;
  const BATCH = 50;

  for (let i = 0; i < products.length; i += BATCH) {
    const batch = products.slice(i, i + BATCH);
    const updates = [];

    for (const p of batch) {
      const correctUrl = `${STORAGE_URL}/${p.sku}.webp`;
      if (!p.image_url || p.image_url !== correctUrl) {
        updates.push({ sku: p.sku, image_url: correctUrl });
      }
    }

    if (updates.length > 0) {
      for (const u of updates) {
        const { error: upErr } = await supabase
          .from("catalog_products")
          .update({ image_url: u.image_url })
          .eq("sku", u.sku);

        if (upErr) {
          console.error(`  ERROR ${u.sku}:`, upErr.message);
          errors++;
        } else {
          updated++;
        }
      }
      console.log(`  Batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(products.length / BATCH)}: ${updates.length} actualizados`);
    }
  }

  console.log("\nResultado final:");
  console.log("  Actualizados:", updated);
  console.log("  Errores:", errors);
}

updateImages().catch(console.error);
