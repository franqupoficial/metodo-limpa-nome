import Link from "next/link";
import type { Settings } from "@/lib/settings";
import { NewsletterForm } from "./NewsletterForm";

export function Footer({ s, pages, cats }: { s: Settings; pages: { slug: string; title: string; type: string }[]; cats: { slug: string; name: string }[] }) {
  const social = Object.entries(s.social).filter(([, v]) => v);
  return (
    <footer className="bg-ink text-ivory/80">
      <div className="border-b border-white/10">
        <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-14 sm:px-8 lg:grid-cols-2 lg:items-center">
          <div><div className="eyebrow text-gold">Newsletter</div><p className="display mt-3 text-3xl text-ivory sm:text-4xl">Lançamentos e ofertas exclusivas, antes de todos.</p></div>
          <NewsletterForm source="rodape" consentText={s.marketing.newsletterConsentText} dark />
        </div>
      </div>
      <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-14 sm:px-8 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="font-serif text-3xl tracking-[0.4em] text-ivory">LUXER</div>
          <p className="mt-4 text-sm leading-relaxed text-ivory/60">{s.store.tagline}. {s.contact.address}.</p>
          {social.length > 0 && <div className="mt-5 flex flex-wrap gap-4 text-xs uppercase tracking-[0.2em]">{social.map(([k, v]) => <a key={k} href={v} target="_blank" rel="noopener noreferrer" className="hover:text-gold">{k}</a>)}</div>}
        </div>
        <div>
          <div className="eyebrow mb-4 text-gold">Joias</div>
          <ul className="space-y-2.5 text-sm">{cats.map((c) => <li key={c.slug}><Link href={`/categoria/${c.slug}`} className="hover:text-gold">{c.name}</Link></li>)}<li><Link href="/luxer-fe" className="hover:text-gold">Luxer Fé</Link></li><li><Link href="/provador" className="hover:text-gold">Provador virtual</Link></li></ul>
        </div>
        <div>
          <div className="eyebrow mb-4 text-gold">Institucional</div>
          <ul className="space-y-2.5 text-sm">{pages.map((p) => <li key={p.slug}><Link href={`/p/${p.slug}`} className="hover:text-gold">{p.title}</Link></li>)}<li><Link href="/perguntas-frequentes" className="hover:text-gold">Perguntas frequentes</Link></li><li><Link href="/contato" className="hover:text-gold">Contato</Link></li><li><Link href="/privacidade" className="hover:text-gold">Privacidade e cookies</Link></li></ul>
        </div>
        <div>
          <div className="eyebrow mb-4 text-gold">Atendimento</div>
          <ul className="space-y-2.5 text-sm">
            <li>{s.contact.phone}</li>
            {s.contact.whatsapp && <li><a href={`https://wa.me/${s.contact.whatsapp}`} target="_blank" rel="noopener noreferrer" className="hover:text-gold">WhatsApp</a></li>}
            <li><a href={`mailto:${s.contact.email}`} className="hover:text-gold">{s.contact.email}</a></li>
            <li className="text-ivory/60">{s.contact.hours}</li>
            <li><Link href="/conta" className="hover:text-gold">Minha conta e pedidos</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-5 py-6 text-[11px] text-ivory/45 sm:flex-row sm:justify-between sm:px-8">
          <span>© {new Date().getFullYear()} {s.store.legalName} · CNPJ {s.store.cnpj}</span>
          <span>Pagamentos processados com segurança pela Pagar.me · Pix e cartão de crédito</span>
        </div>
      </div>
    </footer>
  );
}
