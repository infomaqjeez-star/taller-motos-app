import type { MetadataRoute } from "next";

const BASE = "https://appjeezpro.store";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Crawlers estandar (Google, Bing, DuckDuckGo, etc.)
      {
        userAgent: "*",
        allow: ["/", "/catalogo", "/landing", "/ayuda", "/terminos", "/privacidad", "/cookies", "/cancelacion"],
        disallow: [
          "/api/",
          "/login",
          "/register",
          "/auth",
          "/taller",
          "/ventas",
          "/inventario",
          "/tareas",
          "/agenda",
          "/correo",
          "/etiquetas",
          "/historial-etiquetas",
          "/flex",
          "/sincronizar",
          "/publicaciones",
          "/promociones",
          "/precios",
          "/estadisticas",
          "/reportes",
          "/post-venta",
          "/mensajes",
          "/configuracion",
          "/test",
          "/catalogo/admin",
          "/catalogo/cliente/dashboard",
          "/catalogo/vendedor/dashboard",
          "/catalogo/vendedor/gerente",
          "/catalogo/checkout",
        ],
      },

      // AI crawlers respetables: permitidos para que el sitio aparezca
      // en ChatGPT, Claude, Perplexity, Gemini y respuestas AI de Google.
      // El user puede cambiar a `disallow: ["/"]` si prefiere bloquearlos.
      { userAgent: "GPTBot", allow: ["/catalogo", "/landing", "/ayuda"], disallow: ["/api/", "/login", "/auth"] },
      { userAgent: "OAI-SearchBot", allow: ["/catalogo", "/landing", "/ayuda"], disallow: ["/api/"] },
      { userAgent: "ChatGPT-User", allow: ["/catalogo", "/landing", "/ayuda"], disallow: ["/api/"] },
      { userAgent: "ClaudeBot", allow: ["/catalogo", "/landing", "/ayuda"], disallow: ["/api/", "/login", "/auth"] },
      { userAgent: "Claude-Web", allow: ["/catalogo", "/landing", "/ayuda"], disallow: ["/api/"] },
      { userAgent: "anthropic-ai", allow: ["/catalogo", "/landing", "/ayuda"], disallow: ["/api/"] },
      { userAgent: "Google-Extended", allow: ["/catalogo", "/landing", "/ayuda"], disallow: ["/api/"] },
      { userAgent: "PerplexityBot", allow: ["/catalogo", "/landing", "/ayuda"], disallow: ["/api/", "/login", "/auth"] },
      { userAgent: "Applebot-Extended", allow: ["/catalogo", "/landing", "/ayuda"], disallow: ["/api/"] },
      { userAgent: "CCBot", allow: ["/catalogo", "/landing", "/ayuda"], disallow: ["/api/", "/login"] },

      // Scrapers conocidos: bloqueados completamente
      { userAgent: "Bytespider", disallow: "/" },
      { userAgent: "ImagesiftBot", disallow: "/" },
      { userAgent: "DataForSeoBot", disallow: "/" },
      { userAgent: "SemrushBot", disallow: "/" },
      { userAgent: "AhrefsBot", disallow: "/" },
      { userAgent: "MJ12bot", disallow: "/" },
      { userAgent: "DotBot", disallow: "/" },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
