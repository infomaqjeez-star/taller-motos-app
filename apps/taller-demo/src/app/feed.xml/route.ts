import { getAllPosts } from "@/lib/blog/store";

const SITE = "https://appjeezpro.store";

export const revalidate = 60;

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case '"': return "&quot;";
      default: return c;
    }
  });
}

export async function GET() {
  const posts = getAllPosts();
  const lastBuildDate = new Date().toUTCString();

  const items = posts
    .map((p) => {
      const url = `${SITE}/blog/${p.slug}`;
      const pubDate = new Date(p.publishedAt).toUTCString();
      const categories = (p.tags || []).map((t) => `<category>${escapeXml(t)}</category>`).join("");
      return [
        "<item>",
        `<title>${escapeXml(p.title)}</title>`,
        `<link>${url}</link>`,
        `<guid isPermaLink="true">${url}</guid>`,
        `<pubDate>${pubDate}</pubDate>`,
        `<description>${escapeXml(p.description)}</description>`,
        `<content:encoded><![CDATA[${p.content}]]></content:encoded>`,
        p.author ? `<author>noreply@appjeezpro.store (${escapeXml(p.author)})</author>` : "",
        categories,
        "</item>",
      ].join("");
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>Blog MaqJeez</title>
<link>${SITE}/blog</link>
<atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml" />
<description>Artículos para mecánicos y dueños de talleres en Argentina: repuestos, mantenimiento, integración Mercado Libre y novedades del catálogo MaqJeez.</description>
<language>es-AR</language>
<lastBuildDate>${lastBuildDate}</lastBuildDate>
<generator>Next.js</generator>
${items}
</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=3600",
    },
  });
}
