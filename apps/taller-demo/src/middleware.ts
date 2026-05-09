import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Rutas accesibles sin sesión (catálogo público, login, legales, callback OAuth). */
function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith("/catalogo")) return true;
  /* Toda la API pública del catálogo (sin sesión) */
  if (pathname.startsWith("/api/catalogo")) return true;
  if (pathname.startsWith("/login")) return true;
  if (pathname.startsWith("/register")) return true;
  if (pathname.startsWith("/auth")) return true;
  if (pathname.startsWith("/landing")) return true;
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
          response.cookies.set(name, value, options as never);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

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
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
