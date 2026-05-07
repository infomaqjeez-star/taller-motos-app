import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { generateId } from "@/lib/utils";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseServiceKey || "placeholder-key"
);

// GET /api/tareas - Listar tareas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const empleado = searchParams.get("empleado");

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Supabase no configurado correctamente" },
        { status: 500 }
      );
    }

    let result: any;

    switch (action) {
      case "count_pendientes": {
        const { data, error } = await supabase
          .from("tareas")
          .select("id", { count: "exact", head: true })
          .eq("status", "pendiente");
        if (error) throw error;
        return NextResponse.json({ count: data?.length ?? 0 });
      }

      case "count_nuevas": {
        const { data, error } = await supabase
          .from("tareas")
          .select("id", { count: "exact", head: true })
          .eq("vista", false);
        if (error) throw error;
        return NextResponse.json({ count: data?.length ?? 0 });
      }

      default: {
        let query = supabase
          .from("tareas")
          .select("*")
          .order("creada_en", { ascending: false });

        if (empleado) {
          query = query.eq("asignado_a", empleado);
        }

        result = await query;
      }
    }

    if (result.error) {
      console.error("[API Tareas] Error:", result.error);
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("[API Tareas] Error inesperado:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 }
    );
  }
}

// POST /api/tareas - Crear, actualizar, iniciar, completar, marcar vistas o eliminar tarea
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, tarea, id, ids } = body;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Supabase no configurado correctamente" },
        { status: 500 }
      );
    }

    let result: any;

    switch (action) {
      case "create": {
        const { titulo, descripcion, asignadoA, prioridad } = tarea;
        const now = new Date().toISOString();
        
        result = await supabase
          .from("tareas")
          .insert({
            id: generateId(),
            titulo,
            descripcion,
            asignado_a: asignadoA,
            status: "pendiente",
            creada_en: now,
            vista: false,
            prioridad: prioridad || "media",
          })
          .select()
          .single();
        break;
      }

      case "update": {
        const { id: tareaId, titulo, descripcion, asignadoA, prioridad } = tarea;
        
        result = await supabase
          .from("tareas")
          .update({
            titulo,
            descripcion,
            asignado_a: asignadoA,
            prioridad,
          })
          .eq("id", tareaId);
        break;
      }

      case "iniciar": {
        result = await supabase
          .from("tareas")
          .update({
            status: "en_progreso",
            iniciada_en: new Date().toISOString(),
          })
          .eq("id", id);
        break;
      }

      case "completar": {
        result = await supabase
          .from("tareas")
          .update({
            status: "completada",
            completada_en: new Date().toISOString(),
          })
          .eq("id", id);
        break;
      }

      case "marcar_vistas": {
        result = await supabase
          .from("tareas")
          .update({ vista: true })
          .in("id", ids);
        break;
      }

      case "delete": {
        result = await supabase
          .from("tareas")
          .delete()
          .eq("id", id);
        break;
      }

      default: {
        return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
      }
    }

    if (result.error) {
      console.error("[API Tareas] Error:", result.error);
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API Tareas] Error inesperado:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
