import { NextRequest, NextResponse } from "next/server";
import { getAllPosts, publishPost } from "@/lib/blog/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const posts = getAllPosts();
  return NextResponse.json({ posts, count: posts.length });
}

export async function POST(req: NextRequest) {
  const expected = process.env.BLOG_PUBLISH_SECRET;
  const provided = req.headers.get("x-publish-secret");

  if (!expected) {
    return NextResponse.json(
      { error: "Publicación deshabilitada: BLOG_PUBLISH_SECRET no está configurado en el server" },
      { status: 503 },
    );
  }
  if (!provided || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido (debe ser JSON)" }, { status: 400 });
  }

  try {
    const post = publishPost(body as Parameters<typeof publishPost>[0]);
    return NextResponse.json({ ok: true, post }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al publicar";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
