import Link from "next/link";
import { prisma } from "@/lib/db";
import { SERVICES } from "@/lib/services";
import { ServiceCard } from "@/components/ServiceCard";
import { NewsCard } from "@/components/NewsCard";
import { Faq, InfoCard, Section } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { FAQ_GERAL } from "@/content/faq";

export const revalidate = 300;

export default async function HomePage() {
  const news = await prisma.newsPost.findMany({
    where: { published: true, publishedAt: { lte: new Date() } },
    orderBy: { publishedAt: "desc" },
    take: 3,
  });

  return (
    <>
      <section className="relative overflow-hidden border-b border-line bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 text-white">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-500/30 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
        <div className="container-portal relative py-14 sm:py-20">
          <div className="max-w-3xl animate-fade-up">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-200">Informação, orientação e serviços digitais</p>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight text-white sm:text-5xl">Portal Consumidor</h1>
            <p className="mt-4 text-lg text-brand-100 sm:text-xl">
              Acesse serviços digitais, encontre informações e solicite atendimento de forma simples e organizada.
            </p>
            <form action="/busca" role="search" className="mt-8">
              <label htmlFor="busca-hero" className="sr-only">Buscar serviços e informações</label>
              <div className="flex overflow-hidden rounded-full bg-white p-1.5 shadow-lg ring-1 ring-black/5">
                <Icon name="search" className="ml-3 h-5 w-5 self-center text-muted" />
                <input id="busca-hero" name="q" type="search" placeholder="Ex.: regularizar CPF, abrir CNPJ, alugar carro…" className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-ink placeholder:text-slate-400 focus:outline-none" />
                <button type="submit" className="btn-primary">Buscar</button>
              </div>
            </form>
            <ul className="mt-5 flex flex-wrap gap-2 text-sm">
              {[["/consumidor", "Regularizar CPF"], ["/cnpj", "Abrir CNPJ"], ["/emprestimo", "Empréstimo"], ["/lvb", "Alugar carro"], ["/acompanhar", "Acompanhar"]].map(([h, l]) => (
                <li key={h}><Link href={h} className="inline-block rounded-full border border-white/25 bg-white/10 px-3 py-1 text-white no-underline transition-colors hover:bg-white/20">{l}</Link></li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <Section id="servicos" eyebrow="Serviços" title="O que você precisa resolver?" intro="Escolha o serviço, conheça as condições e contrate online.">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((s) => <ServiceCard key={s.type} s={s} cta="Conhecer e contratar" />)}
        </div>
      </Section>

      <section className="bg-surface py-10 sm:py-14">
        <div className="container-portal">
          <div className="mb-8 max-w-3xl">
            <p className="eyebrow">Informações</p>
            <h2 className="section-title mt-1">Antes de solicitar, conheça seus direitos</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <InfoCard icon="scale" title="Direitos do consumidor" href="/informacoes#direitos">
              Saiba como consultar seu CPF, identificar registros incorretos e contestar informações de forma gratuita.
            </InfoCard>
            <InfoCard icon="lock" title="Segurança e privacidade" href="/informacoes#seguranca">
              Seus dados são protegidos conforme a LGPD. Veja como evitar golpes e reconhecer canais oficiais.
            </InfoCard>
            <InfoCard icon="info" title="Transparência" href="/informacoes#transparencia">
              Somos uma plataforma privada. Indicamos sempre os canais públicos e gratuitos disponíveis.
            </InfoCard>
          </div>
        </div>
      </section>

      {news.length > 0 && (
        <Section eyebrow="Notícias e conteúdos" title="Conteúdos educativos">
          <div className="grid gap-5 md:grid-cols-3">
            {news.map((p) => <NewsCard key={p.id} post={p} />)}
          </div>
          <div className="mt-6">
            <Link href="/noticias" className="btn-secondary">Ver todos os conteúdos <Icon name="arrow" className="h-4 w-4" /></Link>
          </div>
        </Section>
      )}

      <section className="py-10 sm:py-14">
        <div className="container-portal grid gap-10 lg:grid-cols-[1fr_380px]">
          <div>
            <p className="eyebrow">Perguntas frequentes</p>
            <h2 className="section-title mb-6 mt-1">Dúvidas comuns</h2>
            <Faq items={FAQ_GERAL.slice(0, 4)} />
            <Link href="/perguntas-frequentes" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold">Ver todas as perguntas <Icon name="arrow" className="h-4 w-4" /></Link>
          </div>
          <aside className="card h-fit bg-gradient-to-br from-brand-50 to-white p-6">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-700 text-white"><Icon name="track" className="h-6 w-6" /></span>
            <h2 className="mt-4 text-xl font-bold">Acompanhe sua solicitação</h2>
            <p className="mt-2 text-sm text-muted">Informe o número de protocolo e o código de acesso recebidos ao concluir sua solicitação.</p>
            <Link href="/acompanhar" className="btn-primary mt-5 w-full">Acompanhar solicitação</Link>
          </aside>
        </div>
      </section>
    </>
  );
}
