import { redirect } from "next/navigation";
import { getCartView } from "@/lib/cart";
import { getCustomer } from "@/lib/customer-auth";
import { prisma } from "@/lib/db";
import { pagarmeConfigured } from "@/lib/payments/pagarme";
import { Container, PageHeading } from "@/components/site/Section";
import { CheckoutForm } from "@/components/site/CheckoutForm";

export const metadata = { title: "Finalizar compra", robots: { index: false } };

export default async function Checkout() {
  const cart = await getCartView();
  if (!cart.lines.length || cart.hasProblems) redirect("/carrinho");
  const c = await getCustomer();
  const addr = c ? await prisma.customerAddress.findFirst({ where: { customerId: c.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }) : null;
  const pk = process.env.NEXT_PUBLIC_PAGARME_PUBLIC_KEY || null;
  const pay = cart.payment;
  return (
    <Container className="pb-24 pt-10 sm:pt-16">
      <PageHeading eyebrow="Pagamento seguro" title="Finalizar compra" />
      <CheckoutForm
        customer={c ? { name: c.name, email: c.email, phone: c.phone ?? "", logged: true } : null}
        address={addr ? { postalCode: addr.postalCode, street: addr.street, number: addr.number, complement: addr.complement ?? "", district: addr.district, city: addr.city, state: addr.state } : null}
        totals={{ subtotal: cart.subtotalCents, discount: cart.discountCents, pixSavings: cart.pixSavingsCents, freeShipping: Boolean(cart.coupon?.freeShipping && !cart.coupon.error) }}
        payment={{ pixEnabled: pay.pixEnabled, cardEnabled: pay.cardEnabled && Boolean(pk), pixPct: pay.pixDiscountBps / 100, maxInstallments: cart.installments.max, interestFree: pay.interestFreeInstallments, monthlyInterestBps: pay.monthlyInterestBps, minInstallment: pay.minInstallmentCents }}
        pagarmeKey={pk}
        enabled={pagarmeConfigured()}
        items={cart.lines.map((l) => ({ id: l.sku, name: l.name + (l.option ? ` (${l.option})` : ""), price: l.unitCents, qty: l.quantity }))}
      />
    </Container>
  );
}
