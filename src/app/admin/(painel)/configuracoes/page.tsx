import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { AdminHeader, Panel } from "@/components/admin/ui";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { saveContactAction, savePageAction, savePixAction } from "../../_actions/settings";

export const metadata = { title: "Configurações" };

export default async function Configuracoes() {
  await requireAdmin("ADMIN");
  const [c, retention, pages, pix] = await Promise.all([getSetting("site.contact"), getSetting("privacy.retention"), prisma.page.findMany({ orderBy: { slug: "asc" } }), getSetting("payment.pix")]);
  return (
    <>
      <AdminHeader title="Configurações" subtitle="Dados institucionais, privacidade e páginas editáveis." />
      <Panel title="Dados institucionais e contato" className="mb-6">
        <ActionForm action={saveContactAction} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <label><span className="label text-xs">Razão social / nome empresarial</span><input name="companyName" defaultValue={c.companyName} className="input" /></label>
            <label><span className="label text-xs">CNPJ</span><input name="cnpj" defaultValue={c.cnpj} className="input" /></label>
            <label><span className="label text-xs">E-mail de atendimento</span><input name="email" type="email" defaultValue={c.email} className="input" /></label>
            <label><span className="label text-xs">Telefone</span><input name="phone" defaultValue={c.phone} className="input" /></label>
            <label><span className="label text-xs">WhatsApp</span><input name="whatsapp" defaultValue={c.whatsapp} className="input" /></label>
            <label><span className="label text-xs">Horário de atendimento</span><input name="hours" defaultValue={c.hours} className="input" /></label>
            <label className="sm:col-span-2"><span className="label text-xs">Endereço</span><input name="address" defaultValue={c.address} className="input" /></label>
            <label><span className="label text-xs">Retenção de dados (dias)</span><input name="retentionDays" type="number" min={180} max={3650} defaultValue={retention.retentionDays} className="input" /><span className="hint block">Solicitações encerradas há mais tempo são anonimizadas por <code>npm run retention</code>.</span></label>
          </div>
          <Submit>Salvar</Submit>
        </ActionForm>
      </Panel>

      <Panel title="Recebimento via Pix" className="mb-6">
        <ActionForm action={savePixAction} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="sm:col-span-2"><span className="label text-xs">Chave Pix</span><input name="key" defaultValue={pix.key} className="input font-mono" /></label>
            <label><span className="label text-xs">Cidade (até 15 caracteres)</span><input name="city" defaultValue={pix.city} maxLength={15} className="input" /></label>
            <label><span className="label text-xs">Nome do recebedor (até 25)</span><input name="receiverName" defaultValue={pix.receiverName} maxLength={25} className="input" /></label>
            <label className="sm:col-span-2"><span className="label text-xs">Instruções exibidas ao cliente</span><input name="instructions" defaultValue={pix.instructions} className="input" /></label>
          </div>
          <p className="text-xs text-muted">O QR Code e o “Pix copia e cola” são gerados com esta chave. O banco do cliente mostra o titular real da conta. Cada pagamento é confirmado manualmente na solicitação, após conferência no extrato. Nenhum dado de cartão é coletado.</p>
          <Submit>Salvar Pix</Submit>
        </ActionForm>
      </Panel>

      {pages.map((p) => (
        <Panel key={p.slug} title={`Página: ${p.title}`} className="mb-6">
          <ActionForm action={savePageAction} className="space-y-3">
            <input type="hidden" name="slug" value={p.slug} />
            <input name="title" defaultValue={p.title} className="input" aria-label="Título" />
            <textarea name="content" defaultValue={p.content} rows={14} className="input font-mono text-sm" aria-label="Conteúdo" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="legalReviewed" defaultChecked={p.legalReviewed} className="accent-brand-700" /> Conteúdo revisado juridicamente (remove o aviso de “em revisão” do site)</label>
            <Submit>Salvar página</Submit>
          </ActionForm>
        </Panel>
      ))}
    </>
  );
}
