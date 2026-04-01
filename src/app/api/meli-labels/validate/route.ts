import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { shipment_ids, meli_user_id } = body as {
      shipment_ids: number[];
      meli_user_id?: string;
    };

    if (!shipment_ids || !Array.isArray(shipment_ids) || shipment_ids.length === 0) {
      return NextResponse.json(
        { error: "shipment_ids es requerido y debe ser un array no vacío" },
        { status: 400 }
      );
    }

    // Consultar printed_labels para ver cuáles ya fueron impresas
    // (usamos printed_labels en lugar de meli_printed_labels para consistencia)
    let query = supabase
      .from("printed_labels")
      .select("shipment_id")
      .in("shipment_id", shipment_ids);

    // Si hay meli_user_id, filtrar por eso para más precisión
    if (meli_user_id) {
      query = query.eq("meli_user_id", meli_user_id);
    }

    const { data: alreadyPrinted, error } = await query;

    if (error) {
      console.error("Error checking printed status:", error);
      return NextResponse.json(
        { error: "Error al validar estado de impresión" },
        { status: 500 }
      );
    }

    const printedIds = new Set((alreadyPrinted || []).map(p => p.shipment_id));

    const valid = shipment_ids.filter(id => !printedIds.has(id));
    const already_printed = shipment_ids.filter(id => printedIds.has(id));

    return NextResponse.json({
      valid,
      already_printed,
      allValid: already_printed.length === 0,
    });
  } catch (err) {
    console.error("Validate endpoint error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

