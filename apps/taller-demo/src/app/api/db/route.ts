import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseServiceKey || "placeholder-key"
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, table, data, id, filters, order, select, onConflict, ignoreDuplicates } = body;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Supabase no configurado correctamente" },
        { status: 500 }
      );
    }

    let result: any;

    switch (action) {
      case "select": {
        let query: any = supabase.from(table).select(select || "*");
        
        if (filters && Array.isArray(filters)) {
          for (const f of filters) {
            if (f.op === "eq") query = query.eq(f.col, f.val);
            else if (f.op === "not.is") query = query.not(f.col, "is", f.val);
            else if (f.op === "maybeSingle") query = query.maybeSingle();
          }
        }
        
        if (order) {
          query = query.order(order.col, { ascending: order.asc });
        }
        
        result = await query;
        break;
      }

      case "selectSingle": {
        let query: any = supabase.from(table).select("*");
        
        if (filters && Array.isArray(filters)) {
          for (const f of filters) {
            if (f.op === "eq") query = query.eq(f.col, f.val);
          }
        }
        
        result = await query.single();
        break;
      }

      case "insert": {
        result = await supabase.from(table).insert(data);
        break;
      }

      case "update": {
        let query: any = supabase.from(table).update(data);
        if (id) {
          const idCol = body.idCol || "id";
          query = query.eq(idCol, id);
        }
        result = await query;
        break;
      }

      case "delete": {
        result = await supabase.from(table).delete().eq("id", id);
        break;
      }

      case "deleteWhere": {
        let query: any = supabase.from(table).delete();
        if (filters && Array.isArray(filters)) {
          for (const f of filters) {
            if (f.op === "eq") query = query.eq(f.col, f.val);
          }
        }
        result = await query;
        break;
      }

      case "upsert": {
        result = await supabase.from(table).upsert(data, {
          onConflict: onConflict || "id",
          ignoreDuplicates: ignoreDuplicates ?? false,
        });
        break;
      }

      default:
        return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
    }

    if (result.error) {
      console.error("[API DB] Error:", result.error);
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error("[API DB] Error inesperado:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
