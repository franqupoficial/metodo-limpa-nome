import type { Metadata } from "next";
import Link from "next/link";
import { getPublicCategories, getPublicVehicles } from "@/lib/catalog";
import { getClientPlanSettings, toClientVehicle } from "@/lib/lvb";
import { formatMoney } from "@/lib/format";
import { LvbSubnav } from "@/components/lvb/LvbSubnav";
import { VehicleCard } from "@/components/lvb/VehicleCard";
import { Simulator } from "@/components/lvb/Simulator";
import { CarIllustration } from "@/components/lvb/CarIllustration";
import { Faq, Notice } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { FAQ_LVB } from "@/content/faq";

export const metadata: Metadata = {
  title: "LVB — Locação de Veículos para motoristas de aplicativo",
  description: "Alugue seu carro para trabalhar na Uber, 99 e outros aplicativos. Planos de 12, 24 e 36 meses, primeira parcela na contratação e vencimento no dia que você escolher.",
  alternates: { canonical: "/lvb" },
};
export const revalidate = 300;

export default async function LvbHome() {
  const [vehicles, categories, settings] = await Promise.all([getPublicVehicles(), getPublicCategories(), getClientPlanSettings()]);
  const cv = vehicles.map(toClientVehicle);

  return (
    <>
      <LvbSubnav current="/lvb" />
      <section className="relative overflow-hidden bg-gradient-to-br from-lvb-900 via-lvb-700 to-lvb-600 text-white">
        <div aria-hidden className="absolute -right-10 top-10 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
        <div className="container-portal relative grid items-center gap-8 py-12 sm:py-16 lg:grid-cols-2">
          <div className="animate-fade-up">
            <p className="text-xs font-bold uppercase tracking-widest text-lvb-100">LVB — Locação de Veículos</p>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight text-white sm:text-5xl">Seu próximo carro para trabalhar.</h1>
            <p className="mt-4 text-lg text-lvb-100">Escolha o carro no catálogo, defina o plano de 12, 24 ou 36 meses e faça sua locação online. Primeira parcela na contratação e as demais no dia que você escolher.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/lvb/veiculos" className="btn bg-accent text-lvb-900 hover:brightness-95">Ver catálogo <Icon name="arrow" className="h-4 w-4" /></Link>
              <Link href="/lvb/simulador" className="btn border border-white/40 text-white hover:bg-white/10">Simular plano</Link>
            </div>
            <p className="mt-5 text-xs text-lvb-100">Operação privada de locação. Não é programa governamental. Locação mediante aprovação cadastral e contrato.</p>
          </div>
          <div className="hidden lg:block"><div className="overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/20"><CarIllustration category="Sedan" className="w-full" /></div></div>
        </div>
      </section>

      <section className="py-12">
        <div className="container-portal">
          <p className="eyebrow text-lvb-600">Categorias</p>
          <h2 className="section-title mt-1">Escolha a categoria ideal</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <Link key={c.id} href={`/lvb/veiculos?categoria=${c.slug}`} className="card-hover group flex gap-4 p-4 no-underline">
                <div className="h-20 w-28 shrink-0 overflow-hidden rounded-lg"><CarIllustration category={c.name} className="h-full w-full" /></div>
                <div className="min-w-0">
                  <h3 className="font-bold text-ink group-hover:text-lvb-700">{c.name}</h3>
                  <p className="truncate text-xs text-muted">{c.referenceModels}</p>
                  <p className="mt-1 text-sm">a partir de <strong className="text-lvb-700">{formatMoney(c.fromCents)}/mês</strong></p>
                </div>
              </Link>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted">{settings.priceNotice}</p>
        </div>
      </section>

      <section className="bg-surface py-12">
        <div className="container-portal">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="eyebrow text-lvb-600">Catálogo</p><h2 className="section-title mt-1">Veículos em destaque</h2></div>
            <Link href="/lvb/veiculos" className="btn-secondary border-lvb-600 text-lvb-700 hover:bg-lvb-50">Ver todos</Link>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{cv.slice(0, 6).map((v) => <VehicleCard key={v.id} v={v} />)}</div>
          <p className="mt-4 text-xs text-muted">Imagens ilustrativas. Os modelos indicados podem ser substituídos por similares da mesma categoria, conforme disponibilidade.</p>
        </div>
      </section>

      <section className="py-12">
        <div className="container-portal">
          <p className="eyebrow text-lvb-600">Benefícios</p>
          <h2 className="section-title mt-1">Pensado para quem trabalha com aplicativos</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["route", "Planos de longo prazo", "Contratos de 12, 24 ou 36 meses com valor mensal definido no início."],
              ["doc", "Solicitação digital", "Envie seus dados e documentos online e acompanhe pelo protocolo."],
              ["scale", "Condições transparentes", "Custos, franquias e coberturas informados antes da contratação."],
              ["calendar", "Data de pagamento", "Escolha o melhor dia do mês para as cobranças recorrentes."],
            ].map(([icon, t, d]) => (
              <div key={t} className="card p-5">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-lvb-50 text-lvb-700"><Icon name={icon} /></span>
                <h3 className="mt-3 font-semibold">{t}</h3>
                <p className="mt-1 text-sm text-muted">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-lvb-50/60 py-12">
        <div className="container-portal">
          <p className="eyebrow text-lvb-600">Planos</p>
          <h2 className="section-title mt-1">Prazos de contratação</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[12, 24, 36].map((t) => (
              <div key={t} className="card p-6">
                <p className="text-4xl font-extrabold text-lvb-700">{t}<span className="text-lg font-semibold text-muted"> meses</span></p>
                <p className="mt-2 text-sm text-muted">Primeira parcela via Pix ao concluir o pedido e {t - 1} parcelas mensais por Pix ou boleto no dia escolhido.</p>
                {Number(settings.termAdjustments[String(t)] ?? 0) !== 0 && <p className="mt-2 text-xs font-semibold text-lvb-700">Ajuste sobre o valor base: {settings.termAdjustments[String(t)]}%</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12" id="simulador">
        <div className="container-portal">
          <p className="eyebrow text-lvb-600">Simulador</p>
          <h2 className="section-title mb-6 mt-1">Simule seu plano</h2>
          <Simulator vehicles={cv} settings={settings} />
        </div>
      </section>

      <section className="bg-surface py-12">
        <div className="container-portal grid gap-10 lg:grid-cols-2">
          <div>
            <p className="eyebrow text-lvb-600">Como funciona</p>
            <h2 className="section-title mt-1">Da escolha à retirada</h2>
            <ol className="mt-5 space-y-3">
              {["Escolha o veículo", "Escolha o plano", "Formulário de locação", "Aprovação cadastral", "Assinatura do contrato", "Primeira parcela", "Retirada do veículo", "Parcelas recorrentes"].map((s, i) => (
                <li key={s} className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-lvb-600 text-xs font-bold text-white">{i + 1}</span>{s}</li>
              ))}
            </ol>
            <Link href="/lvb/como-funciona" className="btn-lvb mt-6">Entenda cada etapa</Link>
          </div>
          <div>
            <p className="eyebrow text-lvb-600">Perguntas frequentes</p>
            <h2 className="section-title mb-5 mt-1">Dúvidas sobre a locação</h2>
            <Faq items={FAQ_LVB} tone="lvb" />
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container-portal grid gap-5 md:grid-cols-2">
          <div className="card p-6">
            <h2 className="text-xl font-bold">Pronto para alugar?</h2>
            <p className="mt-2 text-sm text-muted">Formulário completo de locação em 7 etapas. Aprovado o cadastro, você assina o contrato, paga a primeira parcela e agenda a retirada.</p>
            <Link href="/lvb/solicitar" className="btn-lvb mt-5">Alugar agora</Link>
          </div>
          <div className="card p-6">
            <h2 className="text-xl font-bold">Já fez sua solicitação?</h2>
            <p className="mt-2 text-sm text-muted">Acompanhe o andamento com o protocolo e o código de acesso.</p>
            <Link href="/acompanhar" className="btn-secondary mt-5">Acompanhar solicitação</Link>
          </div>
        </div>
        <div className="container-portal mt-6">
          <Notice tone="info">A LVB é uma operação privada de locação de veículos, integrante do Portal Consumidor. Não se trata de programa governamental, locação subsidiada ou veículo arrendado pelo governo.</Notice>
        </div>
      </section>
    </>
  );
}
