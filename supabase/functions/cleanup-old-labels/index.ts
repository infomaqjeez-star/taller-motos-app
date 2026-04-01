import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.26.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase credentials");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req: Request) => {
  // Validar que es una solicitud interna (opcional, pero recomendado)
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.includes("Bearer")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  try {
    // Calcular fecha de corte: 60 días atrás
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const cutoffDate = sixtyDaysAgo.toISOString();

    // 1. Obtener rutas de archivos a eliminar
    const { data: recordsToDelete, error: fetchError } = await supabase
      .from("printed_labels")
      .select("file_path")
      .lt("print_date", cutoffDate);

    if (fetchError) {
      throw new Error(`Database fetch error: ${fetchError.message}`);
    }

    if (!recordsToDelete || recordsToDelete.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No records to delete",
          deletedCount: 0,
        }),
        { status: 200 }
      );
    }

    // 2. Eliminar archivos del Storage
    let filesDeleted = 0;
    for (const record of recordsToDelete) {
      if (!record.file_path) continue;

      try {
        // Extraer ruta relativa del bucket (URL pública)
        const urlParts = new URL(record.file_path);
        const filePath = urlParts.pathname.split("/storage/v1/object/public/meli-labels/")[1];

        if (filePath) {
          const { error: deleteError } = await supabase.storage
            .from("meli-labels")
            .remove([filePath]);

          if (!deleteError) {
            filesDeleted++;
          }
        }
      } catch (err) {
        console.warn(`Failed to delete file: ${record.file_path}`, err);
      }
    }

    // 3. Eliminar registros de la base de datos
    const { error: deleteRecordsError } = await supabase
      .from("printed_labels")
      .delete()
      .lt("print_date", cutoffDate);

    if (deleteRecordsError) {
      throw new Error(`Database delete error: ${deleteRecordsError.message}`);
    }

    const recordsDeleted = recordsToDelete.length;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleanup completed: deleted ${filesDeleted} files and ${recordsDeleted} database records`,
        filesDeleted,
        recordsDeleted,
        cutoffDate,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Cleanup error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
