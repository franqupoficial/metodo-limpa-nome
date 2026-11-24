/**
 * Snapshot do catálogo para publicação.
 *   npm run snapshot:export   → data/snapshot.json.gz (catálogo, estoque, conteúdo, configurações)
 *   npm run snapshot:restore  → restaura num banco VAZIO (não faz nada se já houver produtos)
 *
 * NÃO inclui dados pessoais (clientes, pedidos, carrinhos, conversas, leads), usuários do painel,
 * sessões nem logs. Clientes da plataforma anterior entram em produção apenas via `npm run legacy:import`.
 */
import { gzipSync, gunzipSync } from "node:zlib";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { prisma } from "../src/lib/db";

const FILE = "data/snapshot.json.gz";
// ordem respeita as chaves estrangeiras
const MODELS = ["category", "collection", "product", "productCategory", "collectionProduct", "productImage", "productVideo", "productVariant", "productRelation", "page", "homeSection", "faqItem", "banner", "media", "setting", "automationFlow"] as const;
const SKIP_EXPORT = new Set(["media", "setting", "banner"]); // mídias e configurações de teste não vão para produção
type M = (typeof MODELS)[number];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const model = (m: M) => (prisma as any)[m];

async function exportSnapshot() {
  const data: Record<string, unknown[]> = {};
  for (const m of MODELS) data[m] = SKIP_EXPORT.has(m) ? [] : await model(m).findMany();
  // dados de teste nunca vão para produção
  data.product = (data.product as { ref: string | null }[]).filter((p) => !p.ref?.startsWith("E2E"));
  const ids = new Set((data.product as { id: string }[]).map((p) => p.id));
  for (const m of ["productCategory", "collectionProduct", "productImage", "productVideo", "productVariant"] as const) data[m] = (data[m] as { productId: string }[]).filter((r) => ids.has(r.productId));
  data.productRelation = (data.productRelation as { productId: string; relatedId: string }[]).filter((r) => ids.has(r.productId) && ids.has(r.relatedId));
  data.banner = (data.banner as { title: string }[]).filter((b) => !b.title.includes("E2E"));
  data.automationFlow = (data.automationFlow as { trigger: string }[]).filter((f) => f.trigger !== "MANUAL").map((f) => ({ ...f, active: false }));
  // estoque físico vem da planilha; reservas de pedidos de teste não
  data.productVariant = (data.productVariant as { reserved: number }[]).map((v) => ({ ...v, reserved: 0 }));
  writeFileSync(FILE, gzipSync(JSON.stringify(data)));
  console.log(`Snapshot: ${Object.entries(data).map(([k, v]) => `${k}=${v.length}`).join(" ")}`);
}

async function restoreSnapshot() {
  if (!existsSync(FILE)) return console.log("Sem snapshot — nada a restaurar.");
  if ((await prisma.product.count()) > 0) return console.log("Banco já possui produtos — snapshot ignorado.");
  const data = JSON.parse(gunzipSync(readFileSync(FILE)).toString("utf8")) as Record<string, Record<string, unknown>[]>;
  const fixDates = (r: Record<string, unknown>) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d/.test(v) ? new Date(v) : v]));
  for (const m of MODELS) {
    const rows = (data[m] ?? []).map(fixDates);
    if (m === "category") {
      // pais antes dos filhos
      rows.sort((a, b) => (a.parentId ? 1 : 0) - (b.parentId ? 1 : 0));
    }
    if (["page", "homeSection", "faqItem", "setting", "automationFlow"].includes(m)) {
      for (const r of rows) await model(m).upsert({ where: m === "setting" ? { key: r.key } : m === "page" ? { slug: r.slug } : { id: r.id }, create: r, update: {} });
      continue;
    }
    for (let i = 0; i < rows.length; i += 500) await model(m).createMany({ data: rows.slice(i, i + 500), skipDuplicates: true });
    console.log(`  ${m}: ${rows.length}`);
  }
  console.log("Snapshot restaurado.");
}

(process.argv.includes("--restore") ? restoreSnapshot() : exportSnapshot())
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
