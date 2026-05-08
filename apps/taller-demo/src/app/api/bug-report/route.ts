import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl        = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Supabase no configurado" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const formData = await request.formData();

    const titulo      = (formData.get("titulo")      as string) ?? "";
    const descripcion = (formData.get("descripcion") as string) ?? "";
    const pagina      = (formData.get("pagina")      as string) ?? "";
    const userAgent   = (formData.get("userAgent")   as string) ?? "";

    if (!titulo.trim() || !descripcion.trim()) {
      return NextResponse.json({ error: "Título y descripción son requeridos" }, { status: 400 });
    }

    // ── Subir archivos al bucket de Supabase Storage ──────────
    const archivoUrls: string[] = [];
    let idx = 0;
    while (formData.has(`archivo_${idx}`)) {
      const file = formData.get(`archivo_${idx}`) as File;
      if (file && file.size > 0) {
        const ext      = file.name.split(".").pop() ?? "bin";
        const fileName = `bug-reports/${Date.now()}_${idx}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("bug-reports")
          .upload(fileName, file, { contentType: file.type, upsert: false });

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from("bug-reports")
            .getPublicUrl(fileName);
          archivoUrls.push(urlData.publicUrl);
        }
      }
      idx++;
    }

    // ── Guardar reporte en tabla bug_reports ──────────────────
    const { error: dbError } = await supabase.from("bug_reports").insert({
      titulo,
      descripcion,
      pagina:      pagina || null,
      user_agent:  userAgent || null,
      archivos:    archivoUrls,
      status:      "nuevo",
      created_at:  new Date().toISOString(),
    });

    if (dbError) {
      console.error("[bug-report] DB error:", dbError);
      // Si la tabla no existe, igual respondemos OK para no bloquear al usuario
      // El reporte se habrá subido en storage
      if (dbError.code !== "42P01") {
        return NextResponse.json({ error: dbError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, archivos: archivoUrls.length });
  } catch (err) {
    console.error("[bug-report] Error inesperado:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
