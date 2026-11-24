import type { Metadata } from "next";
import Link from "next/link";
import { Notice, PageHero, Section } from "@/components/ui";

export const metadata: Metadata = { title: "Como funciona o empréstimo", description: "Entenda cada etapa da solicitação de crédito no Portal Consumidor.", alternates: { canonical: "/emprestimo/como-funciona" } };

const STEPS = [
  { t: "Preencha seus dados", d: "Informe seus dados pessoais, endereço, valor desejado e data de vencimento preferida. A solicitação é digital e leva poucos minutos." },
  { t: "Sua proposta será submetida à análise", d: "As informações são avaliadas quanto à elegibilidade e ao perfil de crédito, mediante sua autorização. Possuir restrições não impede a solicitação, mas pode influenciar o resultado." },
  { t: "Condições informadas, caso aprovada", d: "Se a proposta for aprovada, você recebe as condições completas: valor liberado, número e valor das parcelas, taxa de juros, Custo Efetivo Total (CET), encargos, vencimentos e demais condições contratuais. Você decide se deseja contratar." },
  { t: "Contrato enviado por e-mail", d: "Com o aceite das condições, o contrato é enviado ao seu e-mail em até 24 horas, conforme o fluxo de contratação. Leia com atenção antes de assinar." },
  { t: "Autorização segura de cobrança", d: "Quando houver cobrança automática por cartão, a autorização ocorre exclusivamente por meio de mecanismo seguro do fornecedor de pagamentos. O portal não armazena número completo de cartão nem código de segurança (CVV)." },
];

export default function Page() {
  return (
    <>
      <PageHero eyebrow="Empréstimo" title="Como funciona" subtitle="Entenda cada etapa, do pedido à contratação." crumbs={[{ href: "/emprestimo", label: "Empréstimo" }, { label: "Como funciona" }]} />
      <Section>
        <ol className="relative max-w-3xl space-y-6 border-l-2 border-brand-100 pl-8">
          {STEPS.map((s, i) => (
            <li key={i} className="relative">
              <span className="absolute -left-[45px] flex h-8 w-8 items-center justify-center rounded-full bg-brand-700 text-sm font-bold text-white">{i + 1}</span>
              <p className="eyebrow">Etapa {i + 1}</p>
              <h2 className="mt-1 text-xl font-bold">{s.t}</h2>
              <p className="mt-1 text-muted">{s.d}</p>
            </li>
          ))}
        </ol>
        <div className="mt-10 max-w-3xl space-y-4">
          <Notice tone="warn" title="Consequências do inadimplemento">
            O atraso pode gerar juros de mora, multa (limitada a 2% conforme o CDC), cobrança dos valores devidos, vencimento antecipado quando previsto em contrato e, após notificação prévia, inclusão em cadastros de proteção ao crédito.
          </Notice>
          <Notice tone="info" title="Direito de arrependimento">Em contratações feitas fora do estabelecimento comercial, você pode desistir em até 7 dias (art. 49 do CDC).</Notice>
          <Link href="/emprestimo/solicitar" className="btn-primary">Fazer minha solicitação</Link>
        </div>
      </Section>
    </>
  );
}
