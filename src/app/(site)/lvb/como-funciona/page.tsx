import type { Metadata } from "next";
import Link from "next/link";
import { LvbSubnav } from "@/components/lvb/LvbSubnav";
import { Notice, PageHero } from "@/components/ui";

export const metadata: Metadata = { title: "Como funciona a locação LVB", description: "Da escolha do veículo à retirada: entenda cada etapa da locação LVB.", alternates: { canonical: "/lvb/como-funciona" } };

const STEPS = [
  ["Escolha o veículo", "Visualize os veículos, categorias, valores e condições no catálogo. As imagens representam modelos similares de cada categoria."],
  ["Escolha o plano", "Opções de contratação de 12, 24 ou 36 meses. Use o simulador para conhecer o valor mensal, a primeira parcela e o total estimado."],
  ["Preencha sua solicitação", "Informe dados pessoais, endereço, documentação, dados de habilitação, informações sobre sua atividade e demais dados necessários à avaliação."],
  ["Análise", "A solicitação é submetida à análise cadastral e de habilitação, e à verificação de disponibilidade. A aprovação não é garantida."],
  ["Contratação", "As condições, valores, obrigações, regras de utilização, coberturas, quilometragem e demais cláusulas são apresentadas antes da contratação, para sua leitura e aceite."],
  ["Pagamento inicial", "A primeira parcela é paga no ato da contratação, conforme as condições do plano. Caução ou outros valores, quando aplicáveis, são informados antes."],
  ["Cobranças recorrentes", "As demais parcelas são cobradas de forma recorrente na data escolhida, mediante sua autorização e conforme as condições contratuais."],
  ["Retirada", "Após aprovação, formalização, pagamento e confirmação de disponibilidade, você segue para a retirada conforme as orientações da operação."],
];

export default function Page() {
  return (
    <>
      <LvbSubnav current="/lvb/como-funciona" />
      <PageHero tone="lvb" eyebrow="LVB" title="Como funciona" subtitle="Da escolha do veículo à retirada, com transparência em cada etapa." crumbs={[{ href: "/lvb", label: "LVB" }, { label: "Como funciona" }]} />
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
