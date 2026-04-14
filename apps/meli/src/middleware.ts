import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rutas publicas que no requieren autenticacion
const PUBLIC_PATHS = ['/login', '/register', '/auth/callback'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir rutas publicas
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // Auth se maneja client-side con Supabase JS (localStorage)
  // Cada pagina y API route verifica la sesion internamente
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
