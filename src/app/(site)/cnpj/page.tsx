import type { Metadata } from "next";
import Link from "next/link";
import { getSetting } from "@/lib/settings";
import { formatMoney } from "@/lib/format";
import { Faq, InfoCard, Notice, PageHero, Section, Steps } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { FAQ_CNPJ } from "@/content/faq";

export const metadata: Metadata = {
  title: "Abra seu CNPJ — assistência à formalização",
  description: "Formalize seu negócio com suporte digital. Organize sua solicitação de formalização empresarial de forma simples e intuitiva.",
  alternates: { canonical: "/cnpj" },
};

export default async function CnpjPage() {
  const { priceCents } = await getSetting("service.cnpj");
  return (
    <>
      <PageHero eyebrow="Abra seu CNPJ" title="Formalize seu negócio com suporte digital." subtitle="Organize sua solicitação de formalização empresarial de forma simples e intuitiva." crumbs={[{ href: "/servicos", label: "Serviços" }, { label: "Abra seu CNPJ" }]}>
        <div className="flex flex-wrap gap-3">
          <Link href="/cnpj/solicitar" className="btn-primary">Iniciar solicitação <Icon name="arrow" className="h-4 w-4" /></Link>
          <a href="#como-funciona" className="btn-secondary">Como funciona</a>
        </div>
      </PageHero>
      <Section>
        <Notice tone="warn" title="A abertura de MEI pelos canais oficiais é gratuita.">
          O valor de {formatMoney(priceCents)} cobrado pelo Portal Consumidor refere-se exclusivamente ao serviço privado de assistência e formalização, e não a uma taxa governamental. Se preferir, você pode se formalizar sem custo diretamente no portal oficial do governo.
        </Notice>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <InfoCard icon="briefcase" title="Orientação de enquadramento">Ajudamos a entender se seu negócio se enquadra como MEI ou em outro porte, conforme atividade e faturamento.</InfoCard>
          <InfoCard icon="doc" title="Organização das informações">Conferimos atividades, endereço, forma de atuação e dados necessários para evitar erros e retrabalho.</InfoCard>
          <InfoCard icon="track" title="Acompanhamento">Você acompanha cada etapa pelo protocolo e recebe orientações sobre obrigações mensais e anuais.</InfoCard>
        </div>
      </Section>
      <Section id="como-funciona" eyebrow="Como funciona" title="Etapas da solicitação" className="bg-surface">
        <Steps steps={[
          { title: "Dados pessoais", text: "Nome, CPF, data de nascimento e contatos do responsável." },
          { title: "Endereço", text: "Endereço residencial, com preenchimento automático pelo CEP." },
          { title: "Dados empresariais", text: "Nome fantasia, atividades, tipo de negócio, forma de atuação e capital inicial." },
          { title: "Revisão", text: "Você confere o resumo e aceita a política de privacidade e os termos." },
          { title: "Solicitação", text: "Sua solicitação recebe um protocolo. O pagamento do serviço é solicitado posteriormente, pelos canais oficiais." },
        ]} />
      </Section>
      <Section eyebrow="Investimento" title="Valor do serviço de assistência">
        <div className="grid items-center gap-6 md:grid-cols-[320px_1fr]">
          <div className="card border-brand-300 p-6 text-center">
            <p className="text-sm text-muted">Serviço privado de assistência</p>
            <p className="mt-1 text-5xl font-extrabold text-brand-800">{formatMoney(priceCents)}</p>
            <Link href="/cnpj/solicitar" className="btn-primary mt-5 w-full">Solicitar assistência</Link>
          </div>
          <div className="prose-portal text-sm">
            <p>O checkout ainda não está disponível no portal. Após o envio, nossa equipe analisa as informações e envia as instruções de pagamento pelos canais oficiais do Portal Consumidor.</p>
            <p>Depois de formalizado, o MEI paga mensalmente o Documento de Arrecadação do Simples Nacional (DAS) e entrega a declaração anual de faturamento — valores e obrigações definidos pela legislação, independentes do nosso serviço.</p>
          </div>
        </div>
      </Section>
      <Section eyebrow="Dúvidas" title="Perguntas frequentes"><Faq items={FAQ_CNPJ} /></Section>
    </>
  );
}
