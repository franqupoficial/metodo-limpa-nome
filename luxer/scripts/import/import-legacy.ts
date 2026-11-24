/**
 * Importa as exportações da plataforma anterior (LojaMestre):
 *   --clientes <arquivo.csv>   exportação "geral_cli" (separador ;, ISO-8859-1)
 *   --estoque  <arquivo.xls>   exportação de estoque (tabela HTML salva como .xls)
 *
 * Uso: npm run legacy:import -- --clientes ~/geral_cli.csv --estoque ~/estoque.xls [--dry-run]
 *
 * Regras (LGPD — minimização):
 * - Importa somente o necessário para atendimento, entrega, nota fiscal e relacionamento:
 *   nome, e-mail, telefone/WhatsApp, CPF/CNPJ (criptografado), data de nascimento, endereço e consentimentos.
 * - NÃO importa RG/IE, sexo nem pontos de fidelidade (não usados pela nova loja).
 * - "Aceita Mailing" vira consentimento de e-mail com a data de cadastro original; "Aceita SMS" é guardado
 *   separadamente (smsOptIn) e só é usado em listas de WhatsApp/SMS de remarketing.
 * - Clientes já existentes (mesmo e-mail) são atualizados apenas nos campos vazios.
 * - Os arquivos de origem contêm dados pessoais: nunca os coloque no repositório.
 */
import { readFileSync } from "node:fs";
import { prisma } from "../../src/lib/db";
import { encryptString, keyedHash } from "../../src/lib/crypto";
import { setStock } from "../../src/lib/stock";

const args = process.argv.slice(2);
const opt = (k: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
const DRY = args.includes("--dry-run");
const digits = (s: string) => (s || "").replace(/\D/g, "");

function parseDate(br: string): Date | null {
  const m = br?.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?/);
  if (!m) return null;
  const d = new Date(`${m[3]}-${m[2]}-${m[1]}T${m[4] ?? "12"}:${m[5] ?? "00"}:${m[6] ?? "00"}-03:00`);
  return Number.isNaN(d.getTime()) || d.getFullYear() < 1900 ? null : d;
}

function titleCase(s: string) {
  return s.trim().toLowerCase().replace(/(^|\s)(\p{L})/gu, (_, a, b) => a + b.toUpperCase()).replace(/\b(De|Da|Do|Dos|Das|E)\b/g, (w) => w.toLowerCase());
}

async function importCustomers(file: string) {
  const text = readFileSync(file, "latin1");
  const rows = text.split(/\r?\n/).filter(Boolean).map((l) => l.split(";"));
  const h = rows[0].map((c) => c.trim());
  const col = (r: string[], name: string) => (r[h.indexOf(name)] ?? "").trim();
  let created = 0, updated = 0, skipped = 0;
  const problems: string[] = [];
  for (const r of rows.slice(1)) {
    const email = col(r, "E-Mail").toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { skipped++; problems.push(`ID ${col(r, "ID")}: e-mail inválido`); continue; }
    const doc = digits(col(r, "CPF/CNPJ"));
    const phone = digits(col(r, "WhatsApp")) || digits(col(r, "Telefone 1"));
    const createdAt = parseDate(col(r, "Data de Cadastro")) ?? new Date();
    const mailing = col(r, "Aceita Mailing") === "Sim";
    const sms = col(r, "Aceita SMS") === "Sim";
    const inactive = col(r, "Situacao") === "Inativo";
    const pj = col(r, "Tipo") === "PJ";
    const tags = ["importado-lojamestre", ...(inactive ? ["inativo-plataforma-anterior"] : []), ...(pj ? ["pessoa-juridica"] : [])];
    const data = {
      name: titleCase(col(r, "Nome")) || email,
      phone: phone.length >= 10 ? phone.replace(/^0+/, "") : null,
      birthDate: parseDate(col(r, "Data de Nascimento")),
      cpfEnc: doc.length === 11 || doc.length === 14 ? encryptString(doc) : null,
      cpfHash: doc.length === 11 ? keyedHash(doc) : null,
      marketingOptIn: mailing && !inactive,
      marketingOptAt: mailing ? createdAt : null,
      smsOptIn: sms && !inactive,
      legacyId: Number(col(r, "ID")) || null,
      source: "lojamestre",
    };
    if (DRY) { created++; continue; }
    const existing = await prisma.customer.findUnique({ where: { email } });
    // CPF já vinculado a outro cadastro: mantém o vínculo existente
    if (data.cpfHash) {
      const owner = await prisma.customer.findUnique({ where: { cpfHash: data.cpfHash }, select: { id: true } });
      if (owner && owner.id !== existing?.id) data.cpfHash = null;
    }
    if (data.legacyId) {
      const legacyOwner = await prisma.customer.findUnique({ where: { legacyId: data.legacyId }, select: { id: true } });
      if (legacyOwner && legacyOwner.id !== existing?.id) data.legacyId = null;
    }
    let customerId: string;
    if (existing) {
      if (existing.anonymizedAt) { skipped++; continue; }
      await prisma.customer.update({
        where: { id: existing.id },
        data: {
          phone: existing.phone ?? data.phone, birthDate: existing.birthDate ?? data.birthDate,
          cpfEnc: existing.cpfEnc ?? data.cpfEnc, cpfHash: existing.cpfHash ?? data.cpfHash,
          legacyId: existing.legacyId ?? data.legacyId, source: existing.source ?? data.source,
          smsOptIn: existing.smsOptIn || data.smsOptIn,
          tags: [...new Set([...existing.tags, ...tags])],
        },
      });
      customerId = existing.id;
      updated++;
    } else {
      const c = await prisma.customer.create({ data: { email, ...data, tags, createdAt } });
      customerId = c.id;
      created++;
    }
    const cep = digits(col(r, "CEP"));
    if (cep.length === 8 && col(r, "Endereço") && !(await prisma.customerAddress.count({ where: { customerId } }))) {
      await prisma.customerAddress.create({
        data: { customerId, recipient: data.name, postalCode: cep, street: col(r, "Endereço"), number: col(r, "Número") || "s/n", complement: col(r, "Complemento") || null, district: col(r, "Bairro") || "-", city: col(r, "Cidade"), state: col(r, "Estado").toUpperCase().slice(0, 2), isDefault: true },
      });
    }
  }
  console.log(`Clientes: ${created} criados, ${updated} atualizados, ${skipped} ignorados${DRY ? " (simulação)" : ""}`);
  if (problems.length) console.log("  " + problems.slice(0, 20).join("\n  "));
}

async function importStock(file: string) {
  const html = readFileSync(file, "latin1");
  const cells = (row: string) => [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim());
  const rows = [...html.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((m) => cells(m[1]));
  const h = rows[0];
  const col = (r: string[], name: string) => r[h.indexOf(name)] ?? "";
  const num = (s: string) => Number((s || "").replace(/\./g, "").replace(",", "."));
  let ok = 0, missing = 0;
  const notFound: string[] = [];
  const productsTouched = new Set<string>();
  for (const r of rows.slice(1)) {
    const sku = col(r, "SKU Atual") || col(r, "Novo SKU");
    const qty = Math.max(0, Math.floor(num(col(r, "Quantidade"))));
    if (!sku || !Number.isFinite(qty)) continue;
    const v = await prisma.productVariant.findFirst({ where: { OR: [{ sku }, { sku: col(r, "Novo SKU") || sku }] }, include: { product: true } });
    if (!v) { missing++; if (notFound.length < 30) notFound.push(sku); continue; }
    if (DRY) { ok++; continue; }
    await prisma.$transaction(async (t) => {
      await setStock(t, { variantId: v.id, counted: qty, type: "INVENTORY", reason: "Importação da planilha de estoque da plataforma anterior" });
      if (!v.product.trackStock) await t.product.update({ where: { id: v.productId }, data: { trackStock: true } });
    });
    // embalagem para frete (peso em g e medidas em cm), apenas se o produto ainda não tiver
    if (!productsTouched.has(v.productId)) {
      productsTouched.add(v.productId);
      const w = Math.round(num(col(r, "Peso"))), L = Math.round(num(col(r, "Profundidade"))), W = Math.round(num(col(r, "Largura"))), H = Math.round(num(col(r, "Altura")));
      const gtin = digits(col(r, "GTIN/EAN do produto"));
      const cost = num(col(r, "Custo"));
      await prisma.product.update({
        where: { id: v.productId },
        data: {
          packageWeightG: v.product.packageWeightG ?? (w > 0 ? w : null), packageLengthCm: v.product.packageLengthCm ?? (L > 0 ? L : null),
          packageWidthCm: v.product.packageWidthCm ?? (W > 0 ? W : null), packageHeightCm: v.product.packageHeightCm ?? (H > 0 ? H : null),
          barcode: v.product.barcode ?? (gtin.length >= 8 ? gtin : null), costCents: v.product.costCents ?? (cost > 0 ? Math.round(cost * 100) : null),
        },
      });
    }
    ok++;
  }
  console.log(`Estoque: ${ok} SKU(s) atualizados em ${productsTouched.size} produto(s), ${missing} SKU(s) sem correspondência no catálogo${DRY ? " (simulação)" : ""}`);
  if (notFound.length) console.log("  Exemplos sem correspondência: " + notFound.join(", "));
}

async function main() {
  const c = opt("--clientes"), e = opt("--estoque");
  if (!c && !e) throw new Error("Informe --clientes <csv> e/ou --estoque <xls>.");
  if (c) await importCustomers(c);
  if (e) await importStock(e);
}
main().catch((e) => { console.error(e.message); process.exit(1); }).finally(() => prisma.$disconnect());
