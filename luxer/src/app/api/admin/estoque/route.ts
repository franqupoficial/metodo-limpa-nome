import { getCurrentAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

const csv = (v: unknown) => {
  const s = v == null ? "" : String(v);
  // previne injeção de fórmulas em planilhas
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[;"\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/** Exporta saldos de estoque em CSV (separador ;, compatível com Excel pt-BR). */
export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin?.can("stock.view")) return new Response("Acesso negado", { status: 403 });
  const rows = await prisma.productVariant.findMany({ orderBy: [{ product: { name: "asc" } }, { position: "asc" }], include: { product: { select: { name: true, ref: true, trackStock: true, status: true } } } });
  const lines = ["sku;quantidade;minimo;reservado;disponivel;produto;referencia;opcao;controla_estoque;status"];
  for (const v of rows) lines.push([v.sku, v.stock, v.minStock, v.reserved, v.stock - v.reserved, v.product.name, v.product.ref, v.option, v.product.trackStock ? "sim" : "nao", v.product.status].map(csv).join(";"));
  await audit(admin.id, "stock.export_csv", "ProductVariant", undefined, { meta: { rows: rows.length } });
  return new Response("﻿" + lines.join("\r\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="estoque-luxer-${new Date().toISOString().slice(0, 10)}.csv"` } });
}
