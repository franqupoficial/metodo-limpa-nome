import type { Metadata } from "next";
import { Faq, PageHero, Section } from "@/components/ui";
import { FAQ_CNPJ, FAQ_CONSUMIDOR, FAQ_EMPRESTIMO, FAQ_GERAL, FAQ_LVB } from "@/content/faq";

export const metadata: Metadata = { title: "Perguntas frequentes", description: "Respostas para as dúvidas mais comuns sobre os serviços do Portal Consumidor.", alternates: { canonical: "/perguntas-frequentes" } };

const GROUPS = [
  { id: "geral", title: "Sobre o portal", items: FAQ_GERAL },
  { id: "consumidor", title: "Regularização de apontamentos", items: FAQ_CONSUMIDOR },
  { id: "cnpj", title: "Abra seu CNPJ", items: FAQ_CNPJ },
  { id: "emprestimo", title: "Empréstimo para negativados", items: FAQ_EMPRESTIMO },
  { id: "lvb", title: "LVB — Locação de veículos", items: FAQ_LVB },
];

export default function Page() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: GROUPS.flatMap((g) => g.items).map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } })),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <PageHero eyebrow="Ajuda" title="Perguntas frequentes" subtitle="Encontre respostas sobre nossos serviços, segurança e acompanhamento." crumbs={[{ label: "Perguntas frequentes" }]}>
        <nav aria-label="Temas" className="flex flex-wrap gap-2">
          {GROUPS.map((g) => <a key={g.id} href={`#${g.id}`} className="badge border border-line bg-white px-3 py-1 text-sm text-ink no-underline hover:border-brand-300">{g.title}</a>)}
        </nav>
      </PageHero>
      {GROUPS.map((g) => (
        <Section key={g.id} id={g.id} title={g.title} className="!py-8">
          <div className="max-w-3xl"><Faq items={g.items} tone={g.id === "lvb" ? "lvb" : "brand"} /></div>
        </Section>
      ))}
    </>
  );
}
