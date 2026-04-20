import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getValidToken, type LinkedMeliAccount } from "@/lib/meli";

// POST - Descargar múltiples etiquetas
export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[etiquetas-download] Missing Supabase environment variables");
      return NextResponse.json(
        { error: "Error de configuración del servidor" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // Obtener las cuentas del usuario autenticado con todos los campos necesarios
    const { data: todasLasCuentas, error: errorCuentas } = await supabase
      .from("linked_meli_accounts")
      .select("id, user_id, meli_user_id, meli_nickname, access_token_enc, refresh_token_enc, token_expiry_date, is_active")
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

    // Crear mapa de cuentas por nombre (normalizando)
    const cuentasMap: Record<string, typeof todasLasCuentas[0]> = {};
    todasLasCuentas.forEach(c => {
      if (c.meli_nickname) {
        const nombre = c.meli_nickname.trim();
        // Varias formas de indexar
        cuentasMap[nombre.toLowerCase()] = c;
        cuentasMap[nombre.toUpperCase()] = c;
        cuentasMap[nombre] = c;
        cuentasMap[nombre.replace(/\s+/g, '').toLowerCase()] = c;
        cuentasMap[nombre.replace(/\s+/g, '').toUpperCase()] = c;
        // Sin la V al final (para MAQJEEZ V -> MAQJEEZ)
        const sinV = nombre.replace(/\s+v$/i, '').trim();
        if (sinV !== nombre) {
          cuentasMap[sinV.toLowerCase()] = c;
          cuentasMap[sinV.toUpperCase()] = c;
        }
        // Solo la primera palabra
        const primeraPalabra = nombre.split(/\s+/)[0];
        cuentasMap[primeraPalabra.toLowerCase()] = c;
        cuentasMap[primeraPalabra.toUpperCase()] = c;
      }
    });

    console.log(`[etiquetas-download] Mapa de cuentas:`, Object.keys(cuentasMap));

    // Descargar PDFs
    const pdfsDescargados: { order_id: string; blob: Blob; cuenta: string }[] = [];

    for (const etiqueta of etiquetas) {
      let cuentaNombre = (etiqueta.cuenta_origen || "").trim();
      const shippingId = String(etiqueta.shipping_id);
      const orderId = String(etiqueta.order_id);
      
      console.log(`[etiquetas-download] Procesando: order=${orderId}, shipping=${shippingId}, cuenta="${cuentaNombre}"`);
      
      // 1. PRIMERO: Intentar obtener el PDF guardado en la base de datos (backup permanente)
      try {
        const { data: etiquetaGuardada } = await supabase
          .from("etiquetas_historial")
          .select("pdf_data, pdf_guardado_en")
          .eq("order_id", orderId)
          .not("pdf_data", "is", null)
          .single();
        
        if (etiquetaGuardada?.pdf_data) {
          console.log(`[etiquetas-download] ✅ PDF encontrado en BD para ${orderId}`);
          const blob = new Blob([etiquetaGuardada.pdf_data], { type: "application/pdf" });
          pdfsDescargados.push({ order_id: orderId, blob, cuenta: cuentaNombre });
          continue; // Saltar a la siguiente etiqueta
        }
      } catch (err) {
        console.log(`[etiquetas-download] No hay PDF guardado para ${orderId}, intentando MeLi...`);
      }
      
      // 2. SEGUNDO: Si no está en BD, descargar de MeLi
      // Normalizar nombre de cuenta (quitar espacios extras, etc.)
      cuentaNombre = cuentaNombre.replace(/\s+/g, ' ').trim();
      
      // Buscar cuenta de varias formas
      let cuenta: typeof todasLasCuentas[0] | undefined = cuentasMap[cuentaNombre] || 
                   cuentasMap[cuentaNombre.toLowerCase()] || 
                   cuentasMap[cuentaNombre.toUpperCase()] ||
                   cuentasMap[cuentaNombre.replace(/\s+/g, '').toLowerCase()] ||
                   cuentasMap[cuentaNombre.replace(/\s+/g, '').toUpperCase()] ||
                   cuentasMap[cuentaNombre.split(/\s+/)[0].toLowerCase()] ||
                   cuentasMap[cuentaNombre.split(/\s+/)[0].toUpperCase()];

      // Si no se encuentra, intentar quitando la "V" al final
      if (!cuenta && cuentaNombre.match(/\sv$/i)) {
        const sinV = cuentaNombre.replace(/\sv$/i, '').trim();
        console.log(`[etiquetas-download] Intentando sin V: "${sinV}"`);
        cuenta = cuentasMap[sinV.toLowerCase()] || cuentasMap[sinV.toUpperCase()];
      }

      // Si aún no se encuentra, buscar parcial
      if (!cuenta) {
        console.log(`[etiquetas-download] Buscando match parcial para: "${cuentaNombre}"`);
        cuenta = todasLasCuentas.find(c => {
          const dbName = (c.meli_nickname || "").toLowerCase();
          const searchName = cuentaNombre.toLowerCase();
          // Match si uno contiene al otro
          return dbName.includes(searchName) || searchName.includes(dbName);
        });
        if (cuenta) {
          console.log(`[etiquetas-download] Match parcial encontrado: "${cuentaNombre}" -> "${cuenta.meli_nickname}"`);
        }
      }

      // Último recurso: usar la primera cuenta disponible
      if (!cuenta && todasLasCuentas.length > 0) {
        console.log(`[etiquetas-download] Usando primera cuenta como fallback: "${todasLasCuentas[0].meli_nickname}"`);
        cuenta = todasLasCuentas[0];
      }

      if (!cuenta) {
        console.error(`[etiquetas-download] No se encontró cuenta: "${cuentaNombre}"`);
        continue;
      }

      // Obtener token válido (desencriptado con auto-refresh)
      const validToken = await getValidToken(cuenta as LinkedMeliAccount);
      
      if (!validToken) {
        console.error(`[etiquetas-download] No se pudo obtener token válido para: "${cuenta.meli_nickname}"`);
        continue;
      }

      try {
        console.log(`[etiquetas-download] Descargando de MeLi shipping_id=${shippingId}...`);
        
        const pdfRes = await fetch(
          `https://api.mercadolibre.com/shipment_labels?shipment_ids=${shippingId}&response_type=pdf`,
          {
            headers: { Authorization: `Bearer ${validToken}` },
          }
        );

        if (pdfRes.ok) {
          const blob = await pdfRes.blob();
          pdfsDescargados.push({ order_id: orderId, blob, cuenta: cuentaNombre });
          console.log(`[etiquetas-download] Éxito desde MeLi: ${orderId}`);
        } else {
          const errorText = await pdfRes.text();
          console.error(`[etiquetas-download] Error MeLi ${orderId}:`, pdfRes.status, errorText.substring(0, 200));
        }
      } catch (err) {
        console.error(`[etiquetas-download] Error descargando ${orderId}:`, err);
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
