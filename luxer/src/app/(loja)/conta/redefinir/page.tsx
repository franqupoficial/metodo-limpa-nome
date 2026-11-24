import { Container } from "@/components/site/Section";
import { SiteForm, SiteSubmit, Lbl } from "@/components/site/Forms";
import { resetCustomer } from "../../_actions/account";

export const metadata = { title: "Nova senha", robots: { index: false } };
export default async function Reset({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  return (
    <Container className="max-w-md py-16">
      <h1 className="display text-4xl">Nova senha</h1>
      <SiteForm action={resetCustomer} className="mt-8 space-y-4"><input type="hidden" name="t" value={t ?? ""} /><Lbl label="Nova senha (8+ caracteres, letras e números)"><input name="password" type="password" required autoComplete="new-password" className="field" /></Lbl><SiteSubmit>Salvar</SiteSubmit></SiteForm>
    </Container>
  );
}
