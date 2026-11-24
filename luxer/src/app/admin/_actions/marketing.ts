"use server";
import { revalidatePath } from "next/cache";
import type { CouponType } from "@prisma/client";
import { assertAdmin, ForbiddenError } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit, diff } from "@/lib/audit";
import { storeMedia } from "@/lib/images";
import { sendCartRecovery } from "@/lib/cart-recovery";
import { bool, dateTime, dec, fail, int, money, ok, optStr, str, type ActionState } from "@/lib/action";

async function run(fn: () => Promise<ActionState>): Promise<ActionState> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ForbiddenError) return fail(e.message);
    console.error(e);
    return fail(e instanceof Error ? e.message : "Erro inesperado.");
  }
}

const safeUrl = (u: string | null) => (u && (u.startsWith("/") || /^https:\/\//.test(u)) ? u : null);

async function file(fd: FormData, name: string, adminId: string, folder: string) {
  const f = fd.get(name);
  return f instanceof File && f.size > 0 ? (await storeMedia(f, folder, adminId)).key : undefined;
}

// ───────── Banners ─────────
export async function saveBanner(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const admin = await assertAdmin("marketing.manage");
    const id = str(fd, "id") || undefined;
    const title = str(fd, "title");
    if (!title) return fail("Informe o título.");
    const imageKey = await file(fd, "image", admin.id, "banners");
    const mobileKey = await file(fd, "mobile", admin.id, "banners");
    if (!id && !imageKey) return fail("Envie a imagem do banner (recomendado 2400×1200).");
    const data = {
      title, subtitle: optStr(fd, "subtitle"), eyebrow: optStr(fd, "eyebrow"), ctaLabel: optStr(fd, "ctaLabel"), ctaUrl: safeUrl(optStr(fd, "ctaUrl")),
      placement: str(fd, "placement") || "HOME_HERO", theme: str(fd, "theme") === "light" ? "light" : "dark", position: int(fd, "position") ?? 0,
      active: bool(fd, "active"), startsAt: dateTime(fd, "startsAt"), endsAt: dateTime(fd, "endsAt"),
      ...(imageKey ? { imageKey } : {}), ...(mobileKey ? { mobileKey } : {}),
    };
    const before = id ? await prisma.banner.findUnique({ where: { id } }) : null;
    const b = id ? await prisma.banner.update({ where: { id }, data }) : await prisma.banner.create({ data });
    await audit(admin.id, id ? "banner.update" : "banner.create", "Banner", b.id, { changes: diff(before as never, b as never) });
    revalidatePath("/");
    return ok("Banner salvo.", { redirect: "/admin/marketing/banners" });
  });
}

export async function deleteBanner(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const admin = await assertAdmin("marketing.manage");
    await prisma.banner.delete({ where: { id: str(fd, "id") } });
    await audit(admin.id, "banner.delete", "Banner", str(fd, "id"));
    revalidatePath("/");
    return ok("Banner excluído.", { redirect: "/admin/marketing/banners" });
  });
}

// ───────── Cupons ─────────
export async function saveCoupon(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const admin = await assertAdmin("marketing.manage");
    const id = str(fd, "id") || undefined;
    const code = str(fd, "code").toUpperCase().replace(/\s+/g, "");
    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return fail("Código: 3 a 30 caracteres (letras, números, - ou _).");
    const type = str(fd, "type") as CouponType;
    let value = 0;
    if (type === "PERCENT") {
      const pct = dec(fd, "value");
      if (pct == null || pct <= 0 || pct > 90) return fail("Percentual entre 0,01 e 90.");
      value = Math.round(pct * 100);
    } else if (type === "FIXED") {
      const v = money(fd, "value");
      if (!v) return fail("Informe o valor do desconto.");
      value = v;
    }
    const data = {
      code, type, value, description: optStr(fd, "description"), minSubtotalCents: money(fd, "minSubtotal"), maxDiscountCents: money(fd, "maxDiscount"),
      startsAt: dateTime(fd, "startsAt"), endsAt: dateTime(fd, "endsAt"), maxUses: int(fd, "maxUses"), usesPerCustomer: int(fd, "usesPerCustomer"),
      firstOrderOnly: bool(fd, "firstOrderOnly"), active: bool(fd, "active"), categoryIds: fd.getAll("categoryIds").map(String).filter(Boolean),
      campaignId: optStr(fd, "campaignId"),
    };
    const before = id ? await prisma.coupon.findUnique({ where: { id } }) : null;
    const c = id ? await prisma.coupon.update({ where: { id }, data }) : await prisma.coupon.create({ data });
    await audit(admin.id, id ? "coupon.update" : "coupon.create", "Coupon", c.id, { changes: diff(before as never, c as never) });
    return ok("Cupom salvo.", { redirect: "/admin/marketing/cupons" });
  });
}

export async function deleteCoupon(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const admin = await assertAdmin("marketing.manage");
    const c = await prisma.coupon.findUniqueOrThrow({ where: { id: str(fd, "id") } });
    if (c.usedCount > 0) {
      await prisma.coupon.update({ where: { id: c.id }, data: { active: false } });
      return ok("Cupom já utilizado: foi desativado (histórico preservado).", { redirect: "/admin/marketing/cupons" });
    }
    await prisma.coupon.delete({ where: { id: c.id } });
    await audit(admin.id, "coupon.delete", "Coupon", c.id, { meta: { code: c.code } });
    return ok("Cupom excluído.", { redirect: "/admin/marketing/cupons" });
  });
}

// ───────── Pop-ups ─────────
export async function savePopup(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const admin = await assertAdmin("marketing.manage");
    const id = str(fd, "id") || undefined;
    const imageKey = await file(fd, "image", admin.id, "popups");
    const data = {
      name: str(fd, "name") || str(fd, "title"), title: str(fd, "title"), body: optStr(fd, "body"), ctaLabel: optStr(fd, "ctaLabel"), ctaUrl: safeUrl(optStr(fd, "ctaUrl")),
      couponCode: optStr(fd, "couponCode")?.toUpperCase() ?? null, collectEmail: bool(fd, "collectEmail"), delaySeconds: int(fd, "delaySeconds") ?? 8,
      pages: str(fd, "pages") || "all", active: bool(fd, "active"), startsAt: dateTime(fd, "startsAt"), endsAt: dateTime(fd, "endsAt"),
      ...(imageKey ? { imageKey } : {}),
    };
    if (!data.title) return fail("Informe o título.");
    if (data.couponCode && !(await prisma.coupon.findUnique({ where: { code: data.couponCode } }))) return fail(`Cupom ${data.couponCode} não existe. Crie-o antes.`);
    const p = id ? await prisma.popup.update({ where: { id }, data }) : await prisma.popup.create({ data });
    await audit(admin.id, id ? "popup.update" : "popup.create", "Popup", p.id);
    return ok("Pop-up salvo.", { redirect: "/admin/marketing/popups" });
  });
}

export async function deletePopup(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const admin = await assertAdmin("marketing.manage");
    await prisma.popup.delete({ where: { id: str(fd, "id") } });
    await audit(admin.id, "popup.delete", "Popup", str(fd, "id"));
    return ok("Pop-up excluído.", { redirect: "/admin/marketing/popups" });
  });
}

// ───────── Campanhas ─────────
export async function saveCampaign(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const admin = await assertAdmin("marketing.manage");
    const id = str(fd, "id") || undefined;
    const current = id ? await prisma.campaign.findUnique({ where: { id } }) : null;
    if (current && ["SENDING", "SENT"].includes(current.status)) return fail("Campanha já enviada não pode ser alterada.");
    const intent = str(fd, "intent");
    const data = {
      name: str(fd, "name"), subject: optStr(fd, "subject"), preheader: optStr(fd, "preheader"), content: optStr(fd, "content"),
      segmentId: optStr(fd, "segmentId"), utm: optStr(fd, "utm"), scheduledAt: dateTime(fd, "scheduledAt"),
      status: intent === "schedule" ? "SCHEDULED" : "DRAFT",
    };
    if (!data.name) return fail("Dê um nome à campanha.");
    if (intent === "schedule" && (!data.subject || !data.content)) return fail("Assunto e conteúdo são obrigatórios para agendar.");
    if (intent === "schedule" && !data.scheduledAt) data.scheduledAt = new Date();
    const c = id ? await prisma.campaign.update({ where: { id }, data }) : await prisma.campaign.create({ data });
    await audit(admin.id, `campaign.${intent || "save"}`, "Campaign", c.id);
    return ok(intent === "schedule" ? "Campanha agendada: o envio é feito pela rotina automática, em lotes." : "Rascunho salvo.", { redirect: "/admin/marketing/campanhas" });
  });
}

export async function cancelCampaign(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const admin = await assertAdmin("marketing.manage");
    await prisma.campaign.updateMany({ where: { id: str(fd, "id"), status: { in: ["DRAFT", "SCHEDULED"] } }, data: { status: "CANCELED" } });
    await audit(admin.id, "campaign.cancel", "Campaign", str(fd, "id"));
    return ok("Campanha cancelada.");
  });
}

// ───────── Carrinhos ─────────
export async function sendRecoveryNow(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const admin = await assertAdmin("marketing.manage");
    const r = await sendCartRecovery(str(fd, "id"), true);
    await audit(admin.id, "cart.recovery_email", "Cart", str(fd, "id"));
    return r ? ok("E-mail de recuperação enviado.") : fail("Carrinho sem e-mail, vazio ou já recuperado.");
  });
}
