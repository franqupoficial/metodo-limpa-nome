import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Markdown } from "@/lib/markdown";
import { formatDate } from "@/lib/format";
import { Notice, PageHero } from "./ui";

export async function InstitutionalPage({ slug, crumbs, tone = "brand" }: { slug: string; crumbs?: { href?: string; label: string }[]; tone?: "brand" | "lvb" }) {
  const page = await prisma.page.findUnique({ where: { slug } });
  if (!page) notFound();
  return (
    <>
      <PageHero tone={tone} title={page.title} crumbs={crumbs ?? [{ label: page.title }]} subtitle={`Última atualização: ${formatDate(page.updatedAt)}`} />
      <div className="container-portal py-10">
        <div className="mx-auto max-w-3xl">
          {!page.legalReviewed && (
            <div className="mb-8">
              <Notice tone="warn" title="Conteúdo em revisão">Este texto é uma versão inicial, sujeita à revisão jurídica antes da publicação definitiva. As condições aplicáveis a cada contratação constam do respectivo contrato.</Notice>
            </div>
          )}
          <Markdown source={page.content} />
        </div>
      </div>
    </>
  );
}
