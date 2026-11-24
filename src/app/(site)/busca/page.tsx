import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { SERVICES } from "@/lib/services";
import { PageHero } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { FAQ_CNPJ, FAQ_CONSUMIDOR, FAQ_EMPRESTIMO, FAQ_GERAL, FAQ_LVB } from "@/content/faq";

export const metadata: Metadata = { title: "Busca", robots: { index: false } };

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const PAGES = [
  { href: "/informacoes#direitos", title: "Direitos do consumidor", text: "cdc código defesa consumidor cadastro prazo 5 anos arrependimento" },
  { href: "/informacoes#seguranca", title: "Segurança e prevenção a golpes", text: "golpe fraude segurança lgpd dados" },
  { href: "/consumidor#consultar", title: "Como consultar seu CPF", text: "consultar cpf registrato birô gratuito" },
  { href: "/consumidor#contestar", title: "Como contestar registros incorretos", text: "contestar procon consumidor.gov.br registro incorreto" },
  { href: "/emprestimo/como-funciona", title: "Como funciona o empréstimo", text: "empréstimo negativado etapas contrato cet juros débito automático" },
  { href: "/lvb/veiculos", title: "Catálogo de veículos LVB", text: "carro catálogo veículo kwid mobi onix hb20 argo cronos versa polo creta kicks suv sedan" },
  { href: "/lvb/simulador", title: "Simulador de locação", text: "simular simulador valor mensal plano 12 24 36 meses" },
  { href: "/lvb/politicas", title: "Políticas da locação", text: "multa sinistro devolução cancelamento quilometragem manutenção" },
  { href: "/acompanhar", title: "Acompanhar solicitação", text: "protocolo acompanhar status código" },
  { href: "/privacidade", title: "Política de privacidade", text: "privacidade lgpd dados pessoais" },
  { href: "/contato", title: "Contato", text: "contato telefone email whatsapp atendimento" },
];

export default async function Busca({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim().slice(0, 100);
  const terms = norm(q).split(/\s+/).filter((t) => t.length > 1);
  const match = (s: string) => terms.length > 0 && terms.some((t) => norm(s).includes(t));

  const services = SERVICES.filter((s) => match(`${s.name} ${s.description} ${s.keywords.join(" ")}`));
  const pages = PAGES.filter((p) => match(`${p.title} ${p.text}`));
  const faqs = [...FAQ_GERAL, ...FAQ_CONSUMIDOR, ...FAQ_CNPJ, ...FAQ_EMPRESTIMO, ...FAQ_LVB].filter((f) => match(f.q)).slice(0, 6);
  const news = q
    ? await prisma.newsPost.findMany({
        where: { published: true, publishedAt: { lte: new Date() }, OR: [{ title: { contains: q, mode: "insensitive" } }, { subtitle: { contains: q, mode: "insensitive" } }, { content: { contains: q, mode: "insensitive" } }] },
        orderBy: { publishedAt: "desc" }, take: 6, select: { slug: true, title: true, subtitle: true },
      })
    : [];
  const total = services.length + pages.length + faqs.length + news.length;

  return (
    <>
      <PageHero title="Buscar no portal" crumbs={[{ label: "Busca" }]}>
        <form role="search" className="flex max-w-xl gap-2">
          <label htmlFor="q" className="sr-only">Termo de busca</label>
          <input id="q" name="q" type="search" defaultValue={q} className="input rounded-full" placeholder="O que você procura?" />
          <button className="btn-primary">Buscar</button>
        </form>
      </PageHero>
      <div className="container-portal max-w-4xl space-y-8 py-10">
        {q && <p className="text-sm text-muted" aria-live="polite">{total} resultado(s) para “{q}”</p>}
        {services.length > 0 && <ResultGroup title="Serviços" items={services.map((s) => ({ href: s.href, title: s.name, text: s.description }))} />}
        {pages.length > 0 && <ResultGroup title="Páginas" items={pages.map((p) => ({ href: p.href, title: p.title }))} />}
        {news.length > 0 && <ResultGroup title="Notícias e conteúdos" items={news.map((n) => ({ href: `/noticias/${n.slug}`, title: n.title, text: n.subtitle }))} />}
        {faqs.length > 0 && <ResultGroup title="Perguntas frequentes" items={faqs.map((f) => ({ href: "/perguntas-frequentes", title: f.q, text: f.a }))} />}
        {q && total === 0 && (
          <div className="card p-8 text-center">
            <p className="font-semibold">Nenhum resultado encontrado.</p>
            <p className="mt-1 text-sm text-muted">Tente outros termos ou navegue pelos <Link href="/servicos">serviços</Link>.</p>
          </div>
        )}
      </div>
    </>
  );
}

function ResultGroup({ title, items }: { title: string; items: { href: string; title: string; text?: string }[] }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">{title}</h2>
      <ul className="divide-y divide-line rounded-xl border border-line bg-white">
        {items.map((i) => (
          <li key={i.href + i.title}>
            <Link href={i.href} className="group flex items-start justify-between gap-4 p-4 no-underline hover:bg-surface">
              <span><span className="block font-semibold text-ink group-hover:text-brand-700">{i.title}</span>{i.text && <span className="mt-0.5 line-clamp-2 block text-sm text-muted">{i.text}</span>}</span>
              <Icon name="chevron" className="mt-1 h-4 w-4 shrink-0 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
