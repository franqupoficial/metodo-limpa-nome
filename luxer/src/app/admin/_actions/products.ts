"use server";
import { revalidatePath } from "next/cache";
import { Prisma, type ProductStatus } from "@prisma/client";
import { assertAdmin, ForbiddenError } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit, diff } from "@/lib/audit";
import { storeImage } from "@/lib/images";
import { deleteObject } from "@/lib/storage";
import { slugify } from "@/lib/format";
import { randomToken } from "@/lib/crypto";
import { bool, dateTime, dec, fail, int, money, ok, optStr, str, type ActionState } from "@/lib/action";

const guard = async <T,>(fn: () => Promise<T>): Promise<T | ActionState> => {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ForbiddenError) return fail(e.message);
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return fail(`Já existe um registro com este valor único (${(e.meta?.target as string[])?.join(", ")}).`);
    console.error(e);
    return fail(e instanceof Error ? e.message : "Erro inesperado.");
  }
};

/** "Rótulo: valor" por linha → [{label, value}] */
function parsePairs(text: string) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const i = l.indexOf(":");
      return i > 0 ? { label: l.slice(0, i).trim(), value: l.slice(i + 1).trim() } : { label: l, value: "" };
    })
    .slice(0, 40);
}

async function uniqueSlug(base: string, exceptId?: string) {
  let slug = slugify(base) || `produto-${randomToken(4).toLowerCase()}`;
  let n = 2;
  while (await prisma.product.findFirst({ where: { slug, NOT: exceptId ? { id: exceptId } : undefined }, select: { id: true } })) slug = `${slugify(base)}-${n++}`;
  return slug;
}

const PRICE_FIELDS = ["priceCents", "compareAtCents", "pixPriceCents", "costCents", "promoStartsAt", "promoEndsAt", "maxInstallments"] as const;

export async function saveProduct(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const admin = await assertAdmin("products.edit");
    const id = str(fd, "id") || null;
    const name = str(fd, "name");
    if (name.length < 3) return fail("Informe o título do produto.");
    const price = money(fd, "price");
    if (price == null || price <= 0) return fail("Informe um preço válido.");
    const compareAt = money(fd, "compareAt");
    if (compareAt != null && compareAt <= price) return fail("O preço “de” (promoção) deve ser maior que o preço de venda.");
    const pix = money(fd, "pixPrice");
    if (pix != null && pix > price) return fail("O preço Pix não pode ser maior que o preço de venda.");
    const status = (str(fd, "status") || "DRAFT") as ProductStatus;
    const before = id ? await prisma.product.findUnique({ where: { id } }) : null;
    if (id && !before) return fail("Produto não encontrado.");

    const data = {
      name,
      ref: optStr(fd, "ref"),
      sku: optStr(fd, "sku"),
      barcode: optStr(fd, "barcode"),
      shortDescription: optStr(fd, "shortDescription"),
      description: optStr(fd, "description"),
      jewelryType: optStr(fd, "jewelryType"),
      material: optStr(fd, "material"),
      goldType: optStr(fd, "goldType"),
      karat: optStr(fd, "karat"),
      color: optStr(fd, "color"),
      weightG: dec(fd, "weightG"),
      lengthMm: dec(fd, "lengthMm"),
      widthMm: dec(fd, "widthMm"),
      thicknessMm: dec(fd, "thicknessMm"),
      heightMm: dec(fd, "heightMm"),
      diameterMm: dec(fd, "diameterMm"),
      stoneType: optStr(fd, "stoneType"),
      stoneCount: int(fd, "stoneCount"),
      finish: optStr(fd, "finish"),
      size: optStr(fd, "size"),
      gender: optStr(fd, "gender"),
      specs: parsePairs(str(fd, "specs")),
      customFields: parsePairs(str(fd, "customFields")),
      priceCents: price,
      compareAtCents: compareAt,
      pixPriceCents: pix,
      costCents: money(fd, "cost"),
      promoStartsAt: dateTime(fd, "promoStartsAt"),
      promoEndsAt: dateTime(fd, "promoEndsAt"),
      maxInstallments: int(fd, "maxInstallments"),
      featured: bool(fd, "featured"),
      bestSeller: bool(fd, "bestSeller"),
      isNew: bool(fd, "isNew"),
      tryOnEnabled: bool(fd, "tryOnEnabled"),
      trackStock: bool(fd, "trackStock"),
      optionName: optStr(fd, "optionName"),
      tags: str(fd, "tags").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 30),
      seoTitle: optStr(fd, "seoTitle"),
      seoDescription: optStr(fd, "seoDescription"),
      packageWeightG: int(fd, "packageWeightG"),
      packageLengthCm: int(fd, "packageLengthCm"),
      packageWidthCm: int(fd, "packageWidthCm"),
      packageHeightCm: int(fd, "packageHeightCm"),
      primaryCategoryId: optStr(fd, "primaryCategoryId"),
      status,
      publishAt: dateTime(fd, "publishAt"),
    };

    // permissões finas: preço e publicação
    if (before) {
      const priceChanged = PRICE_FIELDS.some((k) => JSON.stringify(diff({ [k]: before[k] }, { [k]: data[k] })) !== "null");
      if (priceChanged && !admin.can("products.price")) return fail("Você não tem permissão para alterar preços.");
      if ((before.status !== status || String(before.publishAt) !== String(data.publishAt)) && !admin.can("products.publish")) return fail("Você não tem permissão para publicar/despublicar.");
    } else if (status !== "DRAFT" && !admin.can("products.publish")) {
      data.status = "DRAFT";
    }

    const categoryIds = fd.getAll("categoryIds").map(String).filter(Boolean);
    const collectionIds = fd.getAll("collectionIds").map(String).filter(Boolean);
    if (data.primaryCategoryId && !categoryIds.includes(data.primaryCategoryId)) categoryIds.push(data.primaryCategoryId);
    const relatedCodes = str(fd, "related").split(/[,\s]+/).filter(Boolean).slice(0, 24);

    const slugInput = str(fd, "slug");
    const product = await prisma.$transaction(async (t) => {
      const slug = slugInput ? await uniqueSlug(slugInput, id ?? undefined) : before?.slug ?? (await uniqueSlug(`${name}${data.ref ? `-${data.ref}` : ""}`));
      const p = before
        ? await t.product.update({ where: { id: before.id }, data: { ...data, slug } })
        : await t.product.create({ data: { ...data, slug } });
      await t.productCategory.deleteMany({ where: { productId: p.id } });
      if (categoryIds.length) await t.productCategory.createMany({ data: categoryIds.map((categoryId) => ({ productId: p.id, categoryId })), skipDuplicates: true });
      await t.collectionProduct.deleteMany({ where: { productId: p.id, collectionId: { notIn: collectionIds } } });
      for (const collectionId of collectionIds) await t.collectionProduct.upsert({ where: { collectionId_productId: { collectionId, productId: p.id } }, create: { collectionId, productId: p.id }, update: {} });
      // relacionados por referência ou SKU
      await t.productRelation.deleteMany({ where: { productId: p.id } });
      if (relatedCodes.length) {
        const rel = await t.product.findMany({ where: { OR: [{ ref: { in: relatedCodes } }, { sku: { in: relatedCodes } }], NOT: { id: p.id } }, select: { id: true, ref: true, sku: true } });
        const ordered = relatedCodes.map((c) => rel.find((r) => r.ref === c || r.sku === c)).filter(Boolean) as { id: string }[];
        await t.productRelation.createMany({ data: [...new Map(ordered.map((r, i) => [r.id, { productId: p.id, relatedId: r.id, position: i }])).values()], skipDuplicates: true });
      }
      // produto novo nasce com uma variação padrão (base do controle de estoque)
      if (!before) await t.productVariant.create({ data: { productId: p.id, sku: data.sku || data.ref || `LX-${randomToken(5).toUpperCase()}`, stock: 0 } });
      return p;
    });
    await audit(admin.id, before ? "product.update" : "product.create", "Product", product.id, { changes: before ? diff(before as unknown as Record<string, unknown>, product as unknown as Record<string, unknown>) : null, meta: { name } });
    revalidatePath("/admin/produtos");
    revalidatePath(`/produto/${product.slug}`);
    return before ? ok("Produto salvo.") : ok("Produto criado. Agora envie as fotografias.", { redirect: `/admin/produtos/${product.id}` });
  }) as Promise<ActionState>;
}

export async function uploadImages(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const admin = await assertAdmin("products.edit");
    const productId = str(fd, "productId");
    const p = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    const files = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    if (!files.length) return fail("Selecione ao menos uma imagem.");
    if (files.length > 20) return fail("Envie no máximo 20 imagens por vez.");
    let pos = (await prisma.productImage.aggregate({ where: { productId }, _max: { position: true } }))._max.position ?? -1;
    const errors: string[] = [];
    for (const f of files) {
      try {
        const st = await storeImage(Buffer.from(await f.arrayBuffer()), `catalog/${p.ref ?? p.id}`, `${Date.now().toString(36)}-${randomToken(4)}`);
        await prisma.productImage.create({ data: { productId, key: st.key, thumbKey: st.thumbKey, width: st.width, height: st.height, position: ++pos, alt: p.name } });
      } catch (e) {
        errors.push(`${f.name}: ${(e as Error).message}`);
      }
    }
    await audit(admin.id, "product.images_upload", "Product", productId, { meta: { count: files.length - errors.length } });
    revalidatePath(`/admin/produtos/${productId}`);
    return errors.length ? fail(`Algumas imagens não foram enviadas: ${errors.join("; ")}`) : ok(`${files.length} imagem(ns) enviada(s).`);
  }) as Promise<ActionState>;
}

export async function imageAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const admin = await assertAdmin("products.edit");
    const img = await prisma.productImage.findUniqueOrThrow({ where: { id: str(fd, "imageId") } });
    const op = str(fd, "op");
    const all = await prisma.productImage.findMany({ where: { productId: img.productId }, orderBy: { position: "asc" } });
    const idx = all.findIndex((i) => i.id === img.id);
    let order = all.map((i) => i.id);
    if (op === "delete") {
      await prisma.productImage.delete({ where: { id: img.id } });
      await Promise.all([deleteObject(img.key), img.thumbKey ? deleteObject(img.thumbKey) : null].filter(Boolean) as Promise<void>[]).catch(() => {});
      order = order.filter((i) => i !== img.id);
    } else if (op === "primary") order = [img.id, ...order.filter((i) => i !== img.id)];
    else if (op === "up" && idx > 0) [order[idx - 1], order[idx]] = [order[idx], order[idx - 1]];
    else if (op === "down" && idx < order.length - 1) [order[idx + 1], order[idx]] = [order[idx], order[idx + 1]];
    else if (op === "alt") await prisma.productImage.update({ where: { id: img.id }, data: { alt: str(fd, "alt").slice(0, 200) || null } });
    await prisma.$transaction(order.map((id, i) => prisma.productImage.update({ where: { id }, data: { position: i } })));
    await audit(admin.id, `product.image_${op}`, "Product", img.productId);
    revalidatePath(`/admin/produtos/${img.productId}`);
    return ok("Galeria atualizada.");
  }) as Promise<ActionState>;
}

function youtubeId(url: string) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  return m?.[1] ?? null;
}

export async function videoAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const admin = await assertAdmin("products.edit");
    const productId = str(fd, "productId");
    if (str(fd, "op") === "delete") {
      await prisma.productVideo.delete({ where: { id: str(fd, "videoId") } });
    } else {
      const url = str(fd, "url");
      const yt = youtubeId(url);
      if (!yt && !/^https:\/\/.+\.(mp4|webm)(\?.*)?$/i.test(url)) return fail("Informe um link do YouTube ou um arquivo de vídeo .mp4/.webm (https).");
      const pos = await prisma.productVideo.count({ where: { productId } });
      await prisma.productVideo.create({ data: { productId, url: yt ? `https://www.youtube.com/watch?v=${yt}` : url, title: optStr(fd, "title"), position: pos } });
    }
    await audit(admin.id, "product.video", "Product", productId);
    revalidatePath(`/admin/produtos/${productId}`);
    return ok("Vídeos atualizados.");
  }) as Promise<ActionState>;
}

export async function variantAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const admin = await assertAdmin("products.edit");
    const productId = str(fd, "productId");
    const op = str(fd, "op");
    if (op === "create") {
      const options = str(fd, "options").split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
      if (!options.length) return fail("Informe as opções (ex.: 12, 13, 14).");
      const p = await prisma.product.findUniqueOrThrow({ where: { id: productId }, include: { variants: true } });
      const base = p.sku || p.ref || p.id.slice(-6).toUpperCase();
      // a variação padrão sem opção vira a primeira opção
      const lone = p.variants.length === 1 && !p.variants[0].option ? p.variants[0] : null;
      let pos = p.variants.length;
      for (const [i, opt] of options.entries()) {
        if (p.variants.some((v) => v.option === opt)) continue;
        if (lone && i === 0) {
          await prisma.productVariant.update({ where: { id: lone.id }, data: { option: opt, sku: `${base}_${slugify(opt).toUpperCase()}` } });
          continue;
        }
        await prisma.productVariant.create({ data: { productId, option: opt, sku: `${base}_${slugify(opt).toUpperCase()}`, position: pos++ } });
      }
      if (!p.optionName) await prisma.product.update({ where: { id: productId }, data: { optionName: str(fd, "optionName") || "Tamanho" } });
    } else if (op === "update") {
      const v = await prisma.productVariant.findUniqueOrThrow({ where: { id: str(fd, "variantId") } });
      const priceCents = money(fd, "price");
      if (priceCents !== v.priceCents && !admin.can("products.price")) return fail("Você não tem permissão para alterar preços.");
      const after = await prisma.productVariant.update({
        where: { id: v.id },
        data: { option: optStr(fd, "option"), sku: str(fd, "sku") || v.sku, barcode: optStr(fd, "barcode"), priceCents, minStock: int(fd, "minStock") ?? v.minStock, active: bool(fd, "active") },
      });
      await audit(admin.id, "variant.update", "ProductVariant", v.id, { changes: diff(v as unknown as Record<string, unknown>, after as unknown as Record<string, unknown>) });
    } else if (op === "delete") {
      const v = await prisma.productVariant.findUniqueOrThrow({ where: { id: str(fd, "variantId") }, include: { _count: { select: { orderItems: true } } } });
      const count = await prisma.productVariant.count({ where: { productId: v.productId } });
      if (count <= 1) return fail("O produto precisa de ao menos uma variação.");
      if (v._count.orderItems) {
        await prisma.productVariant.update({ where: { id: v.id }, data: { active: false } });
        return ok("Variação com pedidos: foi desativada em vez de excluída (histórico preservado).");
      }
      if (v.stock !== 0 || v.reserved !== 0) return fail("Zere o estoque da variação antes de excluí-la.");
      await prisma.productVariant.delete({ where: { id: v.id } });
    }
    await audit(admin.id, `variant.${op}`, "Product", productId);
    revalidatePath(`/admin/produtos/${productId}`);
    return ok("Variações atualizadas.");
  }) as Promise<ActionState>;
}

export async function duplicateProduct(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const admin = await assertAdmin("products.edit");
    const src = await prisma.product.findUniqueOrThrow({ where: { id: str(fd, "id") }, include: { categories: true, images: true, videos: true, variants: true, collections: true } });
    const { id: _id, slug: _s, sku: _k, sourceId: _src, sourceUrl: _u, createdAt: _c, updatedAt: _up, salesCount: _sc, ratingAvg: _ra, ratingCount: _rc, categories, images, videos, variants, collections, ...rest } = src;
    const suffix = randomToken(3).toUpperCase();
    const copy = await prisma.product.create({
      data: {
        ...rest,
        specs: rest.specs ?? undefined,
        customFields: rest.customFields ?? undefined,
        name: `${src.name} (cópia)`,
        slug: await uniqueSlug(`${src.name}-copia`),
        status: "DRAFT",
        categories: { create: categories.map((c) => ({ categoryId: c.categoryId })) },
        collections: { create: collections.map((c) => ({ collectionId: c.collectionId })) },
        // as imagens são compartilhadas (mesmo arquivo); excluir na cópia não apaga o original enquanto houver referência
        images: { create: images.map((i) => ({ key: i.key, thumbKey: i.thumbKey, alt: i.alt, position: i.position, width: i.width, height: i.height })) },
        videos: { create: videos.map((v) => ({ url: v.url, title: v.title, position: v.position })) },
        variants: { create: variants.map((v) => ({ sku: `${v.sku}-C${suffix}`, option: v.option, priceCents: v.priceCents, minStock: v.minStock, position: v.position, stock: 0 })) },
      },
    });
    await audit(admin.id, "product.duplicate", "Product", copy.id, { meta: { from: src.id } });
    return ok("Produto duplicado como rascunho.", { redirect: `/admin/produtos/${copy.id}` });
  }) as Promise<ActionState>;
}

export async function deleteProduct(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const admin = await assertAdmin("products.delete");
    const p = await prisma.product.findUniqueOrThrow({ where: { id: str(fd, "id") }, include: { _count: { select: { orderItems: true } }, images: true } });
    if (p._count.orderItems) {
      await prisma.product.update({ where: { id: p.id }, data: { status: "ARCHIVED" } });
      await audit(admin.id, "product.archive", "Product", p.id, { meta: { reason: "exclusão de produto com pedidos" } });
      return ok("Este produto possui pedidos: foi arquivado para preservar o histórico.", { redirect: "/admin/produtos" });
    }
    await prisma.product.delete({ where: { id: p.id } });
    for (const img of p.images) {
      const shared = await prisma.productImage.count({ where: { key: img.key } });
      if (!shared) await Promise.all([deleteObject(img.key), img.thumbKey ? deleteObject(img.thumbKey) : Promise.resolve()]).catch(() => {});
    }
    await audit(admin.id, "product.delete", "Product", p.id, { meta: { name: p.name, ref: p.ref } });
    return ok("Produto excluído.", { redirect: "/admin/produtos" });
  }) as Promise<ActionState>;
}

export async function bulkProducts(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const op = str(fd, "op");
    const ids = fd.getAll("ids").map(String).filter(Boolean);
    if (!ids.length) return fail("Selecione ao menos um produto.");
    const need = op === "delete" ? "products.delete" : op.startsWith("price") ? "products.price" : ["publish", "unpublish", "archive"].includes(op) ? "products.publish" : "products.edit";
    const admin = await assertAdmin(need);
    let n = 0;
    switch (op) {
      case "publish": n = (await prisma.product.updateMany({ where: { id: { in: ids } }, data: { status: "ACTIVE" } })).count; break;
      case "unpublish": n = (await prisma.product.updateMany({ where: { id: { in: ids } }, data: { status: "DRAFT" } })).count; break;
      case "archive": n = (await prisma.product.updateMany({ where: { id: { in: ids } }, data: { status: "ARCHIVED" } })).count; break;
      case "feature": n = (await prisma.product.updateMany({ where: { id: { in: ids } }, data: { featured: true } })).count; break;
      case "unfeature": n = (await prisma.product.updateMany({ where: { id: { in: ids } }, data: { featured: false } })).count; break;
      case "bestseller": n = (await prisma.product.updateMany({ where: { id: { in: ids } }, data: { bestSeller: true } })).count; break;
      case "new": n = (await prisma.product.updateMany({ where: { id: { in: ids } }, data: { isNew: true } })).count; break;
      case "category": {
        const categoryId = str(fd, "categoryId");
        if (!categoryId) return fail("Escolha a categoria.");
        n = (await prisma.productCategory.createMany({ data: ids.map((productId) => ({ productId, categoryId })), skipDuplicates: true })).count;
        break;
      }
      case "tag": {
        const tag = str(fd, "tag").toLowerCase();
        if (!tag) return fail("Informe a etiqueta.");
        for (const id of ids) await prisma.product.update({ where: { id }, data: { tags: { push: tag } } });
        n = ids.length;
        break;
      }
      case "price": {
        const pct = dec(fd, "pct");
        if (pct == null || pct === 0 || pct < -90 || pct > 300) return fail("Informe um percentual entre -90 e 300.");
        // reajuste: mantém o desconto Pix proporcional quando definido manualmente
        const rows = await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, priceCents: true, pixPriceCents: true, compareAtCents: true } });
        await prisma.$transaction(rows.map((r) => prisma.product.update({
          where: { id: r.id },
          data: {
            priceCents: Math.round(r.priceCents * (1 + pct / 100)),
            pixPriceCents: r.pixPriceCents ? Math.round(r.pixPriceCents * (1 + pct / 100)) : null,
            compareAtCents: r.compareAtCents ? Math.round(r.compareAtCents * (1 + pct / 100)) : null,
          },
        })));
        n = rows.length;
        break;
      }
      case "delete": {
        for (const id of ids) {
          const used = await prisma.orderItem.count({ where: { productId: id } });
          if (used) await prisma.product.update({ where: { id }, data: { status: "ARCHIVED" } });
          else await prisma.product.delete({ where: { id } });
          n++;
        }
        break;
      }
      default:
        return fail("Ação inválida.");
    }
    await audit(admin.id, `product.bulk_${op}`, "Product", undefined, { meta: { ids, n, pct: str(fd, "pct") || undefined } });
    revalidatePath("/admin/produtos");
    return ok(`${n} produto(s) atualizado(s).`);
  }) as Promise<ActionState>;
}
