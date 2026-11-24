import { prisma } from "@/lib/db";
import { Container } from "@/components/site/Section";
import { PageTitle } from "@/components/site/CatalogView";

export const metadata = { title: "Perguntas frequentes" };

export default async function Faq() {
  const items = await prisma.faqItem.findMany({ where: { active: true }, orderBy: [{ group: "asc" }, { position: "asc" }] });
  const groups = [...new Set(items.map((i) => i.group))];
  const ld = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: items.map((i) => ({ "@type": "Question", name: i.question, acceptedAnswer: { "@type": "Answer", text: i.answer } })) };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <PageTitle eyebrow="Atendimento" title="Perguntas frequentes" />
      <Container className="max-w-3xl py-14">
        {groups.map((g) => (
          <section key={g} className="mb-12"><h2 className="eyebrow mb-4 text-gold-2">{g}</h2>
            {items.filter((i) => i.group === g).map((i) => <details key={i.id} className="group border-b border-line py-5"><summary className="flex cursor-pointer list-none justify-between gap-4 font-serif text-xl">{i.question}<span className="text-gold transition group-open:rotate-45">+</span></summary><p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink/75">{i.answer}</p></details>)}
          </section>
        ))}
      </Container>
    </>
  );
}
