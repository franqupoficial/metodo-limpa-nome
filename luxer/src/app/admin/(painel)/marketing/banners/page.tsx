import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { mediaUrl } from "@/lib/media-url";
import { formatDate } from "@/lib/format";
import { PageHeader, Card, Badge, Field, Empty } from "@/components/admin/ui";
import { ActionForm, ActionButton, Submit } from "@/components/admin/forms";
import { dtLocal } from "@/components/admin/dt";
import { saveBanner, deleteBanner } from "../../../_actions/marketing";

export const metadata = { title: "Banners" };
const PLACES: Record<string, string> = { HOME_HERO: "Homepage — destaque principal", HOME_STRIP: "Homepage — faixa intermediária", FAITH: "Luxer Fé — topo", CATALOG: "Catálogo — topo" };

export default async function Banners({ searchParams }: { searchParams: Promise<{ editar?: string }> }) {
  await requireAdmin("marketing.manage");
  const { editar } = await searchParams;
  const list = await prisma.banner.findMany({ orderBy: [{ placement: "asc" }, { position: "asc" }] });
  const b = editar ? list.find((x) => x.id === editar) : null;
  const now = new Date();
  return (
    <>
      <PageHeader title="Banners" subtitle="Imagens, títulos e chamadas da homepage e das vitrines — sem editar código." />
      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <Card pad={false}>
          {list.length === 0 ? <Empty title="Nenhum banner">Sem banner, a homepage exibe um destaque com a fotografia de um produto do catálogo.</Empty> : (
            <table className="tbl"><tbody>{list.map((x) => {
              const live = x.active && (!x.startsAt || x.startsAt <= now) && (!x.endsAt || x.endsAt > now);
              return (
                <tr key={x.id}>
                  <td className="w-32">{x.imageKey && <img src={mediaUrl(x.imageKey)!} alt="" className="h-16 w-28 rounded object-cover" />}</td>
                  <td><div className="font-medium">{x.title}</div><div className="text-[11px] text-zinc-500">{PLACES[x.placement] ?? x.placement} · ordem {x.position} · {x.clicks} clique(s)</div>
                    <div className="text-[11px] text-zinc-500">{x.startsAt ? `de ${formatDate(x.startsAt, true)} ` : ""}{x.endsAt ? `até ${formatDate(x.endsAt, true)}` : ""}</div></td>
                  <td>{live ? <Badge tone="green">No ar</Badge> : x.active ? <Badge tone="amber">Agendado/expirado</Badge> : <Badge>Inativo</Badge>}</td>
                  <td className="text-right"><Link href={`?editar=${x.id}`} className="btn !py-1 text-xs">Editar</Link></td>
                </tr>
              );
            })}</tbody></table>
          )}
        </Card>
        <Card title={b ? "Editar banner" : "Novo banner"} actions={b && <Link href="/admin/marketing/banners" className="text-xs text-zinc-500">+ novo</Link>}>
          <ActionForm action={saveBanner} className="space-y-3" key={b?.id ?? "new"}>
            {b && <input type="hidden" name="id" value={b.id} />}
            <Field label="Posição"><select name="placement" defaultValue={b?.placement ?? "HOME_HERO"} className="input">{Object.entries(PLACES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
            <Field label="Sobretítulo"><input name="eyebrow" defaultValue={b?.eyebrow ?? ""} className="input" placeholder="Nova coleção" /></Field>
            <Field label="Título *"><input name="title" defaultValue={b?.title} required className="input" /></Field>
            <Field label="Subtítulo"><textarea name="subtitle" defaultValue={b?.subtitle ?? ""} rows={2} className="input" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Texto do botão"><input name="ctaLabel" defaultValue={b?.ctaLabel ?? ""} className="input" /></Field>
              <Field label="Link do botão"><input name="ctaUrl" defaultValue={b?.ctaUrl ?? ""} placeholder="/categoria/aneis" className="input" /></Field>
            </div>
            <Field label="Imagem (desktop)" hint="Recomendado 2400×1200, foto editorial."><input type="file" name="image" accept="image/*" className="text-sm" /></Field>
            <Field label="Imagem (celular, opcional)" hint="Recomendado 1080×1350."><input type="file" name="mobile" accept="image/*" className="text-sm" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Texto sobre a imagem"><select name="theme" defaultValue={b?.theme ?? "dark"} className="input"><option value="dark">Claro (imagem escura)</option><option value="light">Escuro (imagem clara)</option></select></Field>
              <Field label="Ordem"><input name="position" type="number" defaultValue={b?.position ?? 0} className="input" /></Field>
              <Field label="Início"><input type="datetime-local" name="startsAt" defaultValue={dtLocal(b?.startsAt)} className="input" /></Field>
              <Field label="Fim"><input type="datetime-local" name="endsAt" defaultValue={dtLocal(b?.endsAt)} className="input" /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={b?.active ?? true} /> Ativo</label>
            <Submit>Salvar banner</Submit>
          </ActionForm>
          {b && <div className="mt-3 border-t pt-3"><ActionButton action={deleteBanner} fields={{ id: b.id }} label="Excluir" className="btn btn-danger" confirm="Excluir banner?" /></div>}
        </Card>
      </div>
    </>
  );
}
