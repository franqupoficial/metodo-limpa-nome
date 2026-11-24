import type { Metadata } from "next";
import Link from "next/link";
import { getSetting } from "@/lib/settings";
import { formatMoney } from "@/lib/format";
import { Faq, InfoCard, Notice, PageHero, Section } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { FAQ_EMPRESTIMO } from "@/content/faq";

export const metadata: Metadata = {
  title: "Solicite crédito de até R$ 3.000,00",
  description: "Faça sua solicitação digital de empréstimo e consulte as condições disponíveis, mesmo que possua restrições cadastrais. Sujeito a análise e aprovação.",
  alternates: { canonical: "/emprestimo" },
};

export default async function EmprestimoPage() {
  const cfg = await getSetting("service.emprestimo");
  return (
    <>
      <PageHero eyebrow="Empréstimo" title={`Solicite crédito de até ${formatMoney(cfg.maxCents)}.`} subtitle="Faça sua solicitação digital e consulte as condições disponíveis, mesmo que possua restrições cadastrais." crumbs={[{ href: "/servicos", label: "Serviços" }, { label: "Empréstimo" }]}>
        <div className="flex flex-wrap gap-3">
          <Link href="/emprestimo/solicitar" className="btn-primary">Fazer solicitação <Icon name="arrow" className="h-4 w-4" /></Link>
          <Link href="/emprestimo/como-funciona" className="btn-secondary">Como funciona</Link>
        </div>
        <p className="mt-4 text-sm text-muted">A solicitação está sujeita à análise, elegibilidade, aprovação e contratação.</p>
      </PageHero>
      <Section>
        <div className="grid gap-5 md:grid-cols-3">
          <InfoCard icon="doc" title="100% digital">Preencha seus dados online, em poucos minutos, e acompanhe pelo protocolo.</InfoCard>
          <InfoCard icon="scale" title="Condições claras">Antes de contratar, você conhece valor, parcelas, juros, CET, encargos e vencimentos.</InfoCard>
          <InfoCard icon="shield" title="Sem cobrança antecipada">Nunca pedimos depósito ou pagamento para liberar crédito.</InfoCard>
        </div>
        <div className="mt-8">
          <Notice tone="danger" title="Atenção a golpes">
            Nenhuma instituição séria cobra valores antecipados para liberar empréstimo. Se receber esse tipo de pedido em nome do Portal Consumidor, não pague e comunique-nos pela página de contato.
          </Notice>
        </div>
      </Section>
      <Section eyebrow="Transparência" title="Inadimplemento: o que você precisa saber" className="bg-surface">
        <div className="prose-portal max-w-3xl">
          <p>Contratar crédito é um compromisso. Em caso de atraso no pagamento das parcelas, conforme a legislação aplicável e o contrato:</p>
          <ul>
            <li>podem incidir juros de mora e multa contratual, limitada a 2% do valor da prestação (art. 52, §1º, do CDC);</li>
            <li>os valores em atraso podem ser cobrados por meios legais, sem constrangimento ou ameaça (art. 42 do CDC);</li>
            <li>após comunicação prévia, o CPF pode ser incluído em cadastros de proteção ao crédito;</li>
            <li>pode haver vencimento antecipado das parcelas, quando previsto em contrato.</li>
          </ul>
          <p>Se estiver com dificuldades, procure renegociar antes do vencimento. A Lei 14.181/2021 (Lei do Superendividamento) prevê mecanismos de repactuação de dívidas.</p>
        </div>
      </Section>
      <Section eyebrow="Dúvidas" title="Perguntas frequentes"><Faq items={FAQ_EMPRESTIMO} /></Section>
    </>
  );
}
