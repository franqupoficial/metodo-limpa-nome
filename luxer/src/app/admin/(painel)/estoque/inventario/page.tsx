import { requireAdmin } from "@/lib/auth";
import { PageHeader, Card, Field, Alert } from "@/components/admin/ui";
import { ActionForm, Submit } from "@/components/admin/forms";
import { importStockCsv } from "../../../_actions/stock";

export const metadata = { title: "Inventário" };

export default async function Inventory() {
  await requireAdmin("stock.adjust");
  return (
    <>
      <PageHeader title="Inventário e importação" back={{ href: "/admin/estoque", label: "Estoque" }} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="1. Exportar planilha atual">
          <p className="mb-3 text-sm text-zinc-600">Baixe a planilha com todos os SKUs, preencha a coluna <b>quantidade</b> com a contagem física e importe ao lado.</p>
          <a href="/api/admin/estoque" className="btn">Baixar CSV de estoque</a>
        </Card>
        <Card title="2. Importar contagem">
          <ActionForm action={importStockCsv} className="space-y-3" resetOnSuccess>
            <Field label="Arquivo CSV" hint="Colunas: sku;quantidade;minimo (mínimo opcional). Aceita ; , ou tabulação."><input type="file" name="file" accept=".csv,text/csv,text/plain" required className="text-sm" /></Field>
            <Field label="Modo">
              <select name="mode" className="input"><option value="set">Inventário — define o saldo exato</option><option value="add">Entrada — soma ao saldo atual</option></select>
            </Field>
            <Submit pendingText="Importando…">Importar</Submit>
          </ActionForm>
        </Card>
      </div>
      <div className="mt-5"><Alert tone="blue">Os produtos migrados do site anterior não tinham quantidade publicada e estão como <b>sob demanda</b>. Ao registrar a quantidade de um SKU (aqui ou na tela de estoque), o controle por quantidade é ativado automaticamente para o produto. Todas as alterações ficam no histórico de movimentações.</Alert></div>
    </>
  );
}
