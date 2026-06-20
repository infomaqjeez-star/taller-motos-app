import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Calendar, User } from "lucide-react";
import { getAllPosts, getPost } from "@/lib/blog/store";

export const revalidate = 60;

const SITE = "https://appjeezpro.store";
const BRAND_ORANGE = "#ea580c";

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = getPost(params.slug);
  if (!post) {
    return { title: "Post no encontrado", robots: { index: false, follow: false } };
  }
  const url = `${SITE}/blog/${post.slug}`;
  const image = post.coverImage || `${SITE}/opengraph-image`;
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      url,
      title: post.title,
      description: post.description,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt || post.publishedAt,
      authors: post.author ? [post.author] : undefined,
      tags: post.tags,
      images: [{ url: image, width: 1200, height: 630, alt: post.title }],
      siteName: "MaqJeez",
      locale: "es_AR",
    },
    twitter: { card: "summary_large_image", title: post.title, description: post.description, images: [image] },
  };
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("es-AR", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return iso;
  }
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug);
  if (!post) notFound();

  const url = `${SITE}/blog/${post.slug}`;
  const image = post.coverImage || `${SITE}/opengraph-image`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    headline: post.title,
    description: post.description,
    image: [image],
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    inLanguage: "es-AR",
    keywords: (post.tags || []).join(", "),
    articleSection: post.category,
    author: {
      "@type": "Person",
      name: post.author || "Equipo MaqJeez",
    },
    publisher: {
      "@type": "Organization",
      name: "MaqJeez",
      logo: { "@type": "ImageObject", url: `${SITE}/icon` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: SITE },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: url },
    ],
  };

  return (
    <main className="min-h-[100dvh] bg-[#0a0a0a] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([jsonLd, breadcrumbLd]) }}
      />

      <div className="mx-auto max-w-3xl px-5 md:px-8 pt-10 pb-20">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Todos los artículos
        </Link>

        <header className="mt-10 mb-10">
          {post.category && (
            <div
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs mb-5"
              style={{ borderColor: `${BRAND_ORANGE}30`, color: BRAND_ORANGE }}
            >
              {post.category}
            </div>
          )}

          <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.1]">
            {post.title}
          </h1>

          {post.description && (
            <p className="mt-5 text-lg text-white/65 leading-relaxed">{post.description}</p>
          )}

          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/45 border-t border-white/5 pt-5">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {fmtDate(post.publishedAt)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {post.readingTime} min lectura
            </span>
            {post.author && (
              <span className="inline-flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                {post.author}
              </span>
            )}
          </div>
        </header>

        {post.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.coverImage}
            alt={post.title}
            className="w-full rounded-2xl border border-white/10 mb-10"
          />
        )}

        <article
          className="prose prose-invert prose-lg max-w-none
                     prose-headings:tracking-tight prose-headings:text-white
                     prose-a:text-orange-500 prose-a:no-underline hover:prose-a:underline
                     prose-strong:text-white
                     prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-[''] prose-code:after:content-['']
                     prose-pre:bg-white/[0.03] prose-pre:border prose-pre:border-white/10
                     prose-blockquote:border-l-orange-500 prose-blockquote:text-white/70
                     prose-img:rounded-xl prose-img:border prose-img:border-white/10
                     prose-hr:border-white/10"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {post.tags && post.tags.length > 0 && (
          <footer className="mt-12 pt-6 border-t border-white/10">
            <div className="flex flex-wrap gap-2">
              {post.tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-white/60"
                >
                  {t}
                </span>
              ))}
            </div>
          </footer>
        )}
      </div>
    </main>
  );
}
