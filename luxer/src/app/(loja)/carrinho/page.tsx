import Link from "next/link";
import { getCartView } from "@/lib/cart";
import { Container } from "@/components/site/Section";
import { CartView } from "@/components/site/CartView";

export const metadata = { title: "Sacola", robots: { index: false } };

export default async function CartPage() {
  const c = await getCartView();
  return (
    <Container className="py-12 sm:py-16">
      <h1 className="display mb-10 text-5xl">Sua sacola</h1>
      {c.lines.length === 0 ? (
        <div className="py-20 text-center"><p className="font-serif text-2xl">Sua sacola está vazia.</p><Link href="/" className="btn-gold mt-8">Descobrir joias</Link></div>
      ) : (
        <CartView lines={c.lines} subtotal={c.subtotalCents} discount={c.discountCents} coupon={c.coupon} pixSavings={c.pixSavingsCents} pixPct={c.payment.pixDiscountBps / 100} inst={{ max: c.installments.max, value: c.installments.plan.value }} />
      )}
    </Container>
  );
}
