import type { Metadata } from "next";
import Link from "next/link";
import { getSetting } from "@/lib/settings";
import { formatMoney } from "@/lib/format";
import { Faq, InfoCard, Notice, PageHero, Section } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { FAQ_EMPRESTIMO } from "@/content/faq";

export const metadata: Metadata = {
  title: "Empréstimo para negativados — até R$ 3.000,00",
  description: "Empréstimo para negativados de até R$ 3.000,00: cadastro digital, contrato por e-mail em até 24 horas e parcelas em débito automático na data que você escolher.",
  alternates: { canonical: "/emprestimo" },
};

export default async function EmprestimoPage() {
  const cfg = await getSetting("service.emprestimo");
  return (
    <>
      <PageHero eyebrow="Empréstimo" title={`Empréstimo para negativados — até ${formatMoney(cfg.maxCents)}.`} subtitle="Mesmo com nome restrito, faça seu cadastro online, escolha o valor e a data de vencimento e receba o contrato por e-mail." crumbs={[{ href: "/servicos", label: "Serviços" }, { label: "Empréstimo" }]}>
        <div className="flex flex-wrap gap-3">
          <Link href="/emprestimo/solicitar" className="btn-primary">Solicitar meu empréstimo <Icon name="arrow" className="h-4 w-4" /></Link>
          <Link href="/emprestimo/como-funciona" className="btn-secondary">Como funciona</Link>
        </div>
      </PageHero>

      <Section>
        <div className="grid gap-5 md:grid-cols-4">
          <InfoCard icon="doc" title="Cadastro online">Seus dados, endereço, valor e data de vencimento em poucos minutos.</InfoCard>
          <InfoCard icon="wallet" title={`De ${formatMoney(cfg.minCents)} a ${formatMoney(cfg.maxCents)}`}>Você escolhe o valor que precisa dentro do limite do produto.</InfoCard>
          <InfoCard icon="mail" title="Contrato em até 24 h">Aprovada a proposta, o contrato chega ao seu e-mail em até 24 horas.</InfoCard>
          <InfoCard icon="calendar" title="Débito automático">Parcelas debitadas automaticamente no dia do mês que você escolher.</InfoCard>
        </div>
      </Section>

      <Section eyebrow="Operação" title="Como funciona o empréstimo" className="bg-surface">
        <div className="grid gap-8 lg:grid-cols-2">
          <ol className="space-y-4">
            {[
              ["Cadastro", "Você preenche nome, CPF, data de nascimento, contatos e endereço."],
              ["Valor e vencimento", "Escolhe o valor desejado e o dia do mês para o vencimento das parcelas."],
              ["Aprovação", "A proposta passa pela aprovação de crédito da instituição concedente, que define o valor aprovado e as condições."],
              ["Condições contratuais", "Você recebe valor liberado, número e valor das parcelas, taxa de juros, Custo Efetivo Total (CET) e vencimentos."],
              ["Contrato por e-mail", "Aceitas as condições, o contrato é enviado ao seu e-mail em até 24 horas, conforme o fluxo operacional."],
              ["Autorização do débito automático", "Você autoriza o débito das parcelas no cartão de crédito ou em conta corrente, em ambiente seguro do processador de pagamentos."],
              ["Liberação do crédito", "Com o contrato assinado e a autorização registrada, o valor é liberado na sua conta."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-700 text-sm font-bold text-white">{i + 1}</span>
                <div><h3 className="font-semibold">{t}</h3><p className="text-sm text-muted">{d}</p></div>
              </li>
            ))}
          </ol>
          <div className="space-y-4">
            <div className="card p-6">
              <h3 className="font-bold">Informações necessárias</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {["CPF e documento de identificação", "Data de nascimento (maiores de 18 anos)", "Telefone celular e e-mail válidos", "Endereço completo com CEP", "Valor desejado e dia de vencimento", "Renda mensal aproximada (opcional, agiliza a aprovação)"].map((x) => (
                  <li key={x} className="flex items-start gap-2"><Icon name="check" className="mt-0.5 h-4 w-4 text-brand-600" />{x}</li>
                ))}
              </ul>
            </div>
            <div className="card p-6">
              <h3 className="font-bold">Solicitação, aprovação e liberação</h3>
              <p className="mt-2 text-sm text-muted">São três momentos diferentes: a <strong>solicitação</strong> é o seu cadastro; a <strong>aprovação</strong> é a decisão de crédito com as condições definidas; a <strong>liberação</strong> é o depósito do valor, que ocorre após a assinatura do contrato e a autorização do débito automático.</p>
            </div>
          </div>
        </div>
      </Section>

      <Section>
        <div className="grid gap-4 md:grid-cols-2">
          <Notice tone="danger" title="Nunca pague para liberar crédito">
            Não cobramos nenhum valor antecipado para liberar empréstimo. Se alguém pedir depósito antecipado em nome do Portal Consumidor, não pague e comunique-nos.
          </Notice>
          <Notice tone="warn" title="Em caso de atraso">
            Podem incidir juros de mora e multa contratual (limitada a 2% da parcela, art. 52, §1º, do CDC), cobrança dos valores devidos, vencimento antecipado quando previsto em contrato e, após notificação prévia, inclusão em cadastros de crédito. Contratos digitais permitem arrependimento em até 7 dias (art. 49 do CDC).
          </Notice>
        </div>
      </Section>

      <Section eyebrow="Dúvidas" title="Perguntas frequentes"><Faq items={FAQ_EMPRESTIMO} /></Section>
    </>
  );
}
