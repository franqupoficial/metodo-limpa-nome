import type { Metadata } from "next";
import Link from "next/link";
import { InfoCard, Notice, PageHero, Section } from "@/components/ui";

export const metadata: Metadata = { title: "Central de informações", description: "Direitos do consumidor, segurança, prevenção a golpes, LGPD e canais oficiais gratuitos.", alternates: { canonical: "/informacoes" } };

export default function Page() {
  return (
    <>
      <PageHero eyebrow="Informações" title="Central de informações" subtitle="Orientações para você tomar decisões com segurança." crumbs={[{ label: "Informações" }]} />
      <Section>
        <div className="grid gap-5 md:grid-cols-3">
          <InfoCard icon="scale" title="Direitos do consumidor" href="#direitos">CDC, cadastros de crédito, prazos e como contestar.</InfoCard>
          <InfoCard icon="lock" title="Segurança e golpes" href="#seguranca">Como reconhecer canais oficiais e evitar fraudes.</InfoCard>
          <InfoCard icon="info" title="Transparência" href="#transparencia">Quem somos e como funcionam nossos serviços.</InfoCard>
        </div>
      </Section>
      <Section id="direitos" title="Direitos do consumidor" className="bg-surface">
        <div className="prose-portal max-w-3xl">
          <p>O Código de Defesa do Consumidor (Lei 8.078/1990) garante, entre outros direitos:</p>
          <ul>
            <li><strong>Informação clara</strong> sobre produtos e serviços, inclusive preço, riscos e condições (art. 6º, III).</li>
            <li><strong>Acesso aos cadastros</strong> com informações a seu respeito, e comunicação prévia por escrito antes de qualquer registro negativo (art. 43).</li>
            <li><strong>Correção</strong> de informações inexatas em cadastros, com prazo de 5 dias úteis para comunicação aos destinatários (art. 43, §3º).</li>
            <li><strong>Limite de 5 anos</strong> para permanência de informações negativas (art. 43, §1º).</li>
            <li><strong>Cobrança sem constrangimento</strong> ou ameaça (art. 42).</li>
            <li><strong>Direito de arrependimento</strong> em até 7 dias para contratações fora do estabelecimento comercial (art. 49).</li>
          </ul>
          <p>Canais públicos gratuitos: Procon do seu estado ou município, plataforma consumidor.gov.br, Defensoria Pública e Juizados Especiais Cíveis.</p>
        </div>
      </Section>
      <Section id="seguranca" title="Segurança e prevenção a golpes">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="prose-portal">
            <ul>
              <li>Nunca pague valores antecipados para liberar empréstimo.</li>
              <li>Não informe senhas, códigos recebidos por SMS ou dados completos do cartão por telefone, e-mail ou mensagens.</li>
              <li>Confira se o pagamento é destinado a uma empresa (CNPJ), nunca a pessoa física desconhecida.</li>
              <li>Desconfie de promessas de “limpar nome” garantido, aumento de score garantido ou aprovação garantida.</li>
              <li>Na dúvida, entre em contato pelos canais da página <Link href="/contato">Contato</Link>.</li>
            </ul>
          </div>
          <Notice tone="info" title="Proteção de dados (LGPD)">
            Tratamos dados pessoais conforme a Lei 13.709/2018. Coletamos apenas o necessário para cada serviço, armazenamos dados sensíveis de forma criptografada e registramos todos os acessos administrativos. Saiba mais na <Link href="/privacidade" className="font-semibold">Política de Privacidade</Link>.
          </Notice>
        </div>
      </Section>
      <Section id="transparencia" title="Transparência" className="bg-surface">
        <div className="prose-portal max-w-3xl">
          <p>O Portal Consumidor é uma empresa de serviços ao consumidor. Conheça nossos dados e políticas na página <Link href="/sobre">Sobre a empresa</Link>.</p>
          <p>Nossos serviços são opcionais e pagos quando indicado. Sempre que existir alternativa gratuita em canal oficial — como a abertura de MEI ou a contestação de registros em cadastros de crédito — informamos isso de forma clara.</p>
          <p>Cada serviço tem suas condições descritas de forma clara antes da contratação. Empréstimos dependem de aprovação de crédito e locações, de aprovação cadastral e contrato.</p>
        </div>
      </Section>
    </>
  );
}
