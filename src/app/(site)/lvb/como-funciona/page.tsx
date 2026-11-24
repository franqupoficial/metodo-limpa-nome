import type { Metadata } from "next";
import Link from "next/link";
import { LvbSubnav } from "@/components/lvb/LvbSubnav";
import { Notice, PageHero } from "@/components/ui";

export const metadata: Metadata = { title: "Como funciona a locação LVB", description: "Da escolha do veículo à retirada: entenda cada etapa da locação LVB.", alternates: { canonical: "/lvb/como-funciona" } };

const STEPS = [
  ["Escolha o veículo", "Navegue pelo catálogo por categoria — Econômico, Compacto, Sedan, Comfort, SUV e Premium/Eletrificado — e compare valores e condições."],
  ["Escolha o plano", "Contrate por 12, 24 ou 36 meses. O simulador mostra o valor mensal, a primeira parcela e o total do contrato."],
  ["Preencha o formulário de locação", "Dados pessoais, endereço, CNH (com EAR, quando exigido), perfil de motorista, veículo, plano e dia de vencimento."],
  ["Aprovação cadastral", "Verificamos seus dados e sua habilitação e confirmamos o veículo da frota para o seu contrato."],
  ["Assinatura do contrato", "Você recebe o contrato com valores, obrigações, regras de uso, coberturas, quilometragem e demais cláusulas, e assina digitalmente."],
  ["Primeira parcela", "A primeira parcela é paga no ato da contratação. Caução ou outros valores aplicáveis constam do contrato."],
  ["Retirada do veículo", "Pagamento confirmado, agendamos a retirada. Leve documento de identificação e a CNH original."],
  ["Parcelas recorrentes", "As demais parcelas são cobradas automaticamente no dia que você escolheu, mediante sua autorização."],
];

export default function Page() {
  return (
    <>
      <LvbSubnav current="/lvb/como-funciona" />
      <PageHero tone="lvb" eyebrow="LVB" title="Como funciona" subtitle="Da escolha do carro à retirada: veja como alugar com a LVB." crumbs={[{ href: "/lvb", label: "LVB" }, { label: "Como funciona" }]} />
      <div className="container-portal py-10">
        <ol className="grid gap-4 md:grid-cols-2">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="card flex gap-4 p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lvb-600 font-bold text-white">{i + 1}</span>
              <div><h2 className="font-bold">{t}</h2><p className="mt-1 text-sm leading-relaxed text-muted">{d}</p></div>
            </li>
          ))}
        </ol>
        <div className="mt-8 space-y-4">
          <Notice tone="info">A LVB é uma operação privada de locação. Não é programa governamental, locação subsidiada pelo governo ou veículo arrendado pelo governo.</Notice>
          <div className="flex flex-wrap gap-3"><Link href="/lvb/veiculos" className="btn-lvb">Ver catálogo</Link><Link href="/lvb/politicas" className="btn-secondary">Políticas da locação</Link></div>
        </div>
      </div>
    </>
  );
}
