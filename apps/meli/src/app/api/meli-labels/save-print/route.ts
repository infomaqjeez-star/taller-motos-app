import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    const {
      shipment_id,
      order_id,
      tracking_number,
      buyer_nickname,
      sku,
      variation,
      quantity,
      account_id,
      meli_user_id,
      shipping_method,
      pdf_base64,
      tzOffset,
    } = await req.json();

    // Validar campos requeridos
    if (!shipment_id || !pdf_base64 || !meli_user_id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Generar filename: FLEX_2000012345678_1.pdf
    const method = (shipping_method || "other").toUpperCase();
    const filename = `${method}_${order_id || shipment_id}_${Date.now()}.pdf`;

    // Calcular path con fecha ajustada a zona horaria
    const offsetMs = tzOffset * 3600000;
    const date = new Date();
    date.setTime(date.getTime() + offsetMs);
    const dateStr = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
      2,
      "0"
    )}-${String(date.getUTCDate()).padStart(2, "0")}`;
    const filePath = `etiquetas/${dateStr}/${filename}`;

    // Convertir base64 a buffer
    const pdfBuffer = Buffer.from(pdf_base64, "base64");

    // Guardar en Storage
    const supabase = getSupabase();
    const { data: storageData, error: storageError } = await supabase.storage
      .from("meli-labels")
      .upload(filePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (storageError) {
      console.error("Storage error:", storageError);
      // No bloquear impresión si falla el guardado
      return NextResponse.json(
        { warning: "PDF saved locally but not archived", success: false },
        { status: 200 }
      );
    }

    // Obtener URL pública
    const {
      data: { publicUrl },
    } = supabase.storage.from("meli-labels").getPublicUrl(filePath);

    // Insertar en tabla printed_labels
    const { data: insertData, error: dbError } = await supabase
      .from("printed_labels")
      .insert([
        {
          shipment_id,
          order_id,
          tracking_number,
          buyer_nickname,
          sku,
          variation,
          quantity,
          account_id,
          meli_user_id,
          shipping_method: method.toLowerCase(),
          file_path: publicUrl,
          print_date: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (dbError) {
      console.error("DB error:", dbError);
      // No bloquear impresión si falla BD
      return NextResponse.json(
        {
          warning: "PDF saved but database record failed",
          file_path: publicUrl,
          success: false,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      file_path: publicUrl,
      id: insertData?.id,
    });
  } catch (error) {
    console.error("Save print error:", error);
    // No bloquear impresión por errores
    return NextResponse.json(
      { warning: "Background save failed", success: false },
      { status: 200 }
    );
  }
}
