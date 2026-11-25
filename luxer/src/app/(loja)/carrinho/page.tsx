import Link from "next/link";
import { getCartView } from "@/lib/cart";
import { Container, PageHeading } from "@/components/site/Section";
import { CartView } from "@/components/site/CartView";

export const metadata = { title: "Sacola", robots: { index: false } };

export default async function CartPage() {
  const c = await getCartView();
  return (
    <Container className="pb-24 pt-10 sm:pt-16">
      <PageHeading eyebrow={c.lines.length ? `${c.count} ${c.count === 1 ? "peça" : "peças"}` : undefined} title="Sua sacola" />
      {c.lines.length === 0 ? (
        <div className="py-16 text-center"><p className="font-serif text-2xl text-ink/80">Sua sacola está vazia.</p><Link href="/" className="btn-gold mt-10">Descobrir joias</Link></div>
      ) : (
        <CartView lines={c.lines} subtotal={c.subtotalCents} discount={c.discountCents} coupon={c.coupon} pixSavings={c.pixSavingsCents} pixPct={c.payment.pixDiscountBps / 100} inst={{ max: c.installments.max, value: c.installments.plan.value }} />
      )}
    </Container>
  );
}
