import type { Metadata } from "next";
import Link from "next/link";
import { Notice, PageHero, Section } from "@/components/ui";

export const metadata: Metadata = { title: "Como funciona o empréstimo para negativados", description: "Do cadastro à liberação: cada etapa do empréstimo de até R$ 3.000,00 no Portal Consumidor.", alternates: { canonical: "/emprestimo/como-funciona" } };

const STEPS = [
  { t: "Cadastro", d: "Preencha seus dados pessoais, endereço, valor desejado (até R$ 3.000,00), dia de vencimento e a forma de débito automático preferida." },
  { t: "Aprovação da proposta", d: "A instituição concedente avalia a proposta e define o valor aprovado e as condições. Ter restrições no CPF não impede a contratação deste produto." },
  { t: "Condições contratuais", d: "Você recebe valor liberado, número e valor das parcelas, taxa de juros, Custo Efetivo Total (CET), encargos e datas de vencimento." },
  { t: "Contrato por e-mail em até 24 horas", d: "Com o aceite das condições, o contrato é enviado ao e-mail cadastrado em até 24 horas, conforme o fluxo operacional." },
  { t: "Autorização do débito automático", d: "As parcelas são debitadas automaticamente no dia que você escolheu, no cartão de crédito ou em conta corrente. Os dados de pagamento são informados apenas no ambiente seguro do processador de pagamentos." },
  { t: "Liberação do valor", d: "Contrato assinado e débito autorizado: o crédito é liberado na sua conta." },
];

export default function Page() {
  return (
    <>
      <PageHero eyebrow="Empréstimo" title="Como funciona" subtitle="Do cadastro à liberação do crédito." crumbs={[{ href: "/emprestimo", label: "Empréstimo" }, { label: "Como funciona" }]} />
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
          <Notice tone="warn" title="Consequências do atraso">
            Juros de mora, multa (limitada a 2% conforme o CDC), cobrança dos valores devidos, vencimento antecipado quando previsto em contrato e, após notificação prévia, inclusão em cadastros de proteção ao crédito.
          </Notice>
          <Notice tone="info" title="Direito de arrependimento">Você pode desistir em até 7 dias após a contratação (art. 49 do CDC).</Notice>
          <Link href="/emprestimo/solicitar" className="btn-primary">Solicitar meu empréstimo</Link>
        </div>
      </Section>
    </>
  );
}
