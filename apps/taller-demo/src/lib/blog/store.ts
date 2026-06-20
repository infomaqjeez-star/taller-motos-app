import fs from "node:fs";
import path from "node:path";

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  excerpt?: string;
  content: string; // markdown / html
  coverImage?: string;
  author?: string;
  tags?: string[];
  category?: string;
  publishedAt: string; // ISO
  updatedAt?: string; // ISO
  readingTime: number; // minutos
  draft?: boolean;
};

const DATA_FILE = path.join(process.cwd(), "data", "blog.json");

function ensureFile(): void {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]", "utf-8");
  }
}

function readAll(): BlogPost[] {
  try {
    ensureFile();
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? (data as BlogPost[]) : [];
  } catch {
    return [];
  }
}

function writeAll(posts: BlogPost[]): void {
  ensureFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(posts, null, 2), "utf-8");
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function calcReadingTime(text: string, wordsPerMinute = 220): number {
  const plain = text.replace(/<[^>]+>/g, " ").replace(/[#*_`>\-]/g, " ");
  const words = plain.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / wordsPerMinute));
}

export function getAllPosts(opts?: { includeDrafts?: boolean }): BlogPost[] {
  const includeDrafts = opts?.includeDrafts === true;
  const all = readAll();
  return all
    .filter((p) => includeDrafts || !p.draft)
    .sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""));
}

export function getPost(slug: string): BlogPost | null {
  const all = readAll();
  return all.find((p) => p.slug === slug) || null;
}

export type PublishInput = Partial<BlogPost> & { title: string; content: string };

export function publishPost(input: PublishInput): BlogPost {
  if (!input.title || !input.title.trim()) throw new Error("title es obligatorio");
  if (!input.content || !input.content.trim()) throw new Error("content es obligatorio");

  const all = readAll();
  const now = new Date().toISOString();

  let slug = input.slug?.trim() ? slugify(input.slug) : slugify(input.title);
  if (!slug) slug = `post-${Date.now()}`;
  // Si ya existe, sufijo numerico
  if (all.some((p) => p.slug === slug)) {
    let i = 2;
    while (all.some((p) => p.slug === `${slug}-${i}`)) i++;
    slug = `${slug}-${i}`;
  }

  const description =
    (input.description && input.description.trim()) ||
    (input.excerpt && input.excerpt.trim()) ||
    input.content.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").slice(0, 155).trim();

  const post: BlogPost = {
    slug,
    title: input.title.trim(),
    description,
    excerpt: (input.excerpt && input.excerpt.trim()) || description,
    content: input.content,
    coverImage: input.coverImage,
    author: input.author?.trim() || "Equipo MaqJeez",
    tags: Array.isArray(input.tags) ? input.tags.filter(Boolean) : [],
    category: input.category?.trim() || "General",
    publishedAt: input.publishedAt || now,
    updatedAt: now,
    readingTime: calcReadingTime(input.content),
    draft: !!input.draft,
  };

  all.push(post);
  writeAll(all);
  return post;
}
