import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rutas publicas que no requieren autenticacion
const PUBLIC_PATHS = ['/login', '/register', '/auth/callback'];
const PUBLIC_PREFIXES = ['/api/auth/', '/_next/', '/favicon.ico', '/sounds/', '/manifest.json'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir rutas publicas
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // Permitir prefijos publicos
  for (const prefix of PUBLIC_PREFIXES) {
    if (pathname.startsWith(prefix)) {
      return NextResponse.next();
    }
  }

  // Permitir archivos estaticos
  if (pathname.match(/\.(jpg|jpeg|png|gif|svg|ico|css|js|woff|woff2|ttf|mp3)$/)) {
    return NextResponse.next();
  }

  // Permitir rutas de API (manejan auth internamente)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Verificar existencia de cookie de sesion Supabase
  const cookies = request.cookies;
  const hasSession = cookies.getAll().some(c => 
    c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
  );

  if (!hasSession) {
    // Redirigir a login con redirectTo para volver despues
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirectTo', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
