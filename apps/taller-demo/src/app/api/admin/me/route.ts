import { NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/admin-auth";

export async function GET(req: Request) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    return NextResponse.json({
      id: admin.id,
      nombre: admin.nombre,
      email: admin.email,
      totp_enabled: admin.totp_enabled,
    });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
