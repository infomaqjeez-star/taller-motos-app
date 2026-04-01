import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseServiceKey || "placeholder-key"
);

/**
 * Endpoint para asegurar que el bucket 'meli-labels' existe
 * Se puede llamar desde el frontend para inicializar Storage
 */
export async function GET(req: NextRequest) {
  try {
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();

    if (listError) {
      console.error("Error listing buckets:", listError);
      return NextResponse.json(
        { error: "Failed to list buckets", details: listError.message },
        { status: 500 }
      );
    }

    const meliLabelsBucket = buckets?.find(b => b.name === "meli-labels");

    if (meliLabelsBucket) {
      return NextResponse.json({
        success: true,
        message: "Bucket already exists",
        bucket: meliLabelsBucket,
      });
    }

    // Crear bucket si no existe
    const { data: newBucket, error: createError } = await supabaseAdmin.storage.createBucket(
      "meli-labels",
      {
        public: true,
      }
    );

    if (createError) {
      console.error("Error creating bucket:", createError);
      return NextResponse.json(
        { error: "Failed to create bucket", details: createError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Bucket created successfully",
      bucket: newBucket,
    });
  } catch (err) {
    console.error("Init storage error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
