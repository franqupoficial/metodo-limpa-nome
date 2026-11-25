"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { placeOrderAction } from "@/app/(loja)/_actions/checkout";
import { rememberCheckoutEmail } from "@/app/(loja)/_actions/cart";
import { track } from "./Consent";

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const digits = (s: string) => s.replace(/\D/g, "");
const maskCpf = (v: string) => digits(v).slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
const maskPhone = (v: string) => { const d = digits(v).slice(0, 11); return d.length > 10 ? d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3") : d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3"); };
const maskCep = (v: string) => digits(v).slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
const maskCard = (v: string) => digits(v).slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ");

type Opt = { id: string; name: string; carrier: string; priceCents: number; days: number };
type Props = {
  customer: { name: string; email: string; phone: string; logged: boolean } | null;
  address: { postalCode: string; street: string; number: string; complement: string; district: string; city: string; state: string } | null;
  totals: { subtotal: number; discount: number; pixSavings: number; freeShipping: boolean };
  payment: { pixEnabled: boolean; cardEnabled: boolean; pixPct: number; maxInstallments: number; interestFree: number; monthlyInterestBps: number; minInstallment: number };
  pagarmeKey: string | null;
  enabled: boolean;
  items: { id: string; name: string; price: number; qty: number }[];
};

export function CheckoutForm(p: Props) {
  const router = useRouter();
  const [f, setF] = useState({
    name: p.customer?.name ?? "", email: p.customer?.email ?? "", phone: maskPhone(p.customer?.phone ?? ""), cpf: "",
    postalCode: maskCep(p.address?.postalCode ?? ""), street: p.address?.street ?? "", number: p.address?.number ?? "", complement: p.address?.complement ?? "", district: p.address?.district ?? "", city: p.address?.city ?? "", state: p.address?.state ?? "",
    note: "", createAccount: false, password: "", marketingOptIn: false, acceptTerms: false,
  });
  const [method, setMethod] = useState<"PIX" | "CREDIT_CARD">(p.payment.pixEnabled ? "PIX" : "CREDIT_CARD");
  const [card, setCard] = useState({ number: "", holder: "", exp: "", cvv: "" });
  const [installments, setInstallments] = useState(1);
  const [ship, setShip] = useState<{ options: Opt[]; error?: string } | null>(null);
  const [shipId, setShipId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof f, v: string | boolean) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => { track("begin_checkout", { currency: "BRL", value: (p.totals.subtotal - p.totals.discount) / 100, items: p.items.map((i) => ({ item_id: i.id, item_name: i.name, price: i.price / 100, quantity: i.qty })) }); }, [p.items, p.totals]);

  // CEP → endereço (ViaCEP) e cotação de frete
  useEffect(() => {
    const cep = digits(f.postalCode);
    if (cep.length !== 8) { setShip(null); return; }
    fetch(`https://viacep.com.br/ws/${cep}/json/`).then((r) => r.json()).then((d) => {
      if (!d.erro) setF((x) => ({ ...x, street: x.street || d.logradouro || "", district: x.district || d.bairro || "", city: d.localidade || x.city, state: d.uf || x.state }));
    }).catch(() => {});
    fetch("/api/frete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cep }) }).then((r) => r.json()).then((r) => {
      setShip(r);
      setShipId(r.options?.[0]?.id ?? "");
    }).catch(() => setShip({ options: [], error: "Não foi possível calcular o frete." }));
  }, [f.postalCode]);

  const opt = ship?.options.find((o) => o.id === shipId);
  const shipping = p.totals.freeShipping ? 0 : opt?.priceCents ?? 0;
  const goods = p.totals.subtotal - p.totals.discount - (method === "PIX" ? p.totals.pixSavings : 0);
  const base = goods + shipping;
  const plans = useMemo(() => {
    const out: { n: number; value: number; total: number }[] = [];
    const byMin = p.payment.minInstallment ? Math.floor(base / p.payment.minInstallment) : p.payment.maxInstallments;
    const max = Math.max(1, Math.min(p.payment.maxInstallments, byMin));
    for (let n = 1; n <= max; n++) {
      if (n <= p.payment.interestFree || p.payment.monthlyInterestBps <= 0) out.push({ n, value: Math.ceil(base / n), total: base });
      else { const i = p.payment.monthlyInterestBps / 10000; const v = Math.ceil((base * i) / (1 - Math.pow(1 + i, -n))); out.push({ n, value: v, total: v * n }); }
    }
    return out;
  }, [base, p.payment]);
  const plan = plans.find((x) => x.n === installments) ?? plans[0];
  const total = method === "PIX" ? base : plan?.total ?? base;

  async function tokenize(): Promise<string> {
    if (!p.pagarmeKey) throw new Error("Pagamento com cartão indisponível.");
    const [mm, yy] = card.exp.split("/");
    const res = await fetch(`https://api.pagar.me/core/v5/tokens?appId=${encodeURIComponent(p.pagarmeKey)}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "card", card: { number: digits(card.number), holder_name: card.holder.trim().toUpperCase(), exp_month: Number(mm), exp_year: Number(yy?.length === 2 ? `20${yy}` : yy), cvv: digits(card.cvv), holder_document: digits(f.cpf) } }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.id) throw new Error(data?.message ? `Cartão: ${data.message}` : "Não foi possível validar o cartão. Confira os dados.");
    return data.id as string;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!shipId) return setError("Informe o CEP e escolha a forma de entrega.");
    if (!f.acceptTerms) return setError("Aceite os termos e a política de privacidade.");
    start(async () => {
      let cardToken: string | undefined;
      if (method === "CREDIT_CARD") {
        try { cardToken = await tokenize(); } catch (err) { setError((err as Error).message); return; }
      }
      const r = await placeOrderAction({
        ...f, postalCode: f.postalCode, shippingOptionId: shipId, paymentMethod: method, installments: method === "PIX" ? 1 : installments, cardToken,
        acceptTerms: true, utmSource: new URLSearchParams(window.location.search).get("utm_source") ?? undefined, utmCampaign: new URLSearchParams(window.location.search).get("utm_campaign") ?? undefined,
      });
      if (!r.ok) { setError(r.error); return; }
      router.push(`/pedido/${r.token}?novo=1`);
    });
  }

  const L = ({ children }: { children: React.ReactNode }) => <span className="eyebrow mb-1.5 block text-stone">{children}</span>;
  return (
    <form onSubmit={submit} className="grid gap-14 lg:grid-cols-[1.5fr_1fr] lg:gap-20">
      <div className="space-y-14">
        <section>
          <h2 className="mb-7 flex items-baseline gap-4 border-b border-line pb-4"><span className="text-[11px] tabular-nums tracking-[0.2em] text-gold">01</span><span className="display text-[1.9rem]">Identificação</span></h2>
          {!p.customer?.logged && <p className="mb-5 text-sm text-stone">Já tem conta? <Link href="/conta/entrar?voltar=/checkout" className="text-ink underline">Entrar</Link> · ou continue como visitante.</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2"><L>Nome completo</L><input required autoComplete="name" value={f.name} onChange={(e) => set("name", e.target.value)} className="field" /></label>
            <label><L>E-mail</L><input required type="email" autoComplete="email" value={f.email} onChange={(e) => set("email", e.target.value)} onBlur={() => rememberCheckoutEmail(f.email, f.name)} className="field" /></label>
            <label><L>Celular</L><input required inputMode="tel" autoComplete="tel" value={f.phone} onChange={(e) => set("phone", maskPhone(e.target.value))} className="field" /></label>
            <label><L>CPF</L><input required inputMode="numeric" value={f.cpf} onChange={(e) => set("cpf", maskCpf(e.target.value))} className="field" /><span className="mt-1 block text-[11px] text-stone">Exigido para emissão da nota fiscal e para o pagamento. Armazenado criptografado.</span></label>
          </div>
          <p className="mt-3 text-[11px] text-stone">Ao informar o e-mail, poderemos lembrá-lo(a) do carrinho caso a compra não seja concluída.</p>
        </section>

        <section>
          <h2 className="mb-7 flex items-baseline gap-4 border-b border-line pb-4"><span className="text-[11px] tabular-nums tracking-[0.2em] text-gold">02</span><span className="display text-[1.9rem]">Entrega</span></h2>
          <div className="grid gap-4 sm:grid-cols-6">
            <label className="sm:col-span-2"><L>CEP</L><input required inputMode="numeric" autoComplete="postal-code" value={f.postalCode} onChange={(e) => set("postalCode", maskCep(e.target.value))} className="field" /></label>
            <label className="sm:col-span-4"><L>Rua</L><input required autoComplete="address-line1" value={f.street} onChange={(e) => set("street", e.target.value)} className="field" /></label>
            <label className="sm:col-span-2"><L>Número</L><input required value={f.number} onChange={(e) => set("number", e.target.value)} className="field" /></label>
            <label className="sm:col-span-4"><L>Complemento</L><input value={f.complement} onChange={(e) => set("complement", e.target.value)} className="field" /></label>
            <label className="sm:col-span-2"><L>Bairro</L><input required value={f.district} onChange={(e) => set("district", e.target.value)} className="field" /></label>
            <label className="sm:col-span-3"><L>Cidade</L><input required autoComplete="address-level2" value={f.city} onChange={(e) => set("city", e.target.value)} className="field" /></label>
            <label className="sm:col-span-1"><L>UF</L><input required maxLength={2} value={f.state} onChange={(e) => set("state", e.target.value.toUpperCase())} className="field uppercase" /></label>
          </div>
          <div className="mt-6 space-y-2">
            {!ship && <p className="text-sm text-stone">Informe o CEP para ver as opções de entrega.</p>}
            {ship?.error && <p className="text-sm text-red-700">{ship.error}</p>}
            {ship?.options.map((o) => (
              <label key={o.id} className={`flex cursor-pointer items-center justify-between gap-3 border bg-white px-4 py-4 text-[13px] transition-colors ${shipId === o.id ? "border-ink" : "border-line hover:border-ink/40"}`}>
                <span className="flex items-center gap-3"><input type="radio" name="ship" checked={shipId === o.id} onChange={() => setShipId(o.id)} className="accent-[#0b0b0c]" /> {o.name}{o.carrier && o.carrier !== "Luxer" ? ` · ${o.carrier}` : ""} <span className="text-stone">— até {o.days} dias úteis</span></span>
                <span>{p.totals.freeShipping || o.priceCents === 0 ? "Grátis" : brl(o.priceCents)}</span>
              </label>
            ))}
          </div>
          <label className="mt-5 block"><L>Observações (opcional)</L><textarea value={f.note} onChange={(e) => set("note", e.target.value)} rows={2} maxLength={500} placeholder="Ex.: embalar para presente" className="field" /></label>
        </section>

        <section>
          <h2 className="mb-7 flex items-baseline gap-4 border-b border-line pb-4"><span className="text-[11px] tabular-nums tracking-[0.2em] text-gold">03</span><span className="display text-[1.9rem]">Pagamento</span></h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {p.payment.pixEnabled && <button type="button" onClick={() => setMethod("PIX")} className={`border bg-white px-5 py-4 text-left transition-colors ${method === "PIX" ? "border-ink" : "border-line hover:border-ink/40"}`}><div className="flex items-center gap-2.5 text-sm"><span className={`h-2.5 w-2.5 rounded-full border ${method === "PIX" ? "border-ink bg-ink" : "border-stone"}`} />Pix</div><div className="mt-1 pl-5 text-xs text-stone">{p.payment.pixPct.toLocaleString("pt-BR")}% de desconto · aprovação imediata</div></button>}
            {p.payment.cardEnabled && <button type="button" onClick={() => setMethod("CREDIT_CARD")} className={`border bg-white px-5 py-4 text-left transition-colors ${method === "CREDIT_CARD" ? "border-ink" : "border-line hover:border-ink/40"}`}><div className="flex items-center gap-2.5 text-sm"><span className={`h-2.5 w-2.5 rounded-full border ${method === "CREDIT_CARD" ? "border-ink bg-ink" : "border-stone"}`} />Cartão de crédito</div><div className="mt-1 pl-5 text-xs text-stone">até {p.payment.maxInstallments}x</div></button>}
          </div>
          {method === "PIX" && <p className="mt-4 text-sm text-stone">O QR Code e o código “copia e cola” aparecem na próxima tela. O pedido é confirmado automaticamente após o pagamento.</p>}
          {method === "CREDIT_CARD" && (
            <div className="mt-5 grid gap-4 sm:grid-cols-4">
              <label className="sm:col-span-4"><L>Número do cartão</L><input required inputMode="numeric" autoComplete="cc-number" value={card.number} onChange={(e) => setCard({ ...card, number: maskCard(e.target.value) })} className="field" /></label>
              <label className="sm:col-span-4"><L>Nome impresso no cartão</L><input required autoComplete="cc-name" value={card.holder} onChange={(e) => setCard({ ...card, holder: e.target.value })} className="field uppercase" /></label>
              <label className="sm:col-span-2"><L>Validade (MM/AA)</L><input required inputMode="numeric" autoComplete="cc-exp" placeholder="MM/AA" value={card.exp} onChange={(e) => setCard({ ...card, exp: digits(e.target.value).slice(0, 4).replace(/(\d{2})(\d)/, "$1/$2") })} className="field" /></label>
              <label className="sm:col-span-2"><L>CVV</L><input required inputMode="numeric" autoComplete="cc-csc" value={card.cvv} onChange={(e) => setCard({ ...card, cvv: digits(e.target.value).slice(0, 4) })} className="field" /></label>
              <label className="sm:col-span-4"><L>Parcelamento</L><select value={installments} onChange={(e) => setInstallments(Number(e.target.value))} className="field">{plans.map((x) => <option key={x.n} value={x.n}>{x.n}x de {brl(x.value)}{x.total > base ? ` (total ${brl(x.total)})` : " sem juros"}</option>)}</select></label>
              <p className="text-[11px] text-stone sm:col-span-4">Os dados do cartão são enviados diretamente à Pagar.me (certificada PCI-DSS) e não são armazenados pela Luxer.</p>
            </div>
          )}
        </section>
      </div>

      <aside className="h-fit space-y-6 border-t border-ink pt-7 lg:sticky lg:top-28">
        <h2 className="eyebrow text-ink">Resumo do pedido</h2>
        <ul className="space-y-2.5 text-[13px]">{p.items.map((i) => <li key={i.id} className="flex justify-between gap-3"><span className="line-clamp-1">{i.qty}× {i.name}</span><span>{brl(i.price * i.qty)}</span></li>)}</ul>
        <dl className="space-y-2.5 border-t border-line pt-5 text-[13px] tabular-nums">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{brl(p.totals.subtotal)}</dd></div>
          {p.totals.discount > 0 && <div className="flex justify-between"><dt>Cupom</dt><dd>− {brl(p.totals.discount)}</dd></div>}
          {method === "PIX" && p.totals.pixSavings > 0 && <div className="flex justify-between"><dt>Desconto Pix</dt><dd>− {brl(p.totals.pixSavings)}</dd></div>}
          <div className="flex justify-between"><dt>Frete</dt><dd>{opt ? (shipping === 0 ? "Grátis" : brl(shipping)) : "—"}</dd></div>
          {method === "CREDIT_CARD" && plan && plan.total > base && <div className="flex justify-between"><dt>Juros</dt><dd>{brl(plan.total - base)}</dd></div>}
          <div className="flex items-baseline justify-between border-t border-line pt-4"><dt className="eyebrow">Total</dt><dd className="text-2xl font-light">{brl(total)}</dd></div>
        </dl>
        {!p.customer?.logged && (
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={f.createAccount} onChange={(e) => set("createAccount", e.target.checked)} className="accent-[#0b0b0c]" /> Criar conta para acompanhar pedidos</label>
            {f.createAccount && <input type="password" autoComplete="new-password" placeholder="Senha (8+ caracteres, letras e números)" value={f.password} onChange={(e) => set("password", e.target.value)} className="field" />}
          </div>
        )}
        <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={f.marketingOptIn} onChange={(e) => set("marketingOptIn", e.target.checked)} className="mt-0.5 accent-[#0b0b0c]" /> Quero receber novidades e ofertas por e-mail (opcional).</label>
        <label className="flex items-start gap-2 text-xs"><input type="checkbox" required checked={f.acceptTerms} onChange={(e) => set("acceptTerms", e.target.checked)} className="mt-0.5 accent-[#0b0b0c]" /> <span>Li e aceito os <Link href="/p/termos-e-garantias" target="_blank" className="underline underline-offset-2">termos</Link>, a <Link href="/p/politica-de-troca" target="_blank" className="underline underline-offset-2">política de troca</Link> e a <Link href="/privacidade" target="_blank" className="underline underline-offset-2">política de privacidade</Link>.</span></label>
        {error && <p role="alert" className="border-l border-red-700 pl-3 text-[13px] text-red-800">{error}</p>}
        <button disabled={pending || !p.enabled} className="btn-gold w-full">{pending ? "Processando…" : method === "PIX" ? "Gerar Pix" : "Pagar com cartão"}</button>
        {!p.enabled && <p className="text-xs text-red-700">Pagamentos online em configuração. Fale conosco pelo WhatsApp para concluir sua compra.</p>}
        <p className="text-center text-[11px] text-stone">Ambiente seguro · Pagamento processado pela Pagar.me</p>
      </aside>
    </form>
  );
}
