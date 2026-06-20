import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Rutas accesibles sin sesión (catálogo público, login, legales, robots/sitemap, etc). */
function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith("/catalogo")) return true;
  /* APIs públicas */
  if (pathname.startsWith("/api/catalogo")) return true;
  if (pathname.startsWith("/api/admin")) return true;
  if (pathname.startsWith("/api/vendedor")) return true;
  if (pathname.startsWith("/api/cliente")) return true;
  if (pathname.startsWith("/api/pedidos")) return true;
  if (pathname.startsWith("/api/comprobante")) return true;
  if (pathname.startsWith("/api/health")) return true;
  if (pathname.startsWith("/api/auth")) return true;
  /* Auth flows */
  if (pathname.startsWith("/login")) return true;
  if (pathname.startsWith("/register")) return true;
  if (pathname.startsWith("/auth")) return true;
  /* Landing y ayuda */
  if (pathname.startsWith("/landing")) return true;
  if (pathname.startsWith("/ayuda")) return true;
  if (pathname.startsWith("/blog")) return true;
  if (pathname.startsWith("/api/blog")) return true;
  if (pathname === "/feed.xml") return true;
  /* SEO + crawlers + well-known */
  if (pathname === "/robots.txt" || pathname === "/sitemap.xml" || pathname === "/llms.txt" || pathname === "/ads.txt") return true;
  if (pathname.startsWith("/.well-known")) return true;
  /* Imagenes generadas por Next 14 Metadata API (sin extension) */
  if (pathname === "/icon" || pathname === "/apple-icon" || pathname === "/opengraph-image" || pathname === "/twitter-image") return true;
  /* Archivos de verificacion de search engines (Google Search Console, Bing, etc) */
  if (/^\/google[a-f0-9]{16}\.html$/.test(pathname)) return true;
  if (/^\/BingSiteAuth\.xml$/.test(pathname)) return true;
  if (/^\/yandex_[a-f0-9]+\.html$/.test(pathname)) return true;
  const legal = ["/terminos", "/privacidad", "/cookies", "/cancelacion"];
  if (legal.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const response = NextResponse.next({ request: { headers: request.headers } });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon || url.includes("placeholder") || anon.includes("placeholder")) {
    return response;
  }

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options as never);
        });
      },
    },
  });

  // getSession renueva el token automáticamente si expiró (usando refresh_token)
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  if (!user && !isPublicPath(pathname)) {
    /* Raíz: mandar a landing (evita bucle / ↔ /login cuando aún no hay sesión) */
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/landing", request.url));
    }
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(login);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|robots.txt|sitemap.xml|llms.txt|ads.txt|feed.xml|icon|apple-icon|opengraph-image|twitter-image|sw\\.js|google[a-f0-9]{16}\\.html|BingSiteAuth\\.xml|yandex_.*\\.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|mp4|woff2?)$).*)",
  ],
};
