import Link from "next/link";
import type { Settings } from "@/lib/settings";
import { NewsletterForm } from "./NewsletterForm";

/** Rodapé institucional. */
export function Footer({ s, pages, cats }: { s: Settings; pages: { slug: string; title: string; type: string }[]; cats: { slug: string; name: string }[] }) {
  const social = Object.entries(s.social).filter(([, v]) => v);
  const head = "mb-5 text-[10px] uppercase tracking-[0.28em] text-ink/45";
  const link = "text-ink/75 transition-colors hover:text-ink";
  return (
    <footer className="border-t border-line bg-[#08080a] text-[13px] text-ink/75">
      <div className="mx-auto max-w-[1440px] px-5 pt-20 sm:px-8 sm:pt-24">
        <div className="grid gap-12 border-b border-line pb-16 lg:grid-cols-[1.1fr_1fr] lg:gap-24">
          <div>
            <div className="font-serif text-[2.2rem] leading-none tracking-[0.46em] text-ink">LUXER</div>
            <p className="mt-6 max-w-sm font-serif text-xl leading-snug text-ink/70">{s.store.tagline}.</p>
          </div>
          <div>
            <div className={head}>Correspondência Luxer</div>
            <p className="mb-6 max-w-md text-ink/60">Lançamentos, coleções e convites, sempre com antecedência.</p>
            <NewsletterForm source="rodape" consentText={s.marketing.newsletterConsentText} />
          </div>
        </div>
        <div className="grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className={head}>Joias</div>
            <ul className="space-y-3">{cats.map((c) => <li key={c.slug}><Link href={`/categoria/${c.slug}`} className={link}>{c.name}</Link></li>)}<li><Link href="/luxer-fe" className={link}>Luxer Fé</Link></li></ul>
          </div>
          <div>
            <div className={head}>A Luxer</div>
            <ul className="space-y-3">{pages.map((p) => <li key={p.slug}><Link href={`/p/${p.slug}`} className={link}>{p.title}</Link></li>)}<li><Link href="/provador" className={link}>Provador virtual</Link></li></ul>
          </div>
          <div>
            <div className={head}>Atendimento</div>
            <ul className="space-y-3">
              <li><Link href="/perguntas-frequentes" className={link}>Perguntas frequentes</Link></li>
              <li><Link href="/contato" className={link}>Contato</Link></li>
              <li><Link href="/conta" className={link}>Minha conta e pedidos</Link></li>
              <li><Link href="/privacidade" className={link}>Privacidade e cookies</Link></li>
            </ul>
          </div>
          <div>
            <div className={head}>Fale conosco</div>
            <ul className="space-y-3">
              {s.contact.phone && <li className="text-ink/75">{s.contact.phone}</li>}
              {s.contact.whatsapp && <li><a href={`https://wa.me/${s.contact.whatsapp}`} target="_blank" rel="noopener noreferrer" className={link}>WhatsApp</a></li>}
              {s.contact.email && <li><a href={`mailto:${s.contact.email}`} className={`${link} break-all`}>{s.contact.email}</a></li>}
              {s.contact.hours && <li className="text-ink/45">{s.contact.hours}</li>}
              {s.contact.address && <li className="text-ink/45">{s.contact.address}</li>}
            </ul>
            {social.length > 0 && <div className="mt-6 flex flex-wrap gap-5 text-[10px] uppercase tracking-[0.24em]">{social.map(([k, v]) => <a key={k} href={v} target="_blank" rel="noopener noreferrer" className={link}>{k}</a>)}</div>}
          </div>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-5 py-7 text-[11px] text-ink/40 sm:flex-row sm:justify-between sm:px-8">
          <span>© {new Date().getFullYear()} {s.store.legalName}{s.store.cnpj ? ` · CNPJ ${s.store.cnpj}` : ""}</span>
          <span>Pagamento seguro · Pix e cartão de crédito</span>
        </div>
      </div>
    </footer>
  );
}
