import { Container } from "@/components/site/Section";
import { SiteForm, SiteSubmit, Lbl } from "@/components/site/Forms";
import { forgotCustomer } from "../../_actions/account";

export const metadata = { title: "Recuperar senha", robots: { index: false } };
export default function Forgot() {
  return (
    <Container className="max-w-md pb-24 pt-14 sm:pt-20">
      <h1 className="display text-[2.6rem]">Recuperar senha</h1>
      <SiteForm action={forgotCustomer} className="mt-8 space-y-4"><Lbl label="E-mail"><input name="email" type="email" required className="field" /></Lbl><SiteSubmit>Enviar link</SiteSubmit></SiteForm>
    </Container>
  );
}
