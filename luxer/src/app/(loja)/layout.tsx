import { getSettings } from "@/lib/settings";
import { menuCategories } from "@/lib/catalog";
import { getCartView } from "@/lib/cart";
import { getCustomer } from "@/lib/customer-auth";
import { prisma } from "@/lib/db";
import { mediaUrl } from "@/lib/media-url";
import { formatMoney } from "@/lib/format";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Consent } from "@/components/site/Consent";
import { WhatsAppButton } from "@/components/site/WhatsAppButton";
import { Popup } from "@/components/site/Popup";
import { CompareBar } from "@/components/site/Compare";
import { Concierge } from "@/components/site/Concierge";

export const dynamic = "force-dynamic";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [s, cats, cart, customer, pages] = await Promise.all([
    getSettings(),
    menuCategories(),
    getCartView(),
    getCustomer(),
    prisma.page.findMany({ where: { published: true, showInFooter: true }, orderBy: [{ type: "asc" }, { position: "asc" }], select: { slug: true, title: true, type: true } }),
  ]);
  const now = new Date();
  const popup = await prisma.popup.findFirst({ where: { active: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }] }, orderBy: { updatedAt: "desc" } });
  const free = s.shipping.freeShippingFromCents;
  const announcement = [`${(s.payment.pixDiscountBps / 100).toLocaleString("pt-BR")}% de desconto no Pix`, `Até ${s.payment.maxInstallments}x no cartão`, free ? `Frete grátis acima de ${formatMoney(free)}` : "Ouro 18k com certificado de garantia"].join("  ·  ");
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-ink focus:p-3 focus:text-gold">Pular para o conteúdo</a>
      <Header cats={cats} cartCount={cart.count} logo={mediaUrl(s.store.logoKey)} storeName={s.store.name} announcement={announcement} logged={Boolean(customer)} />
      <main id="conteudo" className="flex-1">{children}</main>
      <Footer s={s} pages={pages} cats={cats.filter((c) => !c.faith).map((c) => ({ slug: c.slug, name: c.name }))} />
      {s.concierge.enabled ? (
        <Concierge greeting={s.concierge.greeting} quick={s.concierge.quickAnswers} whatsapp={s.marketing.whatsappButton ? s.contact.whatsapp : ""} whatsappMessage={s.marketing.whatsappMessage} chatEnabled />
      ) : s.marketing.whatsappButton && <WhatsAppButton number={s.contact.whatsapp} message={s.marketing.whatsappMessage} />}
      <CompareBar />
      <Consent ids={{ ga4Id: s.analytics.ga4Id, gtmId: s.analytics.gtmId, metaPixelId: s.analytics.metaPixelId }} />
      <Popup consentText={s.marketing.newsletterConsentText} popup={popup ? { id: popup.id, title: popup.title, body: popup.body, image: mediaUrl(popup.imageKey), ctaLabel: popup.ctaLabel, ctaUrl: popup.ctaUrl, couponCode: popup.couponCode, collectEmail: popup.collectEmail, delaySeconds: popup.delaySeconds, pages: popup.pages } : null} />
    </div>
  );
}
