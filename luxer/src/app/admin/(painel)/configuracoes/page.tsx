import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { mediaUrl } from "@/lib/media-url";
import { centsToInput } from "@/lib/action";
import { PageHeader, Card, Field, Alert } from "@/components/admin/ui";
import { ActionForm, Submit } from "@/components/admin/forms";
import { saveSettings } from "../../_actions/settings";

export const metadata = { title: "Configurações" };
const TABS: [string, string][] = [["loja", "Loja"], ["contato", "Contato e redes"], ["pagamento", "Pagamento"], ["entrega", "Entrega"], ["estoque", "Estoque"], ["seo", "SEO"], ["analytics", "Analytics e pixels"], ["notificacoes", "Notificações"], ["marketing", "Marketing"], ["fiscal", "Fiscal e políticas"], ["tema", "Cores"]];

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const admin = await requireAdmin("settings.manage");
  const aba = (await searchParams).aba ?? "loja";
  const s = await getSettings();
  const G = ({ g }: { g: string }) => <input type="hidden" name="group" value={g} />;
  return (
    <>
      <PageHeader title="Configurações" actions={admin.can("integrations.manage") && <Link href="/admin/configuracoes/integracoes" className="btn">Integrações e credenciais</Link>} />
      <div className="mb-5 flex flex-wrap gap-1">{TABS.map(([k, l]) => <Link key={k} href={`?aba=${k}`} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${aba === k ? "bg-zinc-900 text-[#f3e7cf]" : "bg-white text-zinc-600 ring-1 ring-zinc-200"}`}>{l}</Link>)}</div>

      {aba === "loja" && <Card title="Dados da loja"><ActionForm action={saveSettings} className="grid gap-3 sm:grid-cols-2"><G g="store" />
        <Field label="Nome da loja"><input name="name" defaultValue={s.store.name} className="input" /></Field>
        <Field label="Razão social"><input name="legalName" defaultValue={s.store.legalName} className="input" /></Field>
        <Field label="CNPJ"><input name="cnpj" defaultValue={s.store.cnpj} className="input" /></Field>
        <Field label="Domínio"><input name="domain" defaultValue={s.store.domain} className="input" /></Field>
        <Field label="Assinatura (tagline)" className="sm:col-span-2"><input name="tagline" defaultValue={s.store.tagline} className="input" /></Field>
        <Field label="Logotipo" hint="PNG/WebP com fundo transparente. Sem logotipo, a loja usa a marca tipográfica LUXER.">{s.store.logoKey && <img src={mediaUrl(s.store.logoKey)!} alt="" className="mb-2 h-10 rounded bg-zinc-900 p-1" />}<input type="file" name="logo" accept="image/*" className="text-sm" /></Field>
        <Field label="Favicon">{s.store.faviconKey && <img src={mediaUrl(s.store.faviconKey)!} alt="" className="mb-2 h-8" />}<input type="file" name="favicon" accept="image/*" className="text-sm" /></Field>
        <div><Submit>Salvar</Submit></div></ActionForm></Card>}

      {aba === "contato" && <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Atendimento"><ActionForm action={saveSettings} className="space-y-3"><G g="contact" />
          <Field label="Telefone"><input name="phone" defaultValue={s.contact.phone} className="input" /></Field>
          <Field label="WhatsApp (com DDI e DDD)" hint="Ex.: 5541987846509"><input name="whatsapp" defaultValue={s.contact.whatsapp} className="input" /></Field>
          <Field label="E-mail"><input name="email" defaultValue={s.contact.email} className="input" /></Field>
          <Field label="Endereço"><input name="address" defaultValue={s.contact.address} className="input" /></Field>
          <Field label="Horário de atendimento"><input name="hours" defaultValue={s.contact.hours} className="input" /></Field>
          <Submit>Salvar</Submit></ActionForm></Card>
        <Card title="Redes sociais"><ActionForm action={saveSettings} className="space-y-3"><G g="social" />
          {(["instagram", "facebook", "tiktok", "youtube", "pinterest"] as const).map((k) => <Field key={k} label={k[0].toUpperCase() + k.slice(1)}><input name={k} defaultValue={s.social[k]} placeholder="https://…" className="input" /></Field>)}
          <Submit>Salvar</Submit></ActionForm></Card>
      </div>}

      {aba === "pagamento" && <Card title="Pagamento">
        {!admin.can("integrations.manage") ? <Alert>Somente o proprietário (ou quem tem a permissão Integrações) altera as regras de pagamento.</Alert> :
        <ActionForm action={saveSettings} className="grid gap-3 sm:grid-cols-3"><G g="payment" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="pixEnabled" defaultChecked={s.payment.pixEnabled} /> Aceitar Pix</label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="cardEnabled" defaultChecked={s.payment.cardEnabled} /> Aceitar cartão de crédito</label>
          <Field label="Desconto no Pix (%)" hint="Aplicado quando o produto não tem preço Pix próprio. O site anterior praticava 7%."><input name="pixDiscount" defaultValue={String(s.payment.pixDiscountBps / 100).replace(".", ",")} className="input" /></Field>
          <Field label="Validade do Pix (minutos)"><input name="pixExpiresMinutes" type="number" defaultValue={s.payment.pixExpiresMinutes} className="input" /></Field>
          <Field label="Nome na fatura (até 13)"><input name="statementDescriptor" defaultValue={s.payment.statementDescriptor} className="input" /></Field>
          <Field label="Parcelas máximas"><input name="maxInstallments" type="number" min={1} max={12} defaultValue={s.payment.maxInstallments} className="input" /></Field>
          <Field label="Parcelas sem juros"><input name="interestFreeInstallments" type="number" min={1} max={12} defaultValue={s.payment.interestFreeInstallments} className="input" /></Field>
          <Field label="Juros ao mês acima disso (%)" hint="0 = sem juros."><input name="monthlyInterest" defaultValue={String(s.payment.monthlyInterestBps / 100).replace(".", ",")} className="input" /></Field>
          <Field label="Parcela mínima (R$)"><input name="minInstallment" defaultValue={centsToInput(s.payment.minInstallmentCents)} className="input" /></Field>
          <div className="sm:col-span-3"><Submit>Salvar</Submit></div></ActionForm>}
      </Card>}

      {aba === "entrega" && <Card title="Entrega"><ActionForm action={saveSettings} className="grid gap-3 sm:grid-cols-3"><G g="shipping" />
        <Field label="Cálculo de frete"><select name="provider" defaultValue={s.shipping.provider} className="input"><option value="melhorenvio">Melhor Envio (Correios e transportadoras)</option><option value="table">Tabela própria</option></select></Field>
        <Field label="CEP de origem"><input name="originPostalCode" defaultValue={s.shipping.originPostalCode} className="input" /></Field>
        <Field label="Prazo de preparo (dias úteis)" hint="Somado ao prazo da transportadora. Política atual: 10 dias úteis."><input name="handlingDays" type="number" min={0} defaultValue={s.shipping.handlingDays} className="input" /></Field>
        <Field label="Frete grátis a partir de (R$)" hint="Vazio = sem frete grátis. Aplica-se à opção mais barata."><input name="freeShippingFrom" defaultValue={centsToInput(s.shipping.freeShippingFromCents)} className="input" /></Field>
        <Field label="Serviços Melhor Envio permitidos (IDs)" hint="Vazio = todos. Ex.: 1,2 (PAC, SEDEX)."><input name="allowedServices" defaultValue={s.shipping.allowedServices.join(",")} className="input" /></Field>
        <label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" name="insuranceEnabled" defaultChecked={s.shipping.insuranceEnabled} /> Declarar valor (seguro)</label>
        <Field label="Embalagem padrão — peso (g)"><input name="pkgWeight" type="number" defaultValue={s.shipping.defaultPackage.weightG} className="input" /></Field>
        <Field label="Comprimento × largura × altura (cm)"><div className="flex gap-1"><input name="pkgLength" type="number" defaultValue={s.shipping.defaultPackage.lengthCm} className="input" /><input name="pkgWidth" type="number" defaultValue={s.shipping.defaultPackage.widthCm} className="input" /><input name="pkgHeight" type="number" defaultValue={s.shipping.defaultPackage.heightCm} className="input" /></div></Field>
        <Field label="Tabela própria" className="sm:col-span-3" hint="Uma faixa por linha: Nome;CEP inicial;CEP final;preço;prazo (dias). Ex.: Curitiba — motoboy;80000000;82999999;25,00;1">
          <textarea name="table" rows={5} defaultValue={s.shipping.table.map((r) => `${r.label};${r.fromCep};${r.toCep};${(r.priceCents / 100).toFixed(2).replace(".", ",")};${r.days}`).join("\n")} className="input font-mono text-xs" /></Field>
        <div><Submit>Salvar</Submit></div></ActionForm></Card>}

      {aba === "estoque" && <Card title="Estoque"><ActionForm action={saveSettings} className="grid gap-3 sm:grid-cols-3"><G g="stock" />
        <Field label="Reserva para pedidos com cartão (min)" hint="Pix usa a validade do Pix."><input name="reservationMinutes" type="number" defaultValue={s.stock.reservationMinutes} className="input" /></Field>
        <Field label="Estoque mínimo padrão"><input name="lowStockDefault" type="number" defaultValue={s.stock.lowStockDefault} className="input" /></Field>
        <label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" name="allowBackorder" defaultChecked={s.stock.allowBackorder} /> Vender sem estoque (sob encomenda)</label>
        <div><Submit>Salvar</Submit></div></ActionForm></Card>}

      {aba === "seo" && <Card title="SEO"><ActionForm action={saveSettings} className="space-y-3"><G g="seo" />
        <Field label="Título padrão"><input name="title" defaultValue={s.seo.title} className="input" /></Field>
        <Field label="Descrição padrão"><textarea name="description" defaultValue={s.seo.description} rows={2} className="input" /></Field>
        <Field label="Imagem de compartilhamento (1200×630)">{s.seo.ogImageKey && <img src={mediaUrl(s.seo.ogImageKey)!} alt="" className="mb-2 h-16 rounded" />}<input type="file" name="ogImage" accept="image/*" className="text-sm" /></Field>
        <p className="text-xs text-zinc-500">Sitemap: /sitemap.xml · Feed Google Merchant: /feeds/google.xml</p>
        <Submit>Salvar</Submit></ActionForm></Card>}

      {aba === "analytics" && <Card title="Google Analytics 4, Tag Manager e Meta Pixel">
        {!admin.can("integrations.manage") ? <Alert>Requer permissão de integrações.</Alert> :
        <ActionForm action={saveSettings} className="grid gap-3 sm:grid-cols-2"><G g="analytics" />
          <Field label="GA4 — ID de métricas"><input name="ga4Id" defaultValue={s.analytics.ga4Id} placeholder="G-XXXXXXXXXX" className="input" /></Field>
          <Field label="Google Tag Manager"><input name="gtmId" defaultValue={s.analytics.gtmId} placeholder="GTM-XXXXXX" className="input" /></Field>
          <Field label="Meta Pixel"><input name="metaPixelId" defaultValue={s.analytics.metaPixelId} className="input" /></Field>
          <Field label="Verificação Google Search Console"><input name="googleSiteVerification" defaultValue={s.analytics.googleSiteVerification} className="input" /></Field>
          <p className="text-xs text-zinc-500 sm:col-span-2">Os scripts só carregam após o visitante aceitar cookies de medição (LGPD). Eventos enviados: page_view, view_item, add_to_cart, begin_checkout e purchase.</p>
          <div><Submit>Salvar</Submit></div></ActionForm>}
      </Card>}

      {aba === "notificacoes" && <Card title="Notificações da equipe"><ActionForm action={saveSettings} className="space-y-3"><G g="notifications" />
        <Field label="E-mails para novos pedidos e avaliações" hint="Separados por vírgula."><input name="orderEmails" defaultValue={s.notifications.orderEmails.join(", ")} className="input" /></Field>
        <Field label="E-mails para estoque baixo"><input name="lowStockEmails" defaultValue={s.notifications.lowStockEmails.join(", ")} className="input" /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="notifyNewOrder" defaultChecked={s.notifications.notifyNewOrder} /> Avisar novo pedido pago</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="notifyLowStock" defaultChecked={s.notifications.notifyLowStock} /> Avisar estoque baixo</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="notifyNewReview" defaultChecked={s.notifications.notifyNewReview} /> Avisar nova avaliação</label>
        <Submit>Salvar</Submit></ActionForm></Card>}

      {aba === "marketing" && <Card title="Marketing e WhatsApp"><ActionForm action={saveSettings} className="space-y-3"><G g="marketing" />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="whatsappButton" defaultChecked={s.marketing.whatsappButton} /> Botão flutuante de WhatsApp</label>
        <Field label="Mensagem inicial do WhatsApp"><input name="whatsappMessage" defaultValue={s.marketing.whatsappMessage} className="input" /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="cartRecoveryEnabled" defaultChecked={s.marketing.cartRecoveryEnabled} /> Recuperação automática de carrinho por e-mail</label>
        <Field label="Enviar após (horas sem atividade)"><input name="cartRecoveryDelayHours" type="number" min={1} defaultValue={s.marketing.cartRecoveryDelayHours} className="input !w-32" /></Field>
        <Field label="Texto de consentimento da newsletter"><textarea name="newsletterConsentText" defaultValue={s.marketing.newsletterConsentText} rows={2} className="input" /></Field>
        <Field label="Publicações do Instagram na homepage" hint="Uma por linha: chave-da-imagem;link-do-post;legenda. A chave aparece na Biblioteca de mídia (ex.: media/geral/abc.webp).">
          <textarea name="instagramPosts" rows={4} defaultValue={s.marketing.instagramPosts.map((p) => `${p.imageKey};${p.url};${p.caption ?? ""}`).join("\n")} className="input font-mono text-xs" /></Field>
        <Submit>Salvar</Submit></ActionForm></Card>}

      {aba === "fiscal" && <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Fiscal"><ActionForm action={saveSettings} className="space-y-3"><G g="fiscal" />
          <Field label="Regime tributário"><input name="regime" defaultValue={s.fiscal.regime} className="input" /></Field>
          <Field label="Inscrição estadual"><input name="stateRegistration" defaultValue={s.fiscal.stateRegistration} className="input" /></Field>
          <Field label="Emissor de NF-e" hint="Integração de emissão ainda não implementada: informe o sistema usado hoje."><input name="provider" defaultValue={s.fiscal.provider} className="input" /></Field>
          <Field label="Observações"><textarea name="notes" defaultValue={s.fiscal.notes} rows={3} className="input" /></Field>
          <Submit>Salvar</Submit></ActionForm></Card>
        <Card title="Políticas"><ActionForm action={saveSettings} className="space-y-3"><G g="policies" />
          <Field label="Prazo de troca/desistência (dias)"><input name="exchangeDays" type="number" defaultValue={s.policies.exchangeDays} className="input" /></Field>
          <Field label="Texto curto de garantia (página do produto)"><textarea name="warrantyText" defaultValue={s.policies.warrantyText} rows={3} className="input" /></Field>
          <p className="text-xs text-zinc-500">Os textos completos das políticas são editados em Conteúdo → Páginas.</p>
          <Submit>Salvar</Submit></ActionForm></Card>
      </div>}

      {aba === "tema" && <Card title="Cores da marca"><ActionForm action={saveSettings} className="grid gap-3 sm:grid-cols-3"><G g="theme" />
        <Field label="Preto profundo"><input type="color" name="black" defaultValue={s.theme.black} className="h-10 w-full" /></Field>
        <Field label="Dourado champagne"><input type="color" name="gold" defaultValue={s.theme.gold} className="h-10 w-full" /></Field>
        <Field label="Marfim (fundo)"><input type="color" name="ivory" defaultValue={s.theme.ivory} className="h-10 w-full" /></Field>
        <div><Submit>Salvar</Submit></div></ActionForm></Card>}
    </>
  );
}
