import { NextResponse, type NextRequest } from "next/server";

// Middleware simplificado - la autenticación se maneja en las páginas/APIs
export async function middleware(request: NextRequest) {
  // Por ahora, dejamos que las páginas manejen su propia autenticación
  // Esto evita problemas de compatibilidad con @supabase/ssr
  return NextResponse.next();
}

// Configurar en qué rutas se ejecuta el middleware
export const config = {
  matcher: [
    "/",
    "/login",
    "/register",
    "/estadisticas/:path*",
    "/mensajes/:path*",
    "/etiquetas/:path*",
    "/publicaciones/:path*",
    "/sincronizar/:path*",
    "/precios/:path*",
    "/promociones/:path*",
    "/post-venta/:path*",
    "/configuracion/:path*",
  ],
};
