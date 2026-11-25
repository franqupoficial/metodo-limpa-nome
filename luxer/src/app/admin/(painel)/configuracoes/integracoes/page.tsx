import { requireAdmin } from "@/lib/auth";
import { PageHeader, Card, Badge } from "@/components/admin/ui";
import { pagarmeConfigured, pagarmeSandbox } from "@/lib/payments/pagarme";
import { melhorEnvioConfigured } from "@/lib/shipping";
import { mailConfigured, appUrl } from "@/lib/mail";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Integrações" };
const has = (k: string) => Boolean(process.env[k]);

export default async function Integrations() {
  await requireAdmin("integrations.manage");
  const s = await getSettings();
  const rows: { name: string; status: boolean; mode?: string; vars: string[]; notes: string }[] = [
    { name: "Pagar.me (Pix e cartão)", status: pagarmeConfigured() && has("NEXT_PUBLIC_PAGARME_PUBLIC_KEY"), mode: pagarmeConfigured() ? (pagarmeSandbox() ? "teste" : "produção") : undefined, vars: ["PAGARME_SECRET_KEY", "NEXT_PUBLIC_PAGARME_PUBLIC_KEY", "PAGARME_WEBHOOK_USER", "PAGARME_WEBHOOK_PASSWORD"], notes: `Webhook: ${appUrl()}/api/webhooks/pagarme (eventos order.* e charge.*, com Basic Auth). Cadastre o domínio da loja no painel Pagar.me para a tokenização do cartão.` },
    { name: "Melhor Envio (Correios e transportadoras)", status: melhorEnvioConfigured(), mode: process.env.MELHORENVIO_ENV === "production" ? "produção" : "sandbox", vars: ["MELHORENVIO_TOKEN", "MELHORENVIO_ENV", "MELHORENVIO_CONTACT_EMAIL"], notes: `Cálculo atual: ${s.shipping.provider === "melhorenvio" ? "Melhor Envio" : "tabela própria"}.` },
    { name: "E-mail transacional (SMTP)", status: mailConfigured(), vars: ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"], notes: "Use um provedor com SPF/DKIM do domínio (Resend, Amazon SES, Brevo…)." },
    { name: "Armazenamento de imagens", status: process.env.STORAGE_DRIVER === "s3" ? has("S3_BUCKET") && has("S3_ACCESS_KEY_ID") : true, mode: process.env.STORAGE_DRIVER || "local", vars: ["STORAGE_DRIVER", "S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "NEXT_PUBLIC_MEDIA_URL"], notes: "Em servidores sem disco persistente (Vercel), use S3 (Supabase Storage, Cloudflare R2 ou AWS)." },
    { name: "Luxer AI — Google Gemini", status: has("GEMINI_API_KEY"), vars: ["GEMINI_API_KEY"], notes: "LUXER AI TRY-ON: detecção da região do corpo, edição generativa e verificação de fidelidade. Use um projeto com faturamento ativo; teste em Luxer AI → Testar integração." },
    { name: "Google Analytics 4 / Tag Manager", status: Boolean(s.analytics.ga4Id || s.analytics.gtmId), vars: [], notes: "Configurado em Configurações → Analytics." },
    { name: "Meta Pixel", status: Boolean(s.analytics.metaPixelId), vars: [], notes: "Configurado em Configurações → Analytics." },
    { name: "Google Merchant Center", status: true, vars: [], notes: `Feed de produtos: ${appUrl()}/feeds/google.xml — cadastre no Merchant Center como feed programado.` },
    { name: "WhatsApp", status: Boolean(s.contact.whatsapp), vars: [], notes: "Botão e links de atendimento (wa.me) com o número em Configurações → Contato." },
    { name: "Rotinas automáticas", status: has("CRON_SECRET"), vars: ["CRON_SECRET"], notes: "Expira Pix, libera reservas, recupera carrinhos, envia campanhas. Agende GET /api/jobs/run a cada 15 min (vercel.json já configura)." },
  ];
  return (
    <>
      <PageHeader title="Integrações e credenciais" back={{ href: "/admin/configuracoes", label: "Configurações" }} subtitle="Credenciais ficam somente em variáveis de ambiente do servidor — nunca no banco, no painel ou no código. Aqui você vê apenas se estão presentes." />
      <Card pad={false}><div className="overflow-x-auto"><table className="tbl"><thead><tr><th>Integração</th><th>Status</th><th>Variáveis</th><th>Observações</th></tr></thead><tbody>
        {rows.map((r) => <tr key={r.name}><td className="font-medium">{r.name}</td><td>{r.status ? <Badge tone="green">Configurado{r.mode ? ` · ${r.mode}` : ""}</Badge> : <Badge tone="amber">Pendente</Badge>}</td>
          <td className="text-[11px]">{r.vars.map((v) => <div key={v} className="font-mono">{has(v) ? "✓" : "✗"} {v}</div>)}</td><td className="max-w-md text-xs text-zinc-600">{r.notes}</td></tr>)}
      </tbody></table></div></Card>
    </>
  );
}
