import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/customer-auth";
import { Container } from "@/components/site/Section";
import { SiteForm, SiteSubmit, Lbl } from "@/components/site/Forms";
import { loginCustomer, registerCustomer } from "../../_actions/account";

export const metadata = { title: "Entrar", robots: { index: false } };

export default async function Login({ searchParams }: { searchParams: Promise<{ voltar?: string }> }) {
  const { voltar } = await searchParams;
  if (await getCustomer()) redirect(voltar?.startsWith("/") ? voltar : "/conta");
  return (
    <Container className="grid max-w-5xl gap-16 pb-24 pt-14 sm:pt-20 md:grid-cols-2 md:gap-24">
      <section>
        <h1 className="display text-[2.6rem]">Entrar</h1>
        <SiteForm action={loginCustomer} className="mt-8 space-y-4">
          <input type="hidden" name="voltar" value={voltar ?? ""} />
          <Lbl label="E-mail"><input name="email" type="email" required autoComplete="email" className="field" /></Lbl>
          <Lbl label="Senha"><input name="password" type="password" required autoComplete="current-password" className="field" /></Lbl>
          <SiteSubmit>Entrar</SiteSubmit>
          <Link href="/conta/recuperar" className="block text-center text-[11px] text-stone underline underline-offset-4 hover:text-ink">Esqueci minha senha</Link>
        </SiteForm>
      </section>
      <section>
        <h2 className="display text-[2.6rem]">Criar conta</h2>
        <p className="mt-2 text-sm text-stone">Acompanhe pedidos, salve endereços e favoritos. Compras feitas como visitante com o mesmo e-mail aparecem na sua conta.</p>
        <SiteForm action={registerCustomer} className="mt-6 space-y-4">
          <input type="hidden" name="voltar" value={voltar ?? ""} />
          <Lbl label="Nome completo"><input name="name" required autoComplete="name" className="field" /></Lbl>
          <Lbl label="E-mail"><input name="email" type="email" required autoComplete="email" className="field" /></Lbl>
          <Lbl label="Celular (opcional)"><input name="phone" inputMode="tel" className="field" /></Lbl>
          <Lbl label="Senha"><input name="password" type="password" required autoComplete="new-password" className="field" /></Lbl>
          <label className="flex items-start gap-2 text-xs"><input type="checkbox" name="marketing" className="mt-0.5" /> Quero receber novidades e ofertas por e-mail.</label>
          <label className="flex items-start gap-2 text-xs"><input type="checkbox" name="terms" required className="mt-0.5" /> Li e aceito a <Link href="/privacidade" className="underline">política de privacidade</Link>.</label>
          <SiteSubmit>Criar conta</SiteSubmit>
        </SiteForm>
      </section>
    </Container>
  );
}
