import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ── CONFIGURACIÓN ──────────────────────────────────────────────
const CLIENT_ID = process.env.NEXT_PUBLIC_MELI_APP_ID ?? "";
const REDIRECT_URI = process.env.MELI_REDIRECT_URI ?? "";

// Scopes requeridos para MaqJeez
const MELI_SCOPES = [
  "read",
  "write",
  "offline_access",
  "questions",
  "orders",
  "items",
  "messages",
  "shipments",
].join(",");

// ── HANDLER PRINCIPAL ──────────────────────────────────────────
export async function GET(request: NextRequest) {
  console.log("[AUTH/LOGIN] Iniciando flujo OAuth");

  // Validar configuración
  if (!CLIENT_ID) {
    console.error("[AUTH/LOGIN] Falta NEXT_PUBLIC_MELI_APP_ID");
    return NextResponse.json(
      { error: "Missing client configuration" },
      { status: 500 }
    );
  }

  if (!REDIRECT_URI) {
    console.error("[AUTH/LOGIN] Falta MELI_REDIRECT_URI");
    return NextResponse.json(
      { error: "Missing redirect configuration" },
      { status: 500 }
    );
  }

  // Obtener user_id de los query params (debe venir del frontend con la sesión del usuario)
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("user_id");

  if (!userId) {
    console.error("[AUTH/LOGIN] Falta user_id - el usuario debe estar logueado");
    return NextResponse.json(
      { error: "User must be logged in to link account" },
      { status: 401 }
    );
  }

  // El state será el user_id para identificar al usuario en el callback
  const state = userId;

  // Construir URL de autorización de MeLi
  const authUrl = new URL("https://auth.mercadolibre.com.ar/authorization");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("scope", MELI_SCOPES);
  authUrl.searchParams.set("state", state);

  console.log("[AUTH/LOGIN] Redirigiendo a MeLi para user_id:", userId);

  // Redirigir al usuario a MeLi
  return NextResponse.redirect(authUrl);
}
