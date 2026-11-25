import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/customer-auth";
import { prisma } from "@/lib/db";
import { formatCep } from "@/lib/format";
import { Container, PageHeading } from "@/components/site/Section";
import { AccountNav } from "@/components/site/AccountNav";
import { SiteForm, SiteSubmit, Lbl } from "@/components/site/Forms";
import { saveAddress, addressOp } from "../../_actions/account";

export const metadata = { title: "Endereços", robots: { index: false } };

export default async function Addresses() {
  const c = await getCustomer();
  if (!c) redirect("/conta/entrar");
  const list = await prisma.customerAddress.findMany({ where: { customerId: c.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });
  return (
    <Container className="max-w-5xl pb-24 pt-10 sm:pt-16">
      <PageHeading eyebrow="Minha conta" title="Endereços"><div className="mt-8"><AccountNav current="/conta/enderecos" /></div></PageHeading>
      <div className="grid gap-12 md:grid-cols-2">
        <ul className="space-y-4">
          {list.length === 0 && <li className="text-sm text-stone">Nenhum endereço salvo.</li>}
          {list.map((a) => (
            <li key={a.id} className="border-b border-line pb-5 text-[13px]">
              {a.isDefault && <div className="eyebrow mb-2 text-stone">Padrão</div>}
              <div>{a.recipient}</div><div>{a.street}, {a.number}{a.complement ? ` — ${a.complement}` : ""}</div><div>{a.district} · {a.city}/{a.state} · {formatCep(a.postalCode)}</div>
              <div className="mt-3 flex gap-4 text-xs">
                {!a.isDefault && <SiteForm action={addressOp} className=""><input type="hidden" name="id" value={a.id} /><input type="hidden" name="op" value="default" /><SiteSubmit className="underline">Tornar padrão</SiteSubmit></SiteForm>}
                <SiteForm action={addressOp} className=""><input type="hidden" name="id" value={a.id} /><input type="hidden" name="op" value="delete" /><SiteSubmit className="text-red-700 underline">Remover</SiteSubmit></SiteForm>
              </div>
            </li>
          ))}
        </ul>
        <SiteForm action={saveAddress} reset>
          <h2 className="display text-[1.7rem]">Novo endereço</h2>
          <Lbl label="Destinatário"><input name="recipient" defaultValue={c.name} className="field" /></Lbl>
          <div className="grid grid-cols-3 gap-3"><Lbl label="CEP"><input name="postalCode" required className="field" /></Lbl><div className="col-span-2"><Lbl label="Rua"><input name="street" required className="field" /></Lbl></div></div>
          <div className="grid grid-cols-3 gap-3"><Lbl label="Número"><input name="number" required className="field" /></Lbl><div className="col-span-2"><Lbl label="Complemento"><input name="complement" className="field" /></Lbl></div></div>
          <div className="grid grid-cols-3 gap-3"><Lbl label="Bairro"><input name="district" required className="field" /></Lbl><Lbl label="Cidade"><input name="city" required className="field" /></Lbl><Lbl label="UF"><input name="state" required maxLength={2} className="field uppercase" /></Lbl></div>
          <SiteSubmit className="btn-gold">Salvar endereço</SiteSubmit>
        </SiteForm>
      </div>
    </Container>
  );
}
