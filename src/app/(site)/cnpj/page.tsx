import type { Metadata } from "next";
import Link from "next/link";
import { getSetting } from "@/lib/settings";
import { formatMoney } from "@/lib/format";
import { Faq, InfoCard, Notice, PageHero, Section, Steps } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { FAQ_CNPJ } from "@/content/faq";

export const metadata: Metadata = {
  title: "Abra seu CNPJ — assistência à abertura e formalização",
  description: "Serviço de assistência à abertura de CNPJ: enquadramento, definição de atividades, registro e orientações até a emissão do CNPJ. R$ 199,00.",
  alternates: { canonical: "/cnpj" },
};

export default async function CnpjPage() {
  const { priceCents } = await getSetting("service.cnpj");
  return (
    <>
      <PageHero eyebrow="Abra seu CNPJ" title="Formalize seu negócio com suporte digital." subtitle="Nossa equipe conduz a abertura do seu CNPJ com você: enquadramento, atividades, registro e orientação até o CNPJ emitido." crumbs={[{ href: "/servicos", label: "Serviços" }, { label: "Abra seu CNPJ" }]}>
        <div className="flex flex-wrap gap-3">
          <Link href="/cnpj/solicitar" className="btn-primary">Contratar abertura de CNPJ <Icon name="arrow" className="h-4 w-4" /></Link>
          <a href="#como-funciona" className="btn-secondary">Como funciona</a>
        </div>
      </PageHero>
      <Section>
        <Notice tone="warn" title="A abertura de MEI pelos canais oficiais é gratuita.">
          O valor de {formatMoney(priceCents)} cobrado pelo Portal Consumidor refere-se exclusivamente ao serviço privado de assistência e formalização, e não a uma taxa governamental. Se preferir, você pode se formalizar sem custo diretamente no portal oficial do governo.
        </Notice>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <InfoCard icon="briefcase" title="Enquadramento">Definimos com você o porte adequado (MEI, ME ou EPP) conforme atividade e faturamento previsto.</InfoCard>
          <InfoCard icon="doc" title="Atividades e registro">Escolhemos os códigos de atividade (CNAE), conferimos endereço e forma de atuação e conduzimos o registro com você.</InfoCard>
          <InfoCard icon="track" title="CNPJ emitido e orientações">Entregamos o CNPJ com o guia das obrigações mensais e anuais e acompanhamento por protocolo.</InfoCard>
        </div>
      </Section>
      <Section id="como-funciona" eyebrow="Como funciona" title="Como funciona a contratação" className="bg-surface">
        <Steps steps={[
          { title: "Dados pessoais", text: "Nome, CPF, data de nascimento e contatos do responsável." },
          { title: "Endereço", text: "Endereço residencial, com preenchimento automático pelo CEP." },
          { title: "Dados empresariais", text: "Nome fantasia, atividades, tipo de negócio, forma de atuação e capital inicial." },
          { title: "Revisão", text: "Você confere o resumo e aceita a política de privacidade e os termos." },
          { title: "Contratação e execução", text: "Você recebe protocolo, realiza o pagamento pelos canais oficiais do portal e nossa equipe inicia a abertura do CNPJ." },
        ]} />
      </Section>
      <Section eyebrow="Investimento" title="Valor do serviço de assistência">
        <div className="grid items-center gap-6 md:grid-cols-[320px_1fr]">
          <div className="card border-brand-300 p-6 text-center">
            <p className="text-sm text-muted">Serviço privado de assistência</p>
            <p className="mt-1 text-5xl font-extrabold text-brand-800">{formatMoney(priceCents)}</p>
            <Link href="/cnpj/solicitar" className="btn-primary mt-5 w-full">Contratar abertura de CNPJ</Link>
          </div>
          <div className="prose-portal text-sm">
            <p>Valor único pelo serviço completo de assistência: enquadramento, definição de atividades, condução do registro e orientações após a emissão do CNPJ. As instruções de pagamento são enviadas pelos canais oficiais do Portal Consumidor logo após a contratação.</p>
            <p>Depois de formalizado, o MEI paga mensalmente o Documento de Arrecadação do Simples Nacional (DAS) e entrega a declaração anual de faturamento — valores e obrigações definidos pela legislação, independentes do nosso serviço.</p>
          </div>
        </div>
      </Section>
      <Section eyebrow="Dúvidas" title="Perguntas frequentes"><Faq items={FAQ_CNPJ} /></Section>
    </>
  );
}
