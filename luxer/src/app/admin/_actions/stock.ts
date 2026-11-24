"use server";
import { revalidatePath } from "next/cache";
import { assertAdmin, ForbiddenError } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { moveStock, setStock, StockError } from "@/lib/stock";
import { fail, int, ok, str, type ActionState } from "@/lib/action";

async function run(fn: () => Promise<ActionState>): Promise<ActionState> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ForbiddenError || e instanceof StockError) return fail(e.message);
    console.error(e);
    return fail(e instanceof Error ? e.message : "Erro inesperado.");
  }
}

export async function stockMovement(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const admin = await assertAdmin("stock.adjust");
    const variantId = str(fd, "variantId");
    const type = str(fd, "type") as "IN" | "OUT" | "ADJUST" | "INVENTORY";
    const qty = int(fd, "quantity");
    const reason = str(fd, "reason").slice(0, 200) || null;
    if (qty == null || qty < 0) return fail("Informe uma quantidade válida.");
    const v = await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId }, include: { product: true } });
    let after: number;
    await prisma.$transaction(async (t) => {
      if (type === "IN") {
        if (!qty) throw new StockError("Quantidade deve ser maior que zero.");
        after = await moveStock(t, { variantId, type: "IN", quantity: qty, reason: reason ?? "Entrada de mercadoria", adminId: admin.id });
      } else if (type === "OUT") {
        if (!qty) throw new StockError("Quantidade deve ser maior que zero.");
        if (!reason) throw new StockError("Informe o motivo da saída.");
        after = await moveStock(t, { variantId, type: "OUT", quantity: -qty, reason, adminId: admin.id });
      } else {
        if (type === "ADJUST" && !reason) throw new StockError("Informe o motivo do ajuste.");
        after = await setStock(t, { variantId, counted: qty, type, reason: reason ?? "Inventário", adminId: admin.id });
      }
      // ao registrar quantidade, o produto passa a ter controle de estoque
      if (!v.product.trackStock) await t.product.update({ where: { id: v.productId }, data: { trackStock: true } });
    });
    await audit(admin.id, `stock.${type.toLowerCase()}`, "ProductVariant", variantId, { meta: { sku: v.sku, qty, reason, after: after! } });
    revalidatePath("/admin/estoque");
    return ok(`Estoque de ${v.sku} atualizado: ${after!} un.`);
  });
}

/**
 * Importação CSV: "sku;quantidade[;minimo]" (cabeçalho opcional, separador ; ou ,).
 * modo "set" = inventário (define saldo); modo "add" = entrada (soma).
 */
export async function importStockCsv(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const admin = await assertAdmin("stock.adjust");
    const file = fd.get("file");
    if (!(file instanceof File) || !file.size) return fail("Selecione o arquivo CSV.");
    if (file.size > 2_000_000) return fail("Arquivo acima de 2 MB.");
    const mode = str(fd, "mode") === "add" ? "add" : "set";
    const text = (await file.text()).replace(/^﻿/, "");
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const errors: string[] = [];
    let done = 0;
    for (const [i, line] of lines.entries()) {
      const cols = line.split(/[;,\t]/).map((c) => c.trim().replace(/^"|"$/g, ""));
      if (i === 0 && /sku/i.test(cols[0])) continue;
      const [sku, q, min] = cols;
      const qty = Number(q);
      if (!sku || !Number.isInteger(qty) || qty < 0) { errors.push(`linha ${i + 1}: dados inválidos`); continue; }
      const v = await prisma.productVariant.findUnique({ where: { sku }, include: { product: true } });
      if (!v) { errors.push(`linha ${i + 1}: SKU ${sku} não encontrado`); continue; }
      try {
        await prisma.$transaction(async (t) => {
          if (mode === "set") await setStock(t, { variantId: v.id, counted: qty, type: "INVENTORY", reason: `Importação CSV (${file.name})`, adminId: admin.id });
          else if (qty > 0) await moveStock(t, { variantId: v.id, type: "IN", quantity: qty, reason: `Importação CSV (${file.name})`, adminId: admin.id });
          if (min !== undefined && min !== "" && Number.isInteger(Number(min))) await t.productVariant.update({ where: { id: v.id }, data: { minStock: Number(min) } });
          if (!v.product.trackStock) await t.product.update({ where: { id: v.productId }, data: { trackStock: true } });
        });
        done++;
      } catch (e) {
        errors.push(`linha ${i + 1}: ${(e as Error).message}`);
      }
    }
    await audit(admin.id, "stock.import_csv", "ProductVariant", undefined, { meta: { file: file.name, mode, done, errors: errors.length } });
    revalidatePath("/admin/estoque");
    return errors.length ? fail(`${done} linha(s) importada(s). ${errors.length} erro(s): ${errors.slice(0, 8).join("; ")}${errors.length > 8 ? "…" : ""}`) : ok(`${done} linha(s) importada(s).`);
  });
}
