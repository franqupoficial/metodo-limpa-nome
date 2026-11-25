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
      <Container className="max-w-3xl pb-24 pt-6">
        {groups.map((g) => (
          <section key={g} className="mb-16"><h2 className="eyebrow mb-2 text-stone">{g}</h2>
            {items.filter((i) => i.group === g).map((i) => <details key={i.id} className="group border-b border-line py-6"><summary className="flex cursor-pointer list-none items-baseline justify-between gap-6 font-serif text-[1.35rem] leading-snug">{i.question}<span className="shrink-0 font-sans text-lg font-light text-stone transition-transform duration-300 group-open:rotate-45">+</span></summary><p className="mt-4 max-w-2xl whitespace-pre-line text-[14px] leading-relaxed text-ink/70">{i.answer}</p></details>)}
          </section>
        ))}
      </Container>
    </>
  );
}
