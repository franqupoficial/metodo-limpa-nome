import type { Metadata } from "next";
import Link from "next/link";
import { getSetting } from "@/lib/settings";
import { formatMoney } from "@/lib/format";
import { Faq, Notice, PageHero, Steps } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { FAQ_CONSUMIDOR } from "@/content/faq";

export const metadata: Metadata = {
  title: "Regularização de apontamentos no Serasa, SPC e Boa Vista",
  description: "Serviço de regularização de apontamentos no CPF: levantamento nos três birôs, contestação de registros irregulares, acordos com credores e acompanhamento até a conclusão.",
  alternates: { canonical: "/consumidor" },
};

const PROCEDIMENTOS = [
  { icon: "search", title: "Levantamento completo", text: "Identificamos todos os apontamentos vinculados ao seu CPF no Serasa, SPC e Boa Vista: credor, valor, data de inclusão e situação." },
  { icon: "scale", title: "Verificação técnica de cada registro", text: "Conferimos notificação prévia (art. 43, §2º, do CDC), prazo máximo de 5 anos, dívidas já pagas, valores divergentes, duplicidades e cobranças indevidas ou abusivas (art. 42 do CDC)." },
  { icon: "doc", title: "Contestação e pedido de exclusão", text: "Para registros irregulares, elaboramos e protocolamos a contestação formal junto ao birô e ao credor, com a fundamentação e os documentos de cada caso." },
  { icon: "users", title: "Acordos com credores", text: "Para dívidas reconhecidas, intermediamos a negociação de condições de pagamento. Após a quitação, o credor deve pedir a baixa do registro em até 5 dias úteis (Súmula 548 do STJ)." },
  { icon: "shield", title: "Reclamações formais", text: "Quando o credor ou o birô não resolve, registramos reclamação no Procon e em consumidor.gov.br e orientamos sobre a via judicial." },
  { icon: "track", title: "Acompanhamento até a conclusão", text: "Cada procedimento e cada resposta recebida ficam registrados no acompanhamento do seu protocolo." },
] as const;

export default async function ConsumidorPage() {
  const [cfg, freeze] = await Promise.all([getSetting("service.consumidor"), getSetting("service.consumidor.freeze")]);
  const showFreeze = freeze.enabled && freeze.legalBasis.trim().length > 20 && freeze.description.trim().length > 20;
  const nav: [string, string][] = [
    ["o-servico", "O que é o serviço"], ["contratacao", "Como contratar"], ["procedimentos", "Procedimentos executados"],
    ["tratamento", "Tratamento dos registros"], ["suspensao", showFreeze ? freeze.title : "Suspensão de registros"],
    ["valores", "Valores e condições"], ["acompanhar", "Acompanhamento"], ["direitos", "Seus direitos"], ["faq", "Perguntas frequentes"],
  ];

  return (
    <>
      <PageHero eyebrow="Regularização de apontamentos" title="Regularize os apontamentos do seu CPF no Serasa, SPC e Boa Vista." subtitle="Contestamos registros irregulares, negociamos com credores e acompanhamos cada procedimento até a conclusão — sem você precisar lidar com birôs e empresas." crumbs={[{ href: "/servicos", label: "Serviços" }, { label: "Regularização de apontamentos" }]}>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/consumidor/solicitar" className="btn-primary">Contratar regularização <Icon name="arrow" className="h-4 w-4" /></Link>
          <a href="#procedimentos" className="btn-secondary">Como funciona</a>
          <span className="text-sm text-muted">{formatMoney(cfg.pixCents)} no Pix ou {formatMoney(cfg.installmentCents)} em até {cfg.maxInstallments}x</span>
        </div>
      </PageHero>

      <div className="container-portal grid gap-10 py-10 lg:grid-cols-[240px_1fr]">
        <nav aria-label="Nesta página" className="hidden lg:block">
          <div className="sticky top-36 space-y-1 text-sm">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Nesta página</p>
            {nav.map(([id, t]) => <a key={id} href={`#${id}`} className="block rounded px-2 py-1.5 text-muted no-underline hover:bg-surface hover:text-brand-700">{t}</a>)}
          </div>
        </nav>

        <div className="min-w-0 space-y-12">
          <section id="o-servico" className="scroll-mt-36">
            <h2 className="text-2xl font-bold">O que é o serviço</h2>
            <div className="prose-portal mt-3">
              <p>A Regularização de apontamentos é um serviço completo, executado pela nossa equipe, para tratar os registros negativos vinculados ao seu CPF nos três principais birôs de crédito do país: <strong>Serasa, SPC e Boa Vista</strong>.</p>
              <p>Você contrata, envia seus dados e nós executamos os procedimentos: levantamos os registros, identificamos os que estão em desacordo com a lei, contestamos formalmente esses registros, intermediamos acordos para as dívidas que você reconhece e acompanhamos tudo até a conclusão.</p>
            </div>
          </section>

          <section id="contratacao" className="scroll-mt-36">
            <h2 className="mb-5 text-2xl font-bold">Como funciona a contratação</h2>
            <Steps steps={[
              { title: "Preencha o formulário", text: "Informe seus dados, endereço e o que você sabe sobre os apontamentos. Leva cerca de 5 minutos." },
              { title: "Escolha a forma de pagamento", text: `${formatMoney(cfg.pixCents)} via Pix ou ${formatMoney(cfg.installmentCents)} em até ${cfg.maxInstallments} parcelas.` },
              { title: "Receba seu protocolo", text: "Você recebe protocolo e código de acesso. Enviamos as instruções de pagamento pelos canais oficiais do portal." },
              { title: "Início da execução", text: "Confirmado o pagamento, iniciamos o levantamento e os procedimentos nos três birôs." },
              { title: "Acompanhe cada etapa", text: "Todas as ações e respostas ficam registradas no acompanhamento do protocolo." },
              { title: "Conclusão", text: "Você recebe o relatório final com o resultado de cada registro tratado." },
            ]} />
          </section>

          <section id="procedimentos" className="scroll-mt-36">
            <h2 className="mb-5 text-2xl font-bold">Procedimentos executados</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {PROCEDIMENTOS.map((p) => (
                <div key={p.title} className="card p-5">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Icon name={p.icon} /></span>
                  <h3 className="mt-3 font-semibold">{p.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{p.text}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="tratamento" className="scroll-mt-36">
            <h2 className="text-2xl font-bold">Como funciona o tratamento dos registros</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-950">
                <p className="font-bold">Registros irregulares</p>
                <p className="mt-2">Sem notificação prévia, com mais de 5 anos, de dívida já paga, com valor divergente, duplicados ou decorrentes de cobrança indevida: pedimos a <strong>exclusão</strong> com base no Código de Defesa do Consumidor. Quando o pedido é acolhido, o registro é retirado do cadastro.</p>
              </div>
              <div className="rounded-xl border border-brand-200 bg-brand-50 p-5 text-sm text-brand-950">
                <p className="font-bold">Dívidas reconhecidas</p>
                <p className="mt-2">Dívidas legítimas continuam devidas. Para elas, intermediamos <strong>acordo com o credor</strong> em condições que caibam no seu orçamento. Com o pagamento, o credor é obrigado a solicitar a baixa do apontamento em até 5 dias úteis.</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted">Cobranças indevidas ou feitas com constrangimento, ameaça ou exposição ao ridículo são vedadas pelo art. 42 do CDC. Quando o consumidor paga valor indevido, tem direito à devolução em dobro do que pagou em excesso. Esses pontos fazem parte da verificação de cada registro.</p>
          </section>

          <section id="suspensao" className="scroll-mt-36">
            {showFreeze ? (
              <>
                <h2 className="text-2xl font-bold">{freeze.title}</h2>
                <div className="prose-portal mt-3"><p className="whitespace-pre-line">{freeze.description}</p></div>
                <div className="mt-4 rounded-xl border border-line bg-surface p-4 text-sm"><p className="font-semibold">Base jurídica e operacional</p><p className="mt-1 whitespace-pre-line text-muted">{freeze.legalBasis}</p></div>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold">Suspensão de registros</h2>
                <div className="prose-portal mt-3">
                  <p>Um apontamento pode deixar de ser exibido antes da quitação nas hipóteses previstas em lei: quando a contestação é acolhida pelo birô ou pelo credor, quando o prazo de 5 anos é atingido, ou por decisão judicial que determine a suspensão enquanto a dívida é discutida em juízo.</p>
                  <p>Indicamos em cada caso qual dessas vias é aplicável e executamos os procedimentos administrativos correspondentes.</p>
                </div>
              </>
            )}
          </section>

          <section id="valores" className="scroll-mt-36">
            <h2 className="mb-5 text-2xl font-bold">Valores e condições</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="card border-brand-300 p-6">
                <p className="eyebrow">À vista via Pix</p>
                <p className="mt-2 text-4xl font-extrabold text-brand-800">{formatMoney(cfg.pixCents)}</p>
                <Link href="/consumidor/solicitar" className="btn-primary mt-4 w-full">Contratar no Pix</Link>
              </div>
              <div className="card p-6">
                <p className="eyebrow">Parcelado</p>
                <p className="mt-2 text-4xl font-extrabold text-ink">{formatMoney(cfg.installmentCents)}</p>
                <p className="mt-1 text-sm text-muted">Em até {cfg.maxInstallments} vezes.</p>
                <Link href="/consumidor/solicitar" className="btn-secondary mt-4 w-full">Contratar parcelado</Link>
              </div>
            </div>
            <div className="mt-5 rounded-xl border border-line p-5 text-sm">
              <p className="font-bold">O que está incluído</p>
              <p className="mt-2 text-muted">{cfg.scope}</p>
              <p className="mt-4 font-bold">Condições</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
                <li>Pagamento único por CPF, cobrindo os apontamentos existentes nos três birôs na data da contratação.</li>
                <li>Valores de acordos com credores não estão incluídos no preço do serviço e são pagos diretamente ao credor.</li>
                <li>O resultado de cada registro depende da resposta do birô e do credor; dívidas legítimas permanecem devidas até o pagamento ou acordo.</li>
                <li>Direito de arrependimento em até 7 dias da contratação (art. 49 do CDC).</li>
              </ul>
            </div>
          </section>

          <section id="acompanhar" className="scroll-mt-36">
            <h2 className="text-2xl font-bold">Como acompanhar a execução</h2>
            <div className="prose-portal mt-3">
              <p>Ao contratar, você recebe um <strong>número de protocolo</strong> e um <strong>código de acesso</strong>. Na página <Link href="/acompanhar">Acompanhar solicitação</Link> você vê a etapa atual, as ações já realizadas e o que falta. Também avisamos por e-mail a cada mudança de etapa.</p>
            </div>
          </section>

          <section id="direitos" className="scroll-mt-36">
            <h2 className="text-2xl font-bold">Seus direitos</h2>
            <div className="prose-portal mt-3">
              <ul>
                <li>Ser comunicado por escrito antes de qualquer inclusão em cadastro (art. 43, §2º, do CDC; Súmula 359 do STJ).</li>
                <li>Exigir a correção de dados incorretos, com prazo de 5 dias úteis para comunicação aos destinatários (art. 43, §3º).</li>
                <li>Permanência máxima de 5 anos das informações negativas (art. 43, §1º; Súmula 323 do STJ).</li>
                <li>Baixa do registro em até 5 dias úteis após a quitação (Súmula 548 do STJ).</li>
                <li>Cobrança sem constrangimento ou ameaça e devolução em dobro do valor pago indevidamente (art. 42 do CDC).</li>
              </ul>
              <p className="text-sm text-muted">Você também pode consultar seu CPF e contestar registros diretamente nos birôs, no Procon ou em consumidor.gov.br, sem custo. Nosso serviço executa esses procedimentos por você.</p>
            </div>
          </section>

          <section id="faq" className="scroll-mt-36">
            <h2 className="mb-5 text-2xl font-bold">Perguntas frequentes</h2>
            <Faq items={FAQ_CONSUMIDOR} />
          </section>

          <div className="card flex flex-col items-start gap-4 bg-brand-50 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold">Comece a regularização hoje</h2>
              <p className="text-sm text-muted">{formatMoney(cfg.pixCents)} no Pix ou {formatMoney(cfg.installmentCents)} em até {cfg.maxInstallments}x.</p>
            </div>
            <Link href="/consumidor/solicitar" className="btn-primary">Contratar regularização</Link>
          </div>
          <Notice tone="info">Portal Consumidor é uma empresa privada, sem vínculo com o Serasa, o SPC, a Boa Vista ou órgãos públicos. As marcas citadas pertencem aos respectivos titulares.</Notice>
        </div>
      </div>
    </>
  );
}
