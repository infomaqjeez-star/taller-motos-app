import type { Metadata } from "next";

type Params = { sku: string };

async function fetchProduct(sku: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  try {
    const u = `${supabaseUrl}/rest/v1/catalog_products?select=sku,name,description,catalog_price,original_price,image_url,category&sku=eq.${encodeURIComponent(sku)}&active=eq.true&limit=1`;
    const res = await fetch(u, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as any[];
    return rows?.[0] ?? null;
  } catch {
    return null;
  }
}

function fmtPrice(n: number | null | undefined): string {
  if (!n || n <= 0) return "Consultar";
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { sku } = params;
  const product = await fetchProduct(sku);

  if (!product) {
    return {
      title: `Producto ${sku}`,
      description: `Detalle del producto ${sku} en el catálogo MaqJeez.`,
      alternates: { canonical: `/catalogo/producto/${sku}` },
      robots: { index: false, follow: true },
    };
  }

  const priceActual = Number(product.catalog_price) || 0;
  const priceOriginal = Number(product.original_price) || 0;
  const onSale = priceOriginal > 0 && priceOriginal > priceActual;
  const priceLabel = priceActual > 0 ? fmtPrice(priceActual) : "Consultar precio";
  const descParts = [
    product.name,
    onSale ? `Antes ${fmtPrice(priceOriginal)}, ahora ${priceLabel}` : priceLabel,
    "Envíos a todo el país desde Carlos Spegazzini, Buenos Aires.",
  ];

  return {
    title: `${product.name} (SKU ${sku})`,
    description: descParts.join(" — "),
    alternates: { canonical: `/catalogo/producto/${sku}` },
    keywords: [product.name, sku, product.category, "repuesto", "MaqJeez"].filter(Boolean),
    openGraph: {
      type: "website",
      title: product.name,
      description: descParts.join(" — "),
      url: `https://appjeezpro.store/catalogo/producto/${sku}`,
      images: product.image_url
        ? [{ url: product.image_url, width: 800, height: 800, alt: product.name }]
        : [{ url: "/opengraph-image", width: 1200, height: 630, alt: product.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description: priceLabel,
      images: product.image_url ? [product.image_url] : ["/opengraph-image"],
    },
    other: {
      "product:price:amount": String(priceActual || ""),
      "product:price:currency": "ARS",
      "product:availability": priceActual > 0 ? "in stock" : "out of stock",
      "product:retailer_item_id": sku,
      "product:category": product.category || "",
    },
  };
}

// JSON-LD Product structured data inyectado en el head del layout
async function ProductJsonLd({ sku }: { sku: string }) {
  const product = await fetchProduct(sku);
  if (!product) return null;
  const priceActual = Number(product.catalog_price) || 0;
  const priceOriginal = Number(product.original_price) || 0;
  const ld = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `https://appjeezpro.store/catalogo/producto/${sku}#product`,
    name: product.name,
    sku,
    mpn: sku,
    description: product.name + (product.description ? ` — ${product.description}` : ""),
    image: product.image_url || "https://appjeezpro.store/opengraph-image",
    category: product.category || "Repuestos",
    brand: { "@type": "Brand", name: "MaqJeez" },
    offers: {
      "@type": "Offer",
      url: `https://appjeezpro.store/catalogo/producto/${sku}`,
      priceCurrency: "ARS",
      price: priceActual > 0 ? priceActual : undefined,
      availability: priceActual > 0 ? "https://schema.org/InStock" : "https://schema.org/InquireOnly",
      itemCondition: "https://schema.org/NewCondition",
      ...(priceOriginal > 0 && priceOriginal > priceActual
        ? {
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: priceActual,
              priceCurrency: "ARS",
              referencePrice: priceOriginal,
            },
          }
        : {}),
      seller: { "@type": "Organization", name: "Taller MAQJEEZ", url: "https://appjeezpro.store" },
    },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
    />
  );
}

export default async function ProductLayout({ children, params }: { children: React.ReactNode; params: Params }) {
  return (
    <>
      {await ProductJsonLd({ sku: params.sku })}
      {children}
    </>
  );
}
