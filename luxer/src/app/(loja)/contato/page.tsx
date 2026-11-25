import { getSettings } from "@/lib/settings";
import { Container } from "@/components/site/Section";
import { PageTitle } from "@/components/site/CatalogView";

export const metadata = { title: "Contato" };

export default async function Contact() {
  const s = await getSettings();
  return (
    <>
      <PageTitle eyebrow="Fale com a Luxer" title="Contato" text="Nossa equipe ajuda você a escolher a joia certa, tirar dúvidas sobre tamanhos e acompanhar seu pedido." />
      <Container className="grid max-w-4xl gap-14 border-t border-line pb-24 pt-14 sm:grid-cols-2">
        <div className="space-y-8">
          {s.contact.whatsapp && <a href={`https://wa.me/${s.contact.whatsapp}?text=${encodeURIComponent(s.marketing.whatsappMessage)}`} target="_blank" rel="noopener noreferrer" className="btn-gold w-full">Conversar no WhatsApp</a>}
          <div><div className="eyebrow text-stone">Telefone</div><div className="mt-2 font-serif text-2xl">{s.contact.phone}</div></div>
          <div><div className="eyebrow text-stone">E-mail</div><a href={`mailto:${s.contact.email}`} className="mt-2 block break-all font-serif text-2xl">{s.contact.email}</a></div>
        </div>
        <div className="space-y-8 text-[14px]">
          <div><div className="eyebrow text-stone">Endereço</div><p className="mt-2 leading-relaxed">{s.contact.address}</p></div>
          <div><div className="eyebrow text-stone">Horário</div><p className="mt-2">{s.contact.hours}</p></div>
          <div><div className="eyebrow text-stone">Empresa</div><p className="mt-2 text-stone">{s.store.legalName} · CNPJ {s.store.cnpj}</p></div>
        </div>
      </Container>
    </>
  );
}
