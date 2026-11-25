import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { mediaUrl } from "@/lib/media-url";
import { PageHeader, Card, Badge, Field } from "@/components/admin/ui";
import { ActionForm, ActionButton, Submit, Collapsible } from "@/components/admin/forms";
import { saveHomeSection, addHomeSection, deleteHomeSection } from "../../../_actions/content";

export const metadata = { title: "Homepage" };
const TYPES: Record<string, string> = {
  HERO: "Abertura (título: “linha 1 | linha 2”; foto lifestyle ou vídeo macro; banners aparecem logo abaixo)", ATELIER: "Atelier Concierge (compra guiada)", CATEGORIES: "Categorias", BESTSELLERS: "Mais vendidos", NEW: "Novidades", COLLECTIONS: "Coleções especiais",
  FAITH: "Luxer Fé", RECOMMENDED: "Produtos recomendados", PRODUCTS: "Vitrine manual (referências)", TRYON: "Provador virtual", STORY: "História da marca",
  REVIEWS: "Avaliações", INSTAGRAM: "Instagram", NEWSLETTER: "Newsletter (o formulário já aparece no rodapé de todas as páginas; esta seção não é exibida)", EDITORIAL: "Bloco editorial (imagem + texto)",
};

export default async function HomeEditor() {
  await requireAdmin("content.manage");
  const sections = await prisma.homeSection.findMany({ orderBy: { position: "asc" } });
  return (
    <>
      <PageHeader title="Homepage" subtitle="Ordem, títulos e conteúdo de cada seção. Os banners do destaque principal são editados em Marketing → Banners." actions={<a href="/" target="_blank" className="btn">Ver homepage</a>} />
      <div className="space-y-3">
        {sections.map((s, i) => {
          const cfg = (s.config ?? {}) as { limit?: number; text?: string; ctaLabel?: string; ctaUrl?: string; refs?: string[]; collectionSlug?: string; imageKey?: string; mobileKey?: string; videoUrl?: string };
          return (
            <Collapsible key={s.id} title={`${i + 1}. ${TYPES[s.type] ?? s.type}${s.title ? ` — “${s.title}”` : ""}${s.active ? "" : " (oculta)"}`}>
              <div className="mb-3 flex gap-1">
                <ActionButton action={saveHomeSection} fields={{ id: s.id, op: "up" }} label="↑ Subir" className="btn !py-1 text-xs" />
                <ActionButton action={saveHomeSection} fields={{ id: s.id, op: "down" }} label="↓ Descer" className="btn !py-1 text-xs" />
                <ActionButton action={deleteHomeSection} fields={{ id: s.id }} label="Remover seção" className="btn btn-danger !py-1 text-xs" confirm="Remover esta seção da homepage?" />
              </div>
              <ActionForm action={saveHomeSection} className="grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="id" value={s.id} />
                <Field label="Título"><input name="title" defaultValue={s.title ?? ""} className="input" /></Field>
                <Field label="Subtítulo"><input name="subtitle" defaultValue={s.subtitle ?? ""} className="input" /></Field>
                {["BESTSELLERS", "NEW", "RECOMMENDED", "FAITH", "REVIEWS", "PRODUCTS"].includes(s.type) && <Field label="Quantidade de itens"><input name="limit" type="number" min={2} max={24} defaultValue={cfg.limit ?? 8} className="input" /></Field>}
                {["PRODUCTS", "BESTSELLERS", "NEW", "HERO"].includes(s.type) && <Field label="Referências fixas (opcional)" hint="Se preenchido, mostra exatamente estas peças, nesta ordem."><input name="refs" defaultValue={cfg.refs?.join(", ") ?? ""} className="input font-mono text-xs" /></Field>}
                {s.type === "COLLECTIONS" && <p className="text-xs text-zinc-500 sm:col-span-2">Exibe as coleções marcadas como “Destacar na homepage”.</p>}
                {["STORY", "TRYON", "EDITORIAL", "FAITH", "NEWSLETTER", "HERO"].includes(s.type) && <Field label="Texto" className="sm:col-span-2"><textarea name="text" defaultValue={cfg.text ?? ""} rows={3} className="input" /></Field>}
                {["STORY", "TRYON", "EDITORIAL", "FAITH", "HERO"].includes(s.type) && <>
                  <Field label="Texto do botão"><input name="ctaLabel" defaultValue={cfg.ctaLabel ?? ""} className="input" /></Field>
                  <Field label="Link do botão"><input name="ctaUrl" defaultValue={cfg.ctaUrl ?? ""} className="input" /></Field>
                  <Field label={s.type === "HERO" ? "Fotografia lifestyle (desktop, horizontal)" : "Imagem"} hint={s.type === "HERO" ? "Ideal: 2400×1350 px ou maior, joia em uso real. Sem ela, a abertura mostra a fotografia original de peças do catálogo." : undefined}><input type="file" name="image" accept="image/*" className="text-sm" />{cfg.imageKey && <img src={mediaUrl(cfg.imageKey)!} alt="" className="mt-2 h-20 rounded object-cover" />}</Field>
                  {s.type === "HERO" && <>
                    <Field label="Fotografia lifestyle (celular, vertical)" hint="Ideal: 1080×1620 px. Opcional."><input type="file" name="mobileImage" accept="image/*" className="text-sm" />{cfg.mobileKey && <img src={mediaUrl(cfg.mobileKey)!} alt="" className="mt-2 h-20 rounded object-cover" />}</Field>
                    <Field label="Vídeo macro (URL .mp4 ou .webm)" hint="Opcional. Reproduz sem som, em loop; a fotografia desktop vira a capa do vídeo."><input name="videoUrl" defaultValue={cfg.videoUrl ?? ""} placeholder="https://…/luxer-macro.mp4" className="input" /></Field>
                    {(cfg.imageKey || cfg.mobileKey) && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="removeMedia" /> Remover fotografias da abertura</label>}
                  </>}
                </>}
                {s.type === "INSTAGRAM" && <p className="text-xs text-zinc-500 sm:col-span-2">As fotos do Instagram são definidas em Configurações → Marketing (publicações com imagem e link). Sem fotos cadastradas, a seção mostra apenas o link do perfil.</p>}
                {s.type === "REVIEWS" && <p className="text-xs text-zinc-500 sm:col-span-2">Mostra somente avaliações reais aprovadas na moderação. Sem avaliações, a seção não aparece.</p>}
                <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="active" defaultChecked={s.active} /> Seção visível</label>
                <div><Submit>Salvar seção</Submit></div>
              </ActionForm>
            </Collapsible>
          );
        })}
      </div>
      <Card title="Adicionar seção" className="mt-5">
        <ActionForm action={addHomeSection} className="flex flex-wrap gap-2">
          <select name="type" className="input !w-auto">{Object.entries(TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          <input name="title" placeholder="Título" className="input !w-60" />
          <Submit>Adicionar</Submit>
        </ActionForm>
        <p className="mt-2 text-xs text-zinc-500"><Badge tone="gold">Dica</Badge> Uma seção “Vitrine manual” permite montar vitrines temáticas (ex.: presentes até R$ 3.000) informando as referências.</p>
      </Card>
    </>
  );
}
