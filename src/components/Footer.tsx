import Link from "next/link";
import { Logo } from "./Logo";
import { getSetting } from "@/lib/settings";

export async function Footer() {
  const contact = await getSetting("site.contact");
  const cols = [
    { title: "Serviços", links: [["/consumidor", "Regularização de apontamentos"], ["/cnpj", "Abra seu CNPJ"], ["/emprestimo", "Empréstimo para negativados"], ["/lvb", "LVB — Locação de veículos"]] },
    { title: "Informações", links: [["/informacoes", "Central de informações"], ["/noticias", "Notícias e conteúdos"], ["/perguntas-frequentes", "Perguntas frequentes"], ["/acompanhar", "Acompanhar solicitação"]] },
    { title: "Institucional", links: [["/privacidade", "Política de privacidade"], ["/termos", "Termos de uso"], ["/lvb/politicas", "Políticas da locação LVB"], ["/contato", "Contato"]] },
  ];
  return (
    <footer className="mt-16 bg-brand-900 text-brand-100">
      <div className="container-portal grid gap-10 py-12 md:grid-cols-4">
        <div className="space-y-4">
          <Logo light />
          <p className="text-sm leading-relaxed">
            Plataforma privada de informação e intermediação de serviços. Não possui vínculo com órgãos públicos e não substitui os canais oficiais e gratuitos de atendimento.
          </p>
        </div>
        {cols.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-white">{c.title}</h2>
            <ul className="space-y-2 text-sm">
              {c.links.map(([href, label]) => (
                <li key={href}><Link href={href} className="text-brand-100 no-underline hover:text-white hover:underline">{label}</Link></li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="container-portal flex flex-col gap-2 py-5 text-xs text-brand-200 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {contact.companyName}
            {contact.cnpj ? ` — CNPJ ${contact.cnpj}` : ""}. Todos os direitos reservados.
          </p>
          <p>{contact.email} {contact.hours ? `· ${contact.hours}` : ""}</p>
        </div>
      </div>
    </footer>
  );
}
