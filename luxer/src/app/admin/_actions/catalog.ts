"use server";
import { revalidatePath } from "next/cache";
import { assertAdmin, ForbiddenError } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit, diff } from "@/lib/audit";
import { storeMedia } from "@/lib/images";
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

async function slugFor(model: "category" | "collection", name: string, given: string, id?: string) {
  const base = slugify(given || name);
  let slug = base, n = 2;
  const find = (s: string) => (model === "category" ? prisma.category.findFirst({ where: { slug: s, NOT: id ? { id } : undefined } }) : prisma.collection.findFirst({ where: { slug: s, NOT: id ? { id } : undefined } }));
  while (await find(slug)) slug = `${base}-${n++}`;
  return slug;
}

async function maybeImage(fd: FormData, adminId: string) {
  const f = fd.get("image");
  if (f instanceof File && f.size > 0) return (await storeMedia(f, "categorias", adminId)).key;
  return undefined;
}

export async function saveCategory(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const admin = await assertAdmin("categories.manage");
    const id = str(fd, "id") || undefined;
    const name = str(fd, "name");
    if (name.length < 2) return fail("Informe o nome.");
    const parentId = optStr(fd, "parentId");
    if (id && parentId === id) return fail("Uma categoria não pode ser subcategoria dela mesma.");
    if (parentId) {
      const parent = await prisma.category.findUnique({ where: { id: parentId } });
      if (parent?.parentId) return fail("Use no máximo dois níveis (categoria › subcategoria).");
    }
    const data = {
      name, parentId, description: optStr(fd, "description"), position: int(fd, "position") ?? 0,
      active: bool(fd, "active"), faith: bool(fd, "faith"), showInMenu: bool(fd, "showInMenu"),
      seoTitle: optStr(fd, "seoTitle"), seoDescription: optStr(fd, "seoDescription"),
      slug: await slugFor("category", name, str(fd, "slug"), id),
    };
    const image = await maybeImage(fd, admin.id);
    const before = id ? await prisma.category.findUnique({ where: { id } }) : null;
    const c = id ? await prisma.category.update({ where: { id }, data: { ...data, ...(image ? { image } : {}) } }) : await prisma.category.create({ data: { ...data, image } });
    await audit(admin.id, id ? "category.update" : "category.create", "Category", c.id, { changes: diff(before as never, c as never) });
    revalidatePath("/admin/categorias");
    return ok("Categoria salva.", id ? undefined : { redirect: "/admin/categorias" });
  });
}

export async function deleteCategory(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const admin = await assertAdmin("categories.manage");
    const c = await prisma.category.findUniqueOrThrow({ where: { id: str(fd, "id") }, include: { _count: { select: { products: true, children: true } } } });
    if (c._count.children) return fail("Remova ou mova as subcategorias antes.");
    if (c._count.products) return fail(`Há ${c._count.products} produto(s) nesta categoria. Mova-os ou desative a categoria.`);
    await prisma.category.delete({ where: { id: c.id } });
    await audit(admin.id, "category.delete", "Category", c.id, { meta: { name: c.name } });
    return ok("Categoria excluída.", { redirect: "/admin/categorias" });
  });
}

export async function saveCollection(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const admin = await assertAdmin("categories.manage");
    const id = str(fd, "id") || undefined;
    const name = str(fd, "name");
    if (name.length < 2) return fail("Informe o nome.");
    const data = {
      name, headline: optStr(fd, "headline"), description: optStr(fd, "description"), active: bool(fd, "active"), faith: bool(fd, "faith"),
      featured: bool(fd, "featured"), position: int(fd, "position") ?? 0, seoTitle: optStr(fd, "seoTitle"), seoDescription: optStr(fd, "seoDescription"),
      slug: await slugFor("collection", name, str(fd, "slug"), id),
    };
    const image = await maybeImage(fd, admin.id);
    const c = id ? await prisma.collection.update({ where: { id }, data: { ...data, ...(image ? { image } : {}) } }) : await prisma.collection.create({ data: { ...data, image } });
    // produtos por referência/SKU, na ordem informada
    const codes = str(fd, "products").split(/[,\s]+/).filter(Boolean);
    if (fd.has("products")) {
      const prods = codes.length ? await prisma.product.findMany({ where: { OR: [{ ref: { in: codes } }, { sku: { in: codes } }] }, select: { id: true, ref: true, sku: true } }) : [];
      const ordered = [...new Set(codes.map((code) => prods.find((p) => p.ref === code || p.sku === code)?.id).filter(Boolean) as string[])];
      await prisma.$transaction([
        prisma.collectionProduct.deleteMany({ where: { collectionId: c.id } }),
        prisma.collectionProduct.createMany({ data: ordered.map((productId, position) => ({ collectionId: c.id, productId, position })) }),
      ]);
      const missing = codes.filter((code) => !prods.some((p) => p.ref === code || p.sku === code));
      await audit(admin.id, id ? "collection.update" : "collection.create", "Collection", c.id);
      if (missing.length) return ok(`Coleção salva. Referências não encontradas: ${missing.join(", ")}`);
    }
    revalidatePath("/admin/categorias/colecoes");
    return ok("Coleção salva.", id ? undefined : { redirect: `/admin/categorias/colecoes?editar=${c.id}` });
  });
}

export async function deleteCollection(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const admin = await assertAdmin("categories.manage");
    await prisma.collection.delete({ where: { id: str(fd, "id") } });
    await audit(admin.id, "collection.delete", "Collection", str(fd, "id"));
    return ok("Coleção excluída.", { redirect: "/admin/categorias/colecoes" });
  });
}
