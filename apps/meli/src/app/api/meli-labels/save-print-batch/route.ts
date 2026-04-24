import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { adjustUnifiedStockByIdentifier } from "@/lib/stock";

// Forzar renderizado dinamico - evita error de generacion estatica
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key";

const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseServiceKey || "placeholder-key"
);

/**
 * POST /api/meli-labels/save-print-batch
 *
 * Guarda un lote de etiquetas impresas en el historial.
 * Acepta: { shipments, pdf_base64?, tzOffset? }
 *   shipments[]: { shipment_id, order_id, tracking_number, buyer_nickname,
 *                  sku, variation, quantity, account_id, meli_user_id, shipping_method }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Compatibilidad con el formato nuevo (shipments[]) y el viejo (order_ids[])
    const shipments: any[] = body.shipments || [];
    const legacyOrderIds: string[] = body.order_ids || [];

    if (shipments.length === 0 && legacyOrderIds.length === 0) {
      return NextResponse.json(
        { error: "Se requiere 'shipments' o 'order_ids'" },
        { status: 400 }
      );
    }

    const printedAt = body.print_date || new Date().toISOString();

    // ── Obtener userId desde el header Authorization (opcional) ──────────
    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) userId = user.id;
    }

    // ── Procesar formato nuevo (shipments[]) ─────────────────────────────
    if (shipments.length > 0) {
      const shipmentIds = shipments.map((s: any) => String(s.shipment_id)).filter(Boolean);
      const { data: existingRows } = await supabase
        .from("meli_printed_labels")
        .select("shipment_id")
        .in("shipment_id", shipmentIds);

      const existingShipmentIds = new Set(
        (existingRows || []).map((row: any) => String(row.shipment_id))
      );

      const rows = shipments.map((s: any) => ({
        shipment_id:      s.shipment_id,
        order_id:         s.order_id ?? null,
        tracking_number:  s.tracking_number ?? null,
        buyer_nickname:   s.buyer_nickname ?? null,
        sku:              s.sku ?? null,
        variation:        s.variation ?? null,
        quantity:         s.quantity ?? 1,
        account_id:       s.account_id ?? null,
        meli_user_id:     s.meli_user_id ?? null,
        // tipo / shipping_method → guardado en columna 'type'
        type:             (s.shipping_method || "flex").toLowerCase(),
        source:           "app",
        printed_at:       printedAt,
        user_id:          userId,
      }));

      const { error: insertError } = await supabase
        .from("meli_printed_labels")
        .upsert(rows, { onConflict: "shipment_id" });

      if (insertError) {
        console.error("[save-print-batch] Error guardando historial:", insertError);
        return NextResponse.json(
          { error: "Error al guardar historial de impresion", details: insertError.message },
          { status: 500 }
        );
      }

      const stockResults = [];
      const newShipments = shipments.filter(
        (shipment: any) => !existingShipmentIds.has(String(shipment.shipment_id))
      );

      for (const shipment of newShipments) {
        const shippingMethod = String(shipment.shipping_method || shipment.type || "").toLowerCase();

        if (!["flex", "correo"].includes(shippingMethod)) {
          continue;
        }

        const quantity = Math.max(0, Number(shipment.quantity ?? 1));
        const identifiers = [
          String(shipment.meli_sku ?? "").trim(),
          String(shipment.sku ?? "").trim(),
        ].filter(Boolean);

        if (quantity <= 0 || identifiers.length === 0) {
          stockResults.push({
            shipment_id: shipment.shipment_id,
            success: false,
            error: "Sin SKU para descontar stock",
          });
          continue;
        }

        let applied = null;

        for (const identifier of identifiers) {
          const result = await adjustUnifiedStockByIdentifier({
            supabase,
            identifier,
            quantityDelta: -quantity,
            userId,
            matchBy: identifier === String(shipment.meli_sku ?? "").trim() ? "meli_sku" : "either",
          });

          if (result.matchedRows > 0) {
            applied = result;
            break;
          }
        }

        stockResults.push({
          shipment_id: shipment.shipment_id,
          success: applied !== null,
          result: applied,
        });
      }

      return NextResponse.json({
        success: true,
        saved: rows.length,
        shipment_ids: rows.map((r) => r.shipment_id),
        stock_results: stockResults,
      });
    }

    // ── Compatibilidad con formato legacy (order_ids[]) ──────────────────
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { error: updateError } = await supabase
      .from("meli_orders")
      .update({
        printed: true,
        printed_at: printedAt,
      })
      .in("order_id", legacyOrderIds);

    if (updateError) {
      return NextResponse.json(
        { error: "Error al guardar lote de impresion" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      saved: legacyOrderIds.length,
      order_ids: legacyOrderIds,
    });
  } catch (error) {
    console.error("[meli-labels/save-print-batch] Error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
