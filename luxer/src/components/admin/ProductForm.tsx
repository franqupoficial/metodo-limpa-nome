import type { Product } from "@prisma/client";
import { ActionForm, Submit } from "./forms";
import { Card, Field } from "./ui";
import { centsToInput } from "@/lib/action";
import { saveProduct } from "@/app/admin/_actions/products";

type Cat = { id: string; name: string; parent: { name: string } | null };
type Col = { id: string; name: string };

const pairs = (v: unknown) => (Array.isArray(v) ? (v as { label: string; value: string }[]).map((p) => `${p.label}: ${p.value}`).join("\n") : "");
const dt = (d: Date | null | undefined) => (d ? new Date(d.getTime() - 3 * 3600_000).toISOString().slice(0, 16) : "");
const n = (v: unknown) => (v == null ? "" : String(v));

export function ProductForm({
  product, categories, collections, selectedCats = [], selectedCols = [], related = "", can,
}: {
  product?: Product | null;
  categories: Cat[];
  collections: Col[];
  selectedCats?: string[];
  selectedCols?: string[];
  related?: string;
  can: { price: boolean; publish: boolean };
}) {
  const p = product;
  return (
    <ActionForm action={saveProduct} className="grid gap-5 xl:grid-cols-3">
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="space-y-5 xl:col-span-2">
        <Card title="Informações principais">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Título *" className="sm:col-span-2"><input name="name" defaultValue={p?.name} required maxLength={160} className="input" /></Field>
            <Field label="Referência"><input name="ref" defaultValue={p?.ref ?? ""} className="input" /></Field>
            <Field label="SKU do produto"><input name="sku" defaultValue={p?.sku ?? ""} className="input" /></Field>
            <Field label="Código de barras (EAN)"><input name="barcode" defaultValue={p?.barcode ?? ""} className="input" /></Field>
            <Field label="URL (slug)" hint="Deixe vazio para gerar automaticamente."><input name="slug" defaultValue={p?.slug ?? ""} className="input" /></Field>
            <Field label="Resumo" className="sm:col-span-2"><input name="shortDescription" defaultValue={p?.shortDescription ?? ""} maxLength={240} className="input" /></Field>
            <Field label="Descrição" className="sm:col-span-2" hint="Aceita **negrito**, listas com “- ” e títulos com “## ”."><textarea name="description" defaultValue={p?.description ?? ""} rows={7} className="input" /></Field>
          </div>
        </Card>

        <Card title="Ficha técnica da joia">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Tipo de joia"><input name="jewelryType" defaultValue={p?.jewelryType ?? ""} list="jtypes" className="input" /></Field>
            <Field label="Material"><input name="material" defaultValue={p?.material ?? ""} className="input" placeholder="Ouro 18 kilates" /></Field>
            <Field label="Tipo de ouro"><select name="goldType" defaultValue={p?.goldType ?? ""} className="input"><option value="">—</option><option>Ouro amarelo</option><option>Ouro branco</option><option>Ouro rosé</option><option>Bicolor</option><option>Tricolor</option></select></Field>
            <Field label="Quilatagem"><select name="karat" defaultValue={p?.karat ?? ""} className="input"><option value="">—</option><option>18k</option><option>14k</option><option>10k</option><option>24k</option></select></Field>
            <Field label="Cor"><input name="color" defaultValue={p?.color ?? ""} className="input" /></Field>
            <Field label="Acabamento"><input name="finish" defaultValue={p?.finish ?? ""} className="input" placeholder="Polido, diamantado…" /></Field>
            <Field label="Peso (g)"><input name="weightG" defaultValue={n(p?.weightG)} inputMode="decimal" className="input" /></Field>
            <Field label="Comprimento (mm)"><input name="lengthMm" defaultValue={n(p?.lengthMm)} inputMode="decimal" className="input" /></Field>
            <Field label="Largura (mm)"><input name="widthMm" defaultValue={n(p?.widthMm)} inputMode="decimal" className="input" /></Field>
            <Field label="Espessura (mm)"><input name="thicknessMm" defaultValue={n(p?.thicknessMm)} inputMode="decimal" className="input" /></Field>
            <Field label="Altura (mm)"><input name="heightMm" defaultValue={n(p?.heightMm)} inputMode="decimal" className="input" /></Field>
            <Field label="Diâmetro (mm)"><input name="diameterMm" defaultValue={n(p?.diameterMm)} inputMode="decimal" className="input" /></Field>
            <Field label="Tipo de pedra"><input name="stoneType" defaultValue={p?.stoneType ?? ""} className="input" placeholder="Zircônia, diamante…" /></Field>
            <Field label="Quantidade de pedras"><input name="stoneCount" type="number" min={0} defaultValue={n(p?.stoneCount)} className="input" /></Field>
            <Field label="Tamanho"><input name="size" defaultValue={p?.size ?? ""} className="input" /></Field>
            <Field label="Gênero de referência"><select name="gender" defaultValue={p?.gender ?? ""} className="input"><option value="">—</option><option>Feminino</option><option>Masculino</option><option>Unissex</option><option>Infantil</option></select></Field>
            <Field label="Especificações exibidas na página" className="sm:col-span-3" hint="Uma por linha, no formato “Rótulo: valor”."><textarea name="specs" defaultValue={pairs(p?.specs)} rows={5} className="input font-mono text-xs" /></Field>
            <Field label="Campos personalizados" className="sm:col-span-3" hint="Uma por linha, “Campo: valor” (ex.: Certificado: GIA 123)."><textarea name="customFields" defaultValue={pairs(p?.customFields)} rows={3} className="input font-mono text-xs" /></Field>
          </div>
          <datalist id="jtypes">{["Aliança", "Anel", "Brinco", "Colar", "Corrente", "Pingente", "Pulseira", "Bracelete", "Tornozeleira", "Conjunto", "Medalha", "Escapulário", "Crucifixo"].map((t) => <option key={t} value={t} />)}</datalist>
        </Card>

        <Card title="Preços e promoção">
          {!can.price && <p className="mb-3 text-xs text-amber-700">Seu perfil não pode alterar preços — os campos abaixo são somente leitura.</p>}
          <fieldset disabled={!can.price} className="grid gap-3 sm:grid-cols-3">
            <Field label="Preço de venda *"><input name="price" defaultValue={centsToInput(p?.priceCents)} required inputMode="decimal" className="input" placeholder="0,00" /></Field>
            <Field label="Preço “de” (promoção)" hint="Preencha para exibir preço riscado."><input name="compareAt" defaultValue={centsToInput(p?.compareAtCents)} inputMode="decimal" className="input" /></Field>
            <Field label="Preço no Pix" hint="Vazio = aplica o desconto Pix da loja."><input name="pixPrice" defaultValue={centsToInput(p?.pixPriceCents)} inputMode="decimal" className="input" /></Field>
            <Field label="Início da promoção"><input type="datetime-local" name="promoStartsAt" defaultValue={dt(p?.promoStartsAt)} className="input" /></Field>
            <Field label="Fim da promoção"><input type="datetime-local" name="promoEndsAt" defaultValue={dt(p?.promoEndsAt)} className="input" /></Field>
            <Field label="Parcelas máximas" hint="Vazio = padrão da loja."><input name="maxInstallments" type="number" min={1} max={24} defaultValue={n(p?.maxInstallments)} className="input" /></Field>
            <Field label="Custo (uso interno)" hint="Para margem nos relatórios. Nunca exibido ao cliente."><input name="cost" defaultValue={centsToInput(p?.costCents)} inputMode="decimal" className="input" /></Field>
          </fieldset>
          {!can.price && p && <>
            <input type="hidden" name="price" value={centsToInput(p.priceCents)} /><input type="hidden" name="compareAt" value={centsToInput(p.compareAtCents)} /><input type="hidden" name="pixPrice" value={centsToInput(p.pixPriceCents)} />
            <input type="hidden" name="promoStartsAt" value={dt(p.promoStartsAt)} /><input type="hidden" name="promoEndsAt" value={dt(p.promoEndsAt)} /><input type="hidden" name="maxInstallments" value={n(p.maxInstallments)} /><input type="hidden" name="cost" value={centsToInput(p.costCents)} />
          </>}
        </Card>

        <Card title="SEO">
          <div className="grid gap-3">
            <Field label="Título SEO" hint="Até ~60 caracteres. Vazio = título do produto."><input name="seoTitle" defaultValue={p?.seoTitle ?? ""} maxLength={80} className="input" /></Field>
            <Field label="Descrição SEO" hint="Até ~155 caracteres."><textarea name="seoDescription" defaultValue={p?.seoDescription ?? ""} maxLength={200} rows={2} className="input" /></Field>
          </div>
        </Card>

        <Card title="Embalagem para frete">
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Peso (g)"><input name="packageWeightG" type="number" min={1} defaultValue={n(p?.packageWeightG)} className="input" /></Field>
            <Field label="Comprimento (cm)"><input name="packageLengthCm" type="number" min={1} defaultValue={n(p?.packageLengthCm)} className="input" /></Field>
            <Field label="Largura (cm)"><input name="packageWidthCm" type="number" min={1} defaultValue={n(p?.packageWidthCm)} className="input" /></Field>
            <Field label="Altura (cm)"><input name="packageHeightCm" type="number" min={1} defaultValue={n(p?.packageHeightCm)} className="input" /></Field>
          </div>
          <p className="mt-2 text-[11px] text-zinc-500">Vazio = embalagem padrão definida em Configurações → Entrega.</p>
        </Card>
      </div>

      <div className="space-y-5">
        <Card title="Publicação">
          <fieldset disabled={!can.publish && Boolean(p)} className="space-y-3">
            <Field label="Status"><select name="status" defaultValue={p?.status ?? "DRAFT"} className="input"><option value="DRAFT">Rascunho (não aparece na loja)</option><option value="ACTIVE">Publicado</option><option value="ARCHIVED">Arquivado</option></select></Field>
            <Field label="Agendar publicação" hint="Com status Publicado, o produto só aparece a partir desta data."><input type="datetime-local" name="publishAt" defaultValue={dt(p?.publishAt)} className="input" /></Field>
          </fieldset>
          {!can.publish && p && <><input type="hidden" name="status" value={p.status} /><input type="hidden" name="publishAt" value={dt(p.publishAt)} /></>}
          <div className="mt-3 space-y-2 text-sm">
            {([["featured", "Em destaque na vitrine", p?.featured], ["bestSeller", "Marcar como mais vendido", p?.bestSeller], ["isNew", "Marcar como novidade", p?.isNew], ["tryOnEnabled", "Disponível no provador virtual", p?.tryOnEnabled ?? true], ["trackStock", "Controlar estoque", p?.trackStock ?? true]] as const).map(([k, l, v]) => (
              <label key={k} className="flex items-center gap-2"><input type="checkbox" name={k} defaultChecked={Boolean(v)} /> {l}</label>
            ))}
          </div>
          <div className="mt-4"><Submit>Salvar produto</Submit></div>
        </Card>

        <Card title="Organização">
          <div className="space-y-3">
            <Field label="Categoria principal"><select name="primaryCategoryId" defaultValue={p?.primaryCategoryId ?? ""} className="input"><option value="">—</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.parent ? `${c.parent.name} › ` : ""}{c.name}</option>)}</select></Field>
            <Field label="Categorias"><div className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-zinc-200 p-2 text-sm">{categories.map((c) => (
              <label key={c.id} className={`flex items-center gap-2 ${c.parent ? "pl-4" : "font-medium"}`}><input type="checkbox" name="categoryIds" value={c.id} defaultChecked={selectedCats.includes(c.id)} /> {c.name}</label>
            ))}</div></Field>
            {collections.length > 0 && <Field label="Coleções"><div className="space-y-1 text-sm">{collections.map((c) => <label key={c.id} className="flex items-center gap-2"><input type="checkbox" name="collectionIds" value={c.id} defaultChecked={selectedCols.includes(c.id)} /> {c.name}</label>)}</div></Field>}
            <Field label="Etiquetas" hint="Separadas por vírgula."><input name="tags" defaultValue={p?.tags.join(", ") ?? ""} className="input" /></Field>
            <Field label="Produtos relacionados" hint="Referências ou SKUs, separados por vírgula. Vazio = sugestão automática pela categoria."><input name="related" defaultValue={related} className="input" /></Field>
            <Field label="Nome da opção de variação"><input name="optionName" defaultValue={p?.optionName ?? ""} placeholder="Tamanho, Aro, Comprimento…" className="input" /></Field>
          </div>
        </Card>
      </div>
    </ActionForm>
  );
}
