import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getValidToken, type LinkedMeliAccount } from "@/lib/meli";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

/**
 * POST /api/etiquetas-guardar
 * Descarga la etiqueta de MeLi y la guarda en la base de datos como PDF
 * Esto es un backup permanente ya que MeLi borra las etiquetas después de 72hs
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { order_id, shipping_id, cuenta_origen, meli_account_id } = body;

    if (!order_id || !shipping_id) {
      return NextResponse.json(
        { error: "Se requiere order_id y shipping_id" },
        { status: 400 }
      );
    }

    // Verificar si ya existe la etiqueta guardada
    const { data: existing } = await supabase
      .from("etiquetas_historial")
      .select("id, pdf_data")
      .eq("order_id", String(order_id))
      .not("pdf_data", "is", null)
      .single();

    if (existing?.pdf_data) {
      console.log(`[etiquetas-guardar] Etiqueta ${order_id} ya tiene PDF guardado`);
      return NextResponse.json({ 
        success: true, 
        message: "Etiqueta ya guardada",
        from_cache: true 
      });
    }

    // Obtener usuario autenticado
    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
      if (user) userId = user.id;
    }

    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener la cuenta de MeLi
    let account;
    if (meli_account_id) {
      const { data } = await supabase
        .from("linked_meli_accounts")
        .select("id, user_id, meli_user_id, meli_nickname, access_token_enc, refresh_token_enc, token_expiry_date, is_active")
        .eq("id", meli_account_id)
        .eq("user_id", userId)
        .single();
      account = data;
    } else {
      // Buscar por nombre de cuenta
      const { data: accounts } = await supabase
        .from("linked_meli_accounts")
        .select("id, user_id, meli_user_id, meli_nickname, access_token_enc, refresh_token_enc, token_expiry_date, is_active")
        .eq("user_id", userId)
        .eq("is_active", true);
      
      if (accounts && accounts.length > 0) {
        // Buscar por nombre
        account = accounts.find(a => 
          a.meli_nickname?.toLowerCase().includes((cuenta_origen || "").toLowerCase())
        ) || accounts[0];
      }
    }

    if (!account) {
      return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
    }

    // Obtener token válido
    const token = await getValidToken(account as LinkedMeliAccount);
    if (!token) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    console.log(`[etiquetas-guardar] Descargando PDF para orden ${order_id}, shipping ${shipping_id}`);

    // Descargar PDF de MeLi
    const pdfRes = await fetch(
      `https://api.mercadolibre.com/shipment_labels?shipment_ids=${shipping_id}&response_type=pdf`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(30000),
      }
    );

    if (!pdfRes.ok) {
      const errorText = await pdfRes.text();
      console.error(`[etiquetas-guardar] Error MeLi ${pdfRes.status}:`, errorText);
      return NextResponse.json(
        { error: `Error descargando de MeLi: ${pdfRes.status}` },
        { status: 500 }
      );
    }

    // Convertir a bytes
    const pdfBlob = await pdfRes.blob();
    const pdfBuffer = await pdfBlob.arrayBuffer();
    const pdfBytes = new Uint8Array(pdfBuffer);

    console.log(`[etiquetas-guardar] PDF descargado: ${pdfBytes.length} bytes`);

    // Guardar en la base de datos
    const { error: upsertError } = await supabase
      .from("etiquetas_historial")
      .upsert({
        order_id: String(order_id),
        shipping_id: String(shipping_id),
        cuenta_origen: cuenta_origen || account.meli_nickname,
        meli_account_id: account.id,
        pdf_data: pdfBytes,
        pdf_guardado_en: new Date().toISOString(),
        pdf_generado: true,
      }, {
        onConflict: "order_id"
      });

    if (upsertError) {
      console.error("[etiquetas-guardar] Error guardando en BD:", upsertError);
      return NextResponse.json(
        { error: "Error guardando en base de datos" },
        { status: 500 }
      );
    }

    console.log(`[etiquetas-guardar] ✅ Etiqueta ${order_id} guardada exitosamente`);

    return NextResponse.json({
      success: true,
      message: "Etiqueta guardada correctamente",
      size: pdfBytes.length,
    });

  } catch (error) {
    console.error("[etiquetas-guardar] Error inesperado:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/etiquetas-guardar?order_id=XXX
 * Obtiene el PDF guardado de una etiqueta
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const order_id = searchParams.get("order_id");

    if (!order_id) {
      return NextResponse.json({ error: "Se requiere order_id" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("etiquetas_historial")
      .select("order_id, shipping_id, cuenta_origen, pdf_data, titulo_producto")
      .eq("order_id", order_id)
      .single();

    if (error || !data?.pdf_data) {
      return NextResponse.json({ error: "Etiqueta no encontrada" }, { status: 404 });
    }

    // Devolver el PDF
    return new NextResponse(data.pdf_data, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="etiqueta-${order_id}.pdf"`,
      },
    });

  } catch (error) {
    console.error("[etiquetas-guardar GET] Error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
