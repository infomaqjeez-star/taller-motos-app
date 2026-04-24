import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/meli";
import {
  adjustUnifiedStockByIdentifier,
  findLinkedAccount,
  setUnifiedQuantityForRows,
  updateMeliCustomSku,
  updateMeliStockQuantity,
  type UnifiedStockRow,
} from "@/lib/stock";

export const dynamic = "force-dynamic";

async function getAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const supabase = getSupabase();
  const token = authHeader.slice(7);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return user.id;
}

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data: stock, error } = await supabase
      .from("stock_unificado")
      .select("*")
      .order("updated_at", { ascending: false })
      .order("sku", { ascending: true });

    if (error) {
      console.error("[stock] Error obteniendo stock:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ stock: stock || [] });
  } catch (error: any) {
    console.error("[stock] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const sku = String(body.sku ?? "").trim();
    const nombre = String(body.nombre ?? "").trim();
    const cantidad = Math.max(0, Number(body.cantidad ?? 0));
    const precio = Number(body.precio ?? 0);
    const item_id = body.item_id ? String(body.item_id) : null;
    const cuenta_id = body.cuenta_id ? String(body.cuenta_id) : null;
    const meli_sku = body.meli_sku ? String(body.meli_sku).trim() : null;

    if (!sku || !nombre) {
      return NextResponse.json({ error: "SKU y nombre son requeridos" }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from("stock_unificado")
      .select("id, cantidad")
      .eq("sku", sku)
      .maybeSingle();

    let result;

    if (existing) {
      const { data, error } = await supabase
        .from("stock_unificado")
        .update({
          nombre,
          cantidad,
          precio,
          item_id,
          cuenta_id,
          meli_sku,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      result = data;
    } else {
      const { data, error } = await supabase
        .from("stock_unificado")
        .insert({
          sku,
          nombre,
          cantidad,
          precio,
          item_id,
          cuenta_id,
          meli_sku,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      result = data;
    }

    return NextResponse.json({ success: true, item: result });
  } catch (error: any) {
    console.error("[stock] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const userId = await getAuthenticatedUserId(request);
    const body = await request.json();

    const targetId = body.id ? String(body.id) : null;
    const targetSku = body.sku ? String(body.sku) : null;

    if (!targetId && !targetSku) {
      return NextResponse.json({ error: "ID o SKU es requerido" }, { status: 400 });
    }

    let query = supabase.from("stock_unificado").select("*");

    if (targetId) {
      query = query.eq("id", targetId);
    } else {
      query = query.eq("sku", targetSku);
    }

    const { data: row, error: rowError } = await query.single();

    if (rowError || !row) {
      return NextResponse.json({ error: "Item no encontrado" }, { status: 404 });
    }

    const currentRow = row as UnifiedStockRow;
    let newQuantity = Number(currentRow.cantidad || 0);

    if (body.cantidad_vendida !== undefined) {
      newQuantity = Math.max(0, newQuantity - Number(body.cantidad_vendida || 0));
    } else if (body.cantidad_delta !== undefined) {
      newQuantity = Math.max(0, newQuantity + Number(body.cantidad_delta || 0));
    } else if (body.cantidad !== undefined) {
      newQuantity = Math.max(0, Number(body.cantidad || 0));
    }

    const quantityChanged = newQuantity !== Number(currentRow.cantidad || 0);

    if (quantityChanged && body.apply_to_all_same_meli_sku === true) {
      const targetMeliSku = String(body.meli_sku ?? currentRow.meli_sku ?? "").trim();

      if (!targetMeliSku) {
        return NextResponse.json(
          { error: "No hay SKU de identificación para propagar stock" },
          { status: 400 }
        );
      }

      const { data: relatedRows, error: relatedRowsError } = await supabase
        .from("stock_unificado")
        .select("*")
        .eq("meli_sku", targetMeliSku);

      if (relatedRowsError) {
        throw relatedRowsError;
      }

      await setUnifiedQuantityForRows({
        supabase,
        rows: (relatedRows ?? []) as UnifiedStockRow[],
        newQuantity,
        userId,
      });
    } else if (quantityChanged && body.apply_to_all_same_sku === true) {
      const targetInternalSku = String(body.sku ?? currentRow.sku ?? "").trim();

      if (!targetInternalSku) {
        return NextResponse.json({ error: "No hay SKU para propagar stock" }, { status: 400 });
      }

      const { data: relatedRows, error: relatedRowsError } = await supabase
        .from("stock_unificado")
        .select("*")
        .eq("sku", targetInternalSku);

      if (relatedRowsError) {
        throw relatedRowsError;
      }

      await setUnifiedQuantityForRows({
        supabase,
        rows: (relatedRows ?? []) as UnifiedStockRow[],
        newQuantity,
        userId,
      });
    } else if (quantityChanged && currentRow.item_id && currentRow.cuenta_id) {
      const linkedAccount = await findLinkedAccount(supabase, String(currentRow.cuenta_id), userId);

      if (!linkedAccount) {
        return NextResponse.json(
          { error: "No se encontró la cuenta vinculada para sincronizar stock" },
          { status: 404 }
        );
      }

      await updateMeliStockQuantity(linkedAccount, String(currentRow.item_id), newQuantity);
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      cantidad: newQuantity,
    };

    if (body.nombre !== undefined) updatePayload.nombre = String(body.nombre ?? "");
    if (body.precio !== undefined) updatePayload.precio = Number(body.precio || 0);
    if (body.item_id !== undefined) updatePayload.item_id = body.item_id ? String(body.item_id) : null;
    if (body.cuenta_id !== undefined)
      updatePayload.cuenta_id = body.cuenta_id ? String(body.cuenta_id) : null;
    if (body.meli_sku !== undefined)
      updatePayload.meli_sku = body.meli_sku ? String(body.meli_sku).trim() : null;
    if (body.sku !== undefined) updatePayload.sku = String(body.sku ?? "").trim();

    const { data, error } = await supabase
      .from("stock_unificado")
      .update(updatePayload)
      .eq("id", currentRow.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    if (
      body.push_meli_sku === true &&
      body.meli_sku !== undefined &&
      data?.item_id &&
      data?.cuenta_id
    ) {
      const linkedAccount = await findLinkedAccount(supabase, String(data.cuenta_id), userId);

      if (!linkedAccount) {
        return NextResponse.json(
          { error: "No se encontró la cuenta vinculada para actualizar el SKU en MeLi" },
          { status: 404 }
        );
      }

      await updateMeliCustomSku(linkedAccount, String(data.item_id), String(body.meli_sku));
    }

    return NextResponse.json({
      success: true,
      item: data,
      mensaje: `Stock actualizado: ${currentRow.cantidad} → ${newQuantity}`,
    });
  } catch (error: any) {
    console.error("[stock] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const userId = await getAuthenticatedUserId(request);
    const body = await request.json();
    const action = String(body.action ?? "").trim();

    if (action === "discount-sale") {
      const rawItems = Array.isArray(body.items) ? body.items : [body];
      const results = [];

      for (const rawItem of rawItems) {
        const quantity = Math.max(
          0,
          Number(rawItem.quantity ?? rawItem.cantidad ?? rawItem.cantidad_vendida ?? 0)
        );
        const candidates = [
          {
            identifier: String(rawItem.meli_sku ?? "").trim(),
            matchBy: "meli_sku" as const,
          },
          {
            identifier: String(rawItem.sku ?? "").trim(),
            matchBy: "sku" as const,
          },
        ].filter((candidate) => candidate.identifier.length > 0);

        if (quantity <= 0 || candidates.length === 0) {
          results.push({
            success: false,
            sku: rawItem.sku ?? null,
            meli_sku: rawItem.meli_sku ?? null,
            quantity,
            error: "No hay identificador o cantidad válida",
          });
          continue;
        }

        let appliedResult:
          | {
              identifier: string | null;
              matchedRows: number;
              updatedRows: number;
              newQuantity: number | null;
            }
          | null = null;

        for (const candidate of candidates) {
          const currentResult = await adjustUnifiedStockByIdentifier({
            supabase,
            identifier: candidate.identifier,
            quantityDelta: -quantity,
            userId,
            matchBy: candidate.matchBy,
          });

          if (currentResult.matchedRows > 0) {
            appliedResult = currentResult;
            break;
          }
        }

        results.push({
          success: appliedResult !== null,
          sku: rawItem.sku ?? null,
          meli_sku: rawItem.meli_sku ?? null,
          quantity,
          result: appliedResult,
        });
      }

      return NextResponse.json({
        success: true,
        results,
      });
    }

    if (action === "bulk-assign-meli-sku") {
      const assignments = Array.isArray(body.assignments) ? body.assignments : [];

      if (assignments.length === 0) {
        return NextResponse.json({ error: "No hay asignaciones para procesar" }, { status: 400 });
      }

      const updated = [];
      const errors = [];

      for (const entry of assignments) {
        const stockId = String(entry.id ?? "").trim();
        const itemId = String(entry.item_id ?? "").trim();
        const cuentaId = String(entry.cuenta_id ?? "").trim();
        const meliSku = String(entry.meli_sku ?? "").trim();

        if (!stockId || !itemId || !cuentaId || !meliSku) {
          errors.push({
            id: stockId || itemId || Math.random().toString(36).slice(2),
            error: "Faltan datos para asignar SKU",
          });
          continue;
        }

        try {
          const linkedAccount = await findLinkedAccount(supabase, cuentaId, userId);

          if (!linkedAccount) {
            throw new Error("Cuenta no encontrada");
          }

          await updateMeliCustomSku(linkedAccount, itemId, meliSku);

          const { error: updateError } = await supabase
            .from("stock_unificado")
            .update({
              meli_sku: meliSku,
              updated_at: new Date().toISOString(),
            })
            .eq("id", stockId);

          if (updateError) {
            throw updateError;
          }

          updated.push({
            id: stockId,
            item_id: itemId,
            cuenta_id: cuentaId,
            meli_sku: meliSku,
          });
        } catch (assignmentError) {
          errors.push({
            id: stockId,
            item_id: itemId,
            error:
              assignmentError instanceof Error
                ? assignmentError.message
                : "Error actualizando SKU",
          });
        }
      }

      return NextResponse.json({
        success: errors.length === 0,
        updated,
        errors,
      });
    }

    return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
  } catch (error: any) {
    console.error("[stock PATCH] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const sku = searchParams.get("sku");

    if (!sku) {
      return NextResponse.json({ error: "SKU es requerido" }, { status: 400 });
    }

    const { error } = await supabase.from("stock_unificado").delete().eq("sku", sku);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, mensaje: `Item ${sku} eliminado` });
  } catch (error: any) {
    console.error("[stock] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}