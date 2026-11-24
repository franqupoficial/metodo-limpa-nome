import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { visibleWhere } from "@/lib/catalog";
import { priceView } from "@/lib/pricing";
import { mediaUrl } from "@/lib/media-url";
import { appUrl } from "@/lib/mail";

export const revalidate = 3600;

const x = (s: string | null | undefined) => (s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
const abs = (u: string | null) => (u ? (u.startsWith("http") ? u : appUrl() + u) : "");

/** Feed de produtos para o Google Merchant Center (RSS 2.0 com namespace g:). */
export async function GET() {
  const s = await getSettings();
  const rows = await prisma.product.findMany({
    where: { AND: [visibleWhere(), { images: { some: {} } }] },
    include: { images: { orderBy: { position: "asc" }, take: 5 }, variants: { where: { active: true }, select: { stock: true, reserved: true } }, primaryCategory: { include: { parent: true } } },
  });
  const items = rows.map((p) => {
    const pv = priceView(p, s.payment);
    const inStock = !p.trackStock || s.stock.allowBackorder || p.variants.some((v) => v.stock - v.reserved > 0);
    const [main, ...more] = p.images;
    return `<item>
<g:id>${x(p.sku ?? p.ref ?? p.id)}</g:id>
<title>${x(p.name)}</title>
<description>${x((p.description ?? p.name).slice(0, 4900))}</description>
<link>${appUrl()}/produto/${p.slug}</link>
<g:image_link>${x(abs(mediaUrl(main.key)))}</g:image_link>
${more.map((m) => `<g:additional_image_link>${x(abs(mediaUrl(m.key)))}</g:additional_image_link>`).join("")}
<g:availability>${inStock ? "in_stock" : "out_of_stock"}</g:availability>
<g:price>${((pv.compareAt ?? pv.price) / 100).toFixed(2)} BRL</g:price>
${pv.compareAt ? `<g:sale_price>${(pv.price / 100).toFixed(2)} BRL</g:sale_price>` : ""}
<g:installment><g:months>${pv.installments}</g:months><g:amount>${(pv.installmentValue / 100).toFixed(2)} BRL</g:amount></g:installment>
<g:brand>${x(s.store.name)}</g:brand>
<g:mpn>${x(p.ref ?? p.id)}</g:mpn>
<g:identifier_exists>${p.barcode ? "yes" : "no"}</g:identifier_exists>
${p.barcode ? `<g:gtin>${x(p.barcode)}</g:gtin>` : ""}
<g:condition>new</g:condition>
<g:google_product_category>188</g:google_product_category>
<g:product_type>${x([p.primaryCategory?.parent?.name, p.primaryCategory?.name].filter(Boolean).join(" > "))}</g:product_type>
${p.material ? `<g:material>${x(p.material)}</g:material>` : ""}${p.color ? `<g:color>${x(p.color)}</g:color>` : ""}
</item>`;
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>${x(s.store.name)}</title><link>${appUrl()}</link><description>${x(s.seo.description)}</description>${items.join("")}</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
