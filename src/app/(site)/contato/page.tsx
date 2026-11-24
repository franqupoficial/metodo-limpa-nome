import type { Metadata } from "next";
import Link from "next/link";
import { getSetting } from "@/lib/settings";
import { Notice, PageHero, Section } from "@/components/ui";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = { title: "Contato", description: "Fale com o Portal Consumidor.", alternates: { canonical: "/contato" } };
export const dynamic = "force-dynamic";

export default async function Page() {
  const c = await getSetting("site.contact");
  const items = [
    ["mail", "E-mail", c.email, c.email ? `mailto:${c.email}` : null],
    ["phone", "Telefone", c.phone, c.phone ? `tel:${c.phone.replace(/\D/g, "")}` : null],
    ["phone", "WhatsApp", c.whatsapp, c.whatsapp ? `https://wa.me/55${c.whatsapp.replace(/\D/g, "")}` : null],
    ["clock", "Horário de atendimento", c.hours, null],
  ].filter(([, , v]) => v) as [string, string, string, string | null][];
  return (
    <>
      <PageHero eyebrow="Atendimento" title="Contato" subtitle="Fale com nossa equipe. Para acompanhar uma solicitação, use o protocolo e o código de acesso." crumbs={[{ label: "Contato" }]} />
      <Section>
        <div className="grid gap-5 md:grid-cols-2">
          {items.map(([icon, label, value, href]) => (
            <div key={label} className="card flex gap-4 p-5">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Icon name={icon} /></span>
              <div><p className="text-sm text-muted">{label}</p>{href ? <a href={href} className="font-semibold">{value}</a> : <p className="font-semibold">{value}</p>}</div>
            </div>
          ))}
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Notice tone="info" title="Direitos do titular de dados (LGPD)">Para solicitar acesso, correção, exclusão ou portabilidade dos seus dados, envie um e-mail informando o protocolo da solicitação. Nunca envie documentos ou senhas por e-mail sem solicitação da equipe.</Notice>
          <Notice tone="warn" title="Segurança">Não solicitamos pagamentos por canais não oficiais nem antecipação de valores para liberar crédito. <Link href="/informacoes#seguranca" className="font-semibold">Saiba mais</Link>.</Notice>
        </div>
        {c.companyName && <p className="mt-8 text-sm text-muted">{c.companyName}{c.cnpj ? ` — CNPJ ${c.cnpj}` : ""}{c.address ? ` — ${c.address}` : ""}</p>}
      </Section>
    </>
  );
}
