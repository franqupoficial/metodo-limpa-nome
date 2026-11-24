"use server";
import { revalidatePath } from "next/cache";
import { assertAdmin, ForbiddenError } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { storeMedia } from "@/lib/images";
import { deleteObject } from "@/lib/storage";
import { randomToken } from "@/lib/crypto";
import { slugify } from "@/lib/format";
import { bool, fail, int, ok, optStr, str, type ActionState } from "@/lib/action";

async function run(fn: () => Promise<ActionState>): Promise<ActionState> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ForbiddenError) return fail(e.message);
    console.error(e);
    return fail(e instanceof Error ? e.message : "Erro inesperado.");
  }
}

/** Páginas: o texto editado vai para o RASCUNHO; só vai ao ar com "Publicar". */
export async function savePage(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const admin = await assertAdmin("content.manage");
    const id = str(fd, "id") || undefined;
    const title = str(fd, "title");
    if (title.length < 2) return fail("Informe o título.");
    const intent = str(fd, "intent");
    const body = str(fd, "content");
    const f = fd.get("hero");
    const heroImageKey = f instanceof File && f.size > 0 ? (await storeMedia(f, "paginas", admin.id)).key : undefined;
    let slug = slugify(str(fd, "slug") || title);
    if (await prisma.page.findFirst({ where: { slug, NOT: id ? { id } : undefined } })) slug = `${slug}-${randomToken(3).toLowerCase()}`;
    const common = { slug, type: str(fd, "type") || "INSTITUTIONAL", showInFooter: bool(fd, "showInFooter"), position: int(fd, "position") ?? 0, seoTitle: optStr(fd, "seoTitle"), seoDescription: optStr(fd, "seoDescription"), ...(heroImageKey ? { heroImageKey } : {}) };
    const publish = intent === "publish";
    const data = publish
      ? { ...common, title, content: body, draft: null, draftTitle: null, published: true, publishedAt: new Date() }
      : { ...common, draft: body, draftTitle: title, previewToken: randomToken(16) };
    const p = id ? await prisma.page.update({ where: { id }, data }) : await prisma.page.create({ data: { ...data, title, content: publish ? body : "" } });
    await audit(admin.id, publish ? "page.publish" : "page.draft", "Page", p.id);
    revalidatePath(`/p/${p.slug}`);
    return ok(publish ? "Página publicada." : "Rascunho salvo. Use “Pré-visualizar” para conferir antes de publicar.", { redirect: `/admin/conteudo/paginas?editar=${p.id}` });
  });
}

export async function unpublishPage(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const admin = await assertAdmin("content.manage");
    const p = await prisma.page.findUniqueOrThrow({ where: { id: str(fd, "id") } });
    if (str(fd, "op") === "delete") {
      await prisma.page.delete({ where: { id: p.id } });
      await audit(admin.id, "page.delete", "Page", p.id, { meta: { slug: p.slug } });
      return ok("Página excluída.", { redirect: "/admin/conteudo/paginas" });
    }
    await prisma.page.update({ where: { id: p.id }, data: { published: false, draft: p.draft ?? p.content } });
    await audit(admin.id, "page.unpublish", "Page", p.id);
    return ok("Página retirada do ar (mantida como rascunho).");
  });
}

export async function saveHomeSection(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const admin = await assertAdmin("content.manage");
    const id = str(fd, "id");
    const s = await prisma.homeSection.findUniqueOrThrow({ where: { id } });
    const op = str(fd, "op");
    if (op === "up" || op === "down") {
      const all = await prisma.homeSection.findMany({ orderBy: { position: "asc" } });
      const i = all.findIndex((x) => x.id === id);
      const j = op === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= all.length) return ok("");
      [all[i], all[j]] = [all[j], all[i]];
      await prisma.$transaction(all.map((x, k) => prisma.homeSection.update({ where: { id: x.id }, data: { position: k } })));
    } else {
      const f = fd.get("image");
      const imageKey = f instanceof File && f.size > 0 ? (await storeMedia(f, "home", admin.id)).key : undefined;
      const prev = (s.config as Record<string, unknown>) ?? {};
      const config = {
        ...prev,
        limit: int(fd, "limit") ?? (prev.limit as number | undefined),
        text: optStr(fd, "text") ?? undefined,
        ctaLabel: optStr(fd, "ctaLabel") ?? undefined,
        ctaUrl: optStr(fd, "ctaUrl") ?? undefined,
        refs: str(fd, "refs") ? str(fd, "refs").split(/[,\s]+/).filter(Boolean) : undefined,
        collectionSlug: optStr(fd, "collectionSlug") ?? undefined,
        ...(imageKey ? { imageKey } : {}),
      };
      await prisma.homeSection.update({ where: { id }, data: { title: optStr(fd, "title"), subtitle: optStr(fd, "subtitle"), active: bool(fd, "active"), config: JSON.parse(JSON.stringify(config)) } });
    }
    await audit(admin.id, "home.section", "HomeSection", id, { meta: { op: op || "save" } });
    revalidatePath("/");
    return ok("Homepage atualizada.");
  });
}

export async function addHomeSection(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const admin = await assertAdmin("content.manage");
    const max = await prisma.homeSection.aggregate({ _max: { position: true } });
    const s = await prisma.homeSection.create({ data: { type: str(fd, "type"), title: optStr(fd, "title"), position: (max._max.position ?? 0) + 1 } });
    await audit(admin.id, "home.add", "HomeSection", s.id);
    return ok("Seção adicionada ao final da homepage.");
  });
}

export async function deleteHomeSection(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const admin = await assertAdmin("content.manage");
    await prisma.homeSection.delete({ where: { id: str(fd, "id") } });
    await audit(admin.id, "home.delete", "HomeSection", str(fd, "id"));
    revalidatePath("/");
    return ok("Seção removida.");
  });
}

export async function saveFaq(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const admin = await assertAdmin("content.manage");
    const id = str(fd, "id");
    if (str(fd, "op") === "delete") {
      await prisma.faqItem.delete({ where: { id } });
      await audit(admin.id, "faq.delete", "FaqItem", id);
      return ok("Pergunta excluída.");
    }
    const data = { question: str(fd, "question"), answer: str(fd, "answer"), group: str(fd, "group") || "Geral", position: int(fd, "position") ?? 0, active: bool(fd, "active") };
    if (!data.question || !data.answer) return fail("Preencha pergunta e resposta.");
    const f = id ? await prisma.faqItem.update({ where: { id }, data }) : await prisma.faqItem.create({ data });
    await audit(admin.id, "faq.save", "FaqItem", f.id);
    revalidatePath("/perguntas-frequentes");
    return ok("Pergunta salva.");
  });
}

export async function uploadMedia(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const admin = await assertAdmin("content.manage");
    const files = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    if (!files.length) return fail("Selecione arquivos.");
    for (const f of files) await storeMedia(f, str(fd, "folder") || "geral", admin.id);
    await audit(admin.id, "media.upload", "Media", undefined, { meta: { n: files.length } });
    return ok(`${files.length} arquivo(s) enviado(s).`);
  });
}

export async function deleteMedia(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const admin = await assertAdmin("content.manage");
    const m = await prisma.media.findUniqueOrThrow({ where: { id: str(fd, "id") } });
    await prisma.media.delete({ where: { id: m.id } });
    await deleteObject(m.key).catch(() => {});
    await deleteObject(m.key.replace(/\.webp$/, "-thumb.webp")).catch(() => {});
    await audit(admin.id, "media.delete", "Media", m.id, { meta: { key: m.key } });
    return ok("Arquivo excluído.");
  });
}
