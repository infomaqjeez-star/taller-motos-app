import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

// Tablas permitidas (whitelist)
const ALLOWED_TABLES = new Set([
  "reparaciones",
  "stock",
  "repuestos_a_pedir",
  "pagos",
  "plantillas_whatsapp",
  "agenda_clientes",
  "historial_reparaciones",
  "flex_envios",
  "flex_tarifas",
]);

// Tablas que requieren user_id para multi-tenant
const TENANT_TABLES = new Set([
  "reparaciones",
  "stock",
  "repuestos_a_pedir",
  "pagos",
  "plantillas_whatsapp",
  "agenda_clientes",
  "historial_reparaciones",
  "flex_envios",
]);

interface Filter {
  col: string;
  op: string;
  val: unknown;
}

/**
 * POST /api/db
 * 
 * Proxy generico para operaciones CRUD en Supabase.
 * Soporta: select, selectSingle, insert, update, delete, deleteWhere, upsert
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, table, data, id, idCol, filters, order, select, onConflict, ignoreDuplicates } = body;

    // Validar tabla
    if (!table || !ALLOWED_TABLES.has(table)) {
      return NextResponse.json(
        { error: `Tabla no permitida: ${table}` },
        { status: 400 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { error: "Accion requerida" },
        { status: 400 }
      );
    }

    // Auth (opcional por ahora - algunas paginas no envian auth header desde client-side dbCall)
    let userId: string | null = null;
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
      if (user) userId = user.id;
    }

    // Ejecutar accion
    switch (action) {
      case "select": {
        let query = supabase.from(table).select(select || "*");
        
        // Aplicar filtros
        if (filters && Array.isArray(filters)) {
          for (const f of filters as Filter[]) {
            if (f.op === "eq") {
              query = query.eq(f.col, f.val);
            } else if (f.op === "not.is") {
              query = query.not(f.col, "is", f.val);
            } else if (f.op === "maybeSingle") {
              // maybeSingle se aplica al final, no como filtro
              continue;
            }
          }
        }

        // Aplicar orden
        if (order?.col) {
          query = query.order(order.col, { ascending: order.asc ?? true });
        }

        // Verificar si es maybeSingle
        const isMaybeSingle = filters?.some((f: Filter) => f.op === "maybeSingle");
        if (isMaybeSingle) {
          const { data: result, error } = await query.maybeSingle();
          if (error) return NextResponse.json({ error: error.message }, { status: 500 });
          return NextResponse.json({ data: result });
        }

        const { data: result, error } = await query;
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ data: result });
      }

      case "selectSingle": {
        let query = supabase.from(table).select(select || "*");
        if (filters && Array.isArray(filters)) {
          for (const f of filters as Filter[]) {
            if (f.op === "eq") query = query.eq(f.col, f.val);
          }
        }
        const { data: result, error } = await query.single();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ data: result });
      }

      case "insert": {
        if (!data) return NextResponse.json({ error: "Data requerida" }, { status: 400 });
        const { error } = await supabase.from(table).insert(data);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
      }

      case "update": {
        if (!data) return NextResponse.json({ error: "Data requerida" }, { status: 400 });
        const col = idCol || "id";
        if (!id) return NextResponse.json({ error: "ID requerido para update" }, { status: 400 });
        const { error: updateError } = await (supabase.from(table).update(data) as any).eq(col, id);
        if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
        return NextResponse.json({ success: true });
      }

      case "delete": {
        if (!id) return NextResponse.json({ error: "ID requerido para delete" }, { status: 400 });
        const { error } = await supabase.from(table).delete().eq("id", id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
      }

      case "deleteWhere": {
        if (!filters || !Array.isArray(filters)) {
          return NextResponse.json({ error: "Filtros requeridos para deleteWhere" }, { status: 400 });
        }
        // Build filter conditions for delete
        const deleteFilters = (filters as Filter[]).filter(f => f.op === "eq");
        if (deleteFilters.length === 0) {
          return NextResponse.json({ error: "Al menos un filtro eq requerido" }, { status: 400 });
        }
        // Use first filter, chain rest
        let delQuery = supabase.from(table).delete().eq(deleteFilters[0].col, deleteFilters[0].val as string);
        for (let i = 1; i < deleteFilters.length; i++) {
          delQuery = delQuery.eq(deleteFilters[i].col, deleteFilters[i].val as string);
        }
        const { error: delError } = await delQuery;
        if (delError) return NextResponse.json({ error: delError.message }, { status: 500 });
        return NextResponse.json({ success: true });
      }

      case "upsert": {
        if (!data) return NextResponse.json({ error: "Data requerida" }, { status: 400 });
        const opts: { onConflict?: string; ignoreDuplicates?: boolean } = {};
        if (onConflict) opts.onConflict = onConflict;
        if (ignoreDuplicates !== undefined) opts.ignoreDuplicates = ignoreDuplicates;
        const { error } = await supabase.from(table).upsert(data, opts);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { error: `Accion no soportada: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[api/db] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno" },
      { status: 500 }
    );
  }
}
