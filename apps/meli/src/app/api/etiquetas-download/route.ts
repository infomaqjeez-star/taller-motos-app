import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// POST - Descargar múltiples etiquetas
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { etiquetas } = body;

    if (!etiquetas || !Array.isArray(etiquetas) || etiquetas.length === 0) {
      return NextResponse.json(
        { error: "Se requiere un array de etiquetas" },
        { status: 400 }
      );
    }

    console.log(`[etiquetas-download] Descargando ${etiquetas.length} etiquetas`);
    console.log(`[etiquetas-download] Etiquetas recibidas:`, etiquetas.map(e => ({ order_id: e.order_id, cuenta: e.cuenta_origen, shipping_id: e.shipping_id })));

    // Obtener el usuario actual de la sesión
    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        userId = user.id;
      }
    }

    if (!userId) {
      console.error("[etiquetas-download] No hay usuario autenticado");
      return NextResponse.json(
        { error: "No autorizado - debe iniciar sesión" },
        { status: 401 }
      );
    }

    // Obtener las cuentas del usuario autenticado
    const { data: todasLasCuentas, error: errorCuentas } = await supabase
      .from("linked_meli_accounts")
      .select("meli_nickname, access_token")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (errorCuentas || !todasLasCuentas || todasLasCuentas.length === 0) {
      console.error("[etiquetas-download] No hay cuentas vinculadas:", errorCuentas);
      return NextResponse.json(
        { error: "No hay cuentas de Mercado Libre vinculadas" },
        { status: 401 }
      );
    }

    console.log(`[etiquetas-download] Cuentas disponibles para user ${userId}:`, todasLasCuentas.map(c => c.meli_nickname));

    // Crear mapa de cuentas (normalizando nombres)
    const cuentasMap: Record<string, string> = {};
    todasLasCuentas.forEach(c => {
      if (c.meli_nickname && c.access_token) {
        const nombre = c.meli_nickname.trim();
        cuentasMap[nombre.toLowerCase()] = c.access_token;
        cuentasMap[nombre.toUpperCase()] = c.access_token;
        cuentasMap[nombre] = c.access_token;
        cuentasMap[nombre.replace(/\s+/g, '').toLowerCase()] = c.access_token;
        cuentasMap[nombre.replace(/\s+/g, '').toUpperCase()] = c.access_token;
      }
    });

    console.log(`[etiquetas-download] Mapa de cuentas:`, Object.keys(cuentasMap));

    // Descargar PDFs
    const pdfsDescargados: { order_id: string; blob: Blob; cuenta: string }[] = [];

    for (const etiqueta of etiquetas) {
      const cuentaNombre = (etiqueta.cuenta_origen || "").trim();
      const shippingId = String(etiqueta.shipping_id);
      
      console.log(`[etiquetas-download] Procesando: order=${etiqueta.order_id}, shipping=${shippingId}, cuenta="${cuentaNombre}"`);
      
      // Buscar token de varias formas
      let token = cuentasMap[cuentaNombre] || 
                  cuentasMap[cuentaNombre.toLowerCase()] || 
                  cuentasMap[cuentaNombre.toUpperCase()] ||
                  cuentasMap[cuentaNombre.replace(/\s+/g, '').toLowerCase()] ||
                  cuentasMap[cuentaNombre.replace(/\s+/g, '').toUpperCase()];

      // Si no se encuentra exacto, buscar parcial
      if (!token) {
        console.log(`[etiquetas-download] Buscando match parcial para: "${cuentaNombre}"`);
        const cuentaEncontrada = todasLasCuentas.find(c => {
          const dbName = (c.meli_nickname || "").toLowerCase();
          const searchName = cuentaNombre.toLowerCase();
          return dbName.includes(searchName) || searchName.includes(dbName);
        });
        if (cuentaEncontrada) {
          token = cuentaEncontrada.access_token;
          console.log(`[etiquetas-download] Match parcial encontrado: "${cuentaNombre}" -> "${cuentaEncontrada.meli_nickname}"`);
        }
      }

      if (!token) {
        console.error(`[etiquetas-download] No hay token para cuenta: "${cuentaNombre}"`);
        continue;
      }

      try {
        console.log(`[etiquetas-download] Descargando shipping_id=${shippingId}...`);
        
        const pdfRes = await fetch(
          `https://api.mercadolibre.com/shipment_labels?shipment_ids=${shippingId}&response_type=pdf`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (pdfRes.ok) {
          const blob = await pdfRes.blob();
          pdfsDescargados.push({ order_id: etiqueta.order_id, blob, cuenta: cuentaNombre });
          console.log(`[etiquetas-download] Éxito: ${etiqueta.order_id}`);
        } else {
          const errorText = await pdfRes.text();
          console.error(`[etiquetas-download] Error MeLi ${etiqueta.order_id}:`, pdfRes.status, errorText.substring(0, 200));
        }
      } catch (err) {
        console.error(`[etiquetas-download] Error descargando ${etiqueta.order_id}:`, err);
      }
    }

    console.log(`[etiquetas-download] Total descargadas: ${pdfsDescargados.length}/${etiquetas.length}`);

    if (pdfsDescargados.length === 0) {
      return NextResponse.json(
        { error: "No se pudo descargar ninguna etiqueta. Verifica que las cuentas estén vinculadas y los tokens sean válidos." },
        { status: 500 }
      );
    }

    // Si hay múltiples PDFs, combinarlos (por ahora devolvemos el primero)
    // TODO: Implementar combinación de PDFs
    return new NextResponse(pdfsDescargados[0].blob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="etiqueta-${pdfsDescargados[0].order_id}.pdf"`,
      },
    });

  } catch (error) {
    console.error("[etiquetas-download] Error inesperado:", error);
    return NextResponse.json(
      { error: "Error interno del servidor", details: String(error) },
      { status: 500 }
    );
  }
}
