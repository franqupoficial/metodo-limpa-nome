import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/customer-auth";
import { Container, PageHeading } from "@/components/site/Section";
import { AccountNav } from "@/components/site/AccountNav";
import { SiteForm, SiteSubmit, Lbl } from "@/components/site/Forms";
import { updateProfile, requestDeletion } from "../../_actions/account";

export const metadata = { title: "Meus dados", robots: { index: false } };

export default async function Data() {
  const c = await getCustomer();
  if (!c) redirect("/conta/entrar");
  return (
    <Container className="max-w-5xl pb-24 pt-10 sm:pt-16">
      <PageHeading eyebrow="Minha conta" title="Meus dados"><div className="mt-8"><AccountNav current="/conta/dados" /></div></PageHeading>
      <div className="grid gap-14 md:grid-cols-2">
        <SiteForm action={updateProfile}>
          <Lbl label="Nome"><input name="name" defaultValue={c.name} required className="field" /></Lbl>
          <Lbl label="E-mail"><input value={c.email} disabled className="field opacity-60" /></Lbl>
          <Lbl label="Celular"><input name="phone" defaultValue={c.phone ?? ""} className="field" /></Lbl>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="marketing" defaultChecked={c.marketingOptIn} /> Receber novidades por e-mail</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="whatsapp" defaultChecked={c.whatsappOptIn} /> Receber contato pelo WhatsApp</label>
          <SiteSubmit className="btn-gold">Salvar</SiteSubmit>
        </SiteForm>
        <section className="space-y-6">
          <div><h2 className="display text-[1.7rem]">Seus direitos (LGPD)</h2><p className="mt-2 text-sm text-stone">Você pode baixar uma cópia dos seus dados ou pedir a exclusão a qualquer momento.</p></div>
          <a href="/api/conta/dados" className="btn-line">Baixar meus dados (JSON)</a>
          <SiteForm action={requestDeletion} className="space-y-4 border-t border-line pt-6">
            <p className="text-sm">Para solicitar a exclusão da conta e dos dados pessoais, digite <b>EXCLUIR</b>.</p>
            <input name="confirm" className="field" />
            <SiteSubmit className="btn-line text-red-800">Solicitar exclusão</SiteSubmit>
          </SiteForm>
        </section>
      </div>
    </Container>
  );
}
