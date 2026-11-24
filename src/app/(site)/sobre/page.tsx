import type { Metadata } from "next";
import Link from "next/link";
import { getSetting } from "@/lib/settings";
import { PageHero, Section } from "@/components/ui";

export const metadata: Metadata = { title: "Sobre a empresa", description: "Quem somos, como trabalhamos e nossas políticas.", alternates: { canonical: "/sobre" } };

export default async function Sobre() {
  const c = await getSetting("site.contact");
  return (
    <>
      <PageHero eyebrow="Institucional" title="Sobre a empresa" subtitle="Quem somos, como trabalhamos e quais são nossas políticas." crumbs={[{ label: "Sobre a empresa" }]} />
      <Section>
        <div className="prose-portal max-w-3xl">
          <h2>Quem somos</h2>
          <p>O {c.companyName} é uma empresa privada de serviços ao consumidor. Atuamos na regularização de apontamentos em cadastros de crédito, na abertura e formalização de empresas, na intermediação de crédito e na locação de veículos para motoristas de aplicativo (LVB).</p>
          <h2>Dados da empresa</h2>
          <ul>
            <li><strong>Razão social:</strong> {c.companyName}</li>
            {c.cnpj && <li><strong>CNPJ:</strong> {c.cnpj}</li>}
            {c.address && <li><strong>Endereço:</strong> {c.address}</li>}
            {c.email && <li><strong>E-mail:</strong> {c.email}</li>}
            {c.hours && <li><strong>Atendimento:</strong> {c.hours}</li>}
          </ul>
          <h2>Nossas políticas</h2>
          <ul>
            <li>Somos uma empresa privada, sem vínculo com órgãos públicos, com o Serasa, o SPC ou a Boa Vista. As marcas citadas pertencem aos respectivos titulares.</li>
            <li>Os valores cobrados remuneram exclusivamente os nossos serviços. Alguns procedimentos também podem ser feitos diretamente pelo consumidor nos canais oficiais.</li>
            <li>A LVB é a nossa operação própria de locação de veículos, formalizada por contrato.</li>
            <li>Pagamentos são feitos somente pelos canais do portal, em nome de {c.companyName}. Nunca cobramos valores antecipados para liberar crédito.</li>
            <li>Tratamos dados pessoais conforme a LGPD. Veja a <Link href="/privacidade">Política de Privacidade</Link> e os <Link href="/termos">Termos de Uso</Link>.</li>
          </ul>
        </div>
      </Section>
    </>
  );
}
