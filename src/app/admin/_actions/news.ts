"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { safeImageUrl, uploadPublicImage } from "@/lib/media";
import { slugify } from "@/lib/format";
import { isNewsCategory } from "@/content/news-categories";
import { bool, fail, ok, str, type ActionState } from "@/lib/action";

const schema = z.object({
  title: z.string().min(5, "Título muito curto.").max(160),
  subtitle: z.string().min(10, "Subtítulo muito curto.").max(300),
  content: z.string().min(50, "Conteúdo muito curto.").max(60000),
  category: z.string().refine(isNewsCategory, "Categoria inválida."),
  author: z.string().min(2, "Informe o autor/editor.").max(100),
});

export async function saveNewsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = str(fd, "id");
  const parsed = schema.safeParse({ title: str(fd, "title"), subtitle: str(fd, "subtitle"), content: String(fd.get("content") ?? "").trim(), category: str(fd, "category"), author: str(fd, "author") });
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  let imageUrl = safeImageUrl(str(fd, "imageUrl"));
  if (str(fd, "imageUrl") && !imageUrl) return fail("URL de imagem inválida.");
  const up = await uploadPublicImage(fd.get("image") as File | null, str(fd, "imageAlt"));
  if (up && "error" in up) return fail(up.error);
  if (up) imageUrl = up.url;

  let slug = slugify(str(fd, "slug") || parsed.data.title);
  if (await prisma.newsPost.findFirst({ where: { slug, NOT: id ? { id } : undefined } })) slug = `${slug}-${Date.now().toString(36)}`;
  const published = bool(fd, "published");
  const pubDate = str(fd, "publishedAt") ? new Date(str(fd, "publishedAt")) : null;
  const existing = id ? await prisma.newsPost.findUnique({ where: { id } }) : null;

  const data = {
    ...parsed.data, slug, imageUrl, imageAlt: str(fd, "imageAlt").slice(0, 200) || null,
    related: str(fd, "related").split(/[\s,]+/).map((s) => slugify(s)).filter(Boolean).slice(0, 6),
    seoTitle: str(fd, "seoTitle").slice(0, 70) || null,
    seoDescription: str(fd, "seoDescription").slice(0, 170) || null,
    published,
    publishedAt: published ? (pubDate && !Number.isNaN(pubDate.getTime()) ? pubDate : existing?.publishedAt ?? new Date()) : existing?.publishedAt ?? null,
  };
  const saved = id ? await prisma.newsPost.update({ where: { id }, data }) : await prisma.newsPost.create({ data });
  await audit(admin.id, id ? "news.updated" : "news.created", "NewsPost", saved.id, { published });
  revalidatePath("/noticias", "layout");
  revalidatePath("/");
  if (!id) redirect(`/admin/noticias/${saved.id}?criado=1`);
  return ok(published ? "Notícia salva e publicada." : "Rascunho salvo.");
}

export async function deleteNewsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = str(fd, "id");
  await prisma.newsPost.delete({ where: { id } });
  await audit(admin.id, "news.deleted", "NewsPost", id);
  revalidatePath("/noticias", "layout");
  revalidatePath("/");
  redirect("/admin/noticias?excluida=1");
}
