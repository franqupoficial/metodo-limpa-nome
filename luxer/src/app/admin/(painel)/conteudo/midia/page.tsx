import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { mediaUrl } from "@/lib/media-url";
import { PageHeader, Card, Empty } from "@/components/admin/ui";
import { ActionForm, ActionButton, Submit } from "@/components/admin/forms";
import { uploadMedia, deleteMedia } from "../../../_actions/content";

export const metadata = { title: "Mídia" };

export default async function MediaLibrary() {
  await requireAdmin("content.manage");
  const items = await prisma.media.findMany({ orderBy: { createdAt: "desc" }, take: 120 });
  return (
    <>
      <PageHeader title="Biblioteca de mídia" subtitle="Imagens de banners, páginas e conteúdo. Copie o endereço para usar em páginas (Markdown não exibe imagens inline; use a imagem de capa)." />
      <Card className="mb-5"><ActionForm action={uploadMedia} className="flex flex-wrap items-center gap-2" resetOnSuccess><input type="file" name="files" multiple accept="image/*" required className="text-sm" /><input name="folder" placeholder="pasta (opcional)" className="input !w-40" /><Submit pendingText="Enviando…">Enviar</Submit></ActionForm></Card>
      {items.length === 0 ? <Card><Empty title="Nenhum arquivo" /></Card> : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {items.map((m) => (
            <div key={m.id} className="card overflow-hidden">
              <img src={mediaUrl(m.key.replace(/\.webp$/, "-thumb.webp"))!} alt="" className="aspect-square w-full bg-zinc-50 object-cover" loading="lazy" />
              <div className="p-2 text-[11px] text-zinc-500"><div className="truncate font-mono" title={mediaUrl(m.key)!}>{mediaUrl(m.key)}</div>{m.width}×{m.height} · {m.folder}
                <div className="mt-1"><ActionButton action={deleteMedia} fields={{ id: m.id }} label="Excluir" className="btn btn-danger !px-2 !py-0.5 text-[11px]" confirm="Excluir arquivo? Conteúdos que o usam ficarão sem imagem." /></div></div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
