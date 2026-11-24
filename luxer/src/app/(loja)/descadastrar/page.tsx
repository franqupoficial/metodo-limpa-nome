import { prisma } from "@/lib/db";
import { unsubToken } from "@/lib/campaigns";
import { safeEqual } from "@/lib/crypto";
import { Container } from "@/components/site/Section";

export const metadata = { title: "Descadastrar", robots: { index: false } };

/** Descadastro em um clique (link assinado nos e-mails de marketing). */
export default async function Unsubscribe({ searchParams }: { searchParams: Promise<{ e?: string; t?: string }> }) {
  const { e, t } = await searchParams;
  const email = (e ?? "").toLowerCase();
  const valid = Boolean(email && t && safeEqual(unsubToken(email), t));
  if (valid) {
    await prisma.lead.updateMany({ where: { email }, data: { unsubscribedAt: new Date() } });
    await prisma.customer.updateMany({ where: { email }, data: { marketingOptIn: false } });
  }
  return (
    <Container className="max-w-xl py-24 text-center">
      <h1 className="display text-4xl">{valid ? "Descadastro concluído" : "Link inválido"}</h1>
      <p className="mt-4 text-stone">{valid ? "Você não receberá mais e-mails de marketing da Luxer. E-mails sobre seus pedidos continuam sendo enviados." : "Use o link mais recente recebido por e-mail ou altere suas preferências em Minha conta."}</p>
    </Container>
  );
}
