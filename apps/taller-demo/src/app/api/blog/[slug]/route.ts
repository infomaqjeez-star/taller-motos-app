import { NextRequest, NextResponse } from "next/server";
import { getPost } from "@/lib/blog/store";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const post = getPost(params.slug);
  if (!post) {
    return NextResponse.json({ error: "Post no encontrado" }, { status: 404 });
  }
  return NextResponse.json(post);
}
