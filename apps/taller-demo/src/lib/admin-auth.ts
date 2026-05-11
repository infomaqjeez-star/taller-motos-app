import { jwtVerify, SignJWT } from "jose";
import { getSupabaseServer } from "./supabase-server";

const SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "fallback-secret"
);

export async function createAdminToken(adminId: string, email: string) {
  return new SignJWT({ admin_id: adminId, email, type: "admin_session" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(SECRET);
}

export async function verifyAdminToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET, { clockTolerance: 60 });
    if (payload.type !== "admin_session" || !payload.admin_id) return null;

    const supabase = getSupabaseServer();
    const { data: admin } = await supabase
      .from("admins_catalogo")
      .select("id, nombre, email, estado, totp_enabled, totp_secret")
      .eq("id", payload.admin_id)
      .eq("estado", "activo")
      .single();

    return admin || null;
  } catch {
    return null;
  }
}

export async function getAdminFromRequest(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "").trim();
  if (!token) return null;
  return verifyAdminToken(token);
}
