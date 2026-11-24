"use server";
import { revalidatePath } from "next/cache";
import { assertAdmin, ForbiddenError } from "@/lib/auth";
import { audit, diff } from "@/lib/audit";
import { getSettings, saveSettingsGroup, type Settings, type SettingsGroup } from "@/lib/settings";
import { storeMedia } from "@/lib/images";
import { isValidEmail, onlyDigits } from "@/lib/validators";
import { bool, dec, fail, int, money, ok, str, type ActionState } from "@/lib/action";
import type { Permission } from "@/lib/permissions";

const GROUP_PERMISSION: Partial<Record<SettingsGroup, Permission>> = { ai: "ai.manage", analytics: "integrations.manage", payment: "integrations.manage" };

const emails = (v: string) => v.split(/[,;\s]+/).map((e) => e.trim().toLowerCase()).filter(Boolean);
const hex = (v: string, d: string) => (/^#[0-9a-f]{6}$/i.test(v) ? v : d);
const safeUrl = (v: string) => (!v || /^https:\/\/[^\s]+$/.test(v) ? v : "");

export async function saveSettings(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const group = str(fd, "group") as SettingsGroup;
    const admin = await assertAdmin(GROUP_PERMISSION[group] ?? "settings.manage");
    const s = await getSettings();
    const before = structuredClone(s[group]);
    const upload = async (name: string) => {
      const f = fd.get(name);
      return f instanceof File && f.size > 0 ? (await storeMedia(f, "marca", admin.id)).key : undefined;
    };
    let next: Settings[SettingsGroup];

    switch (group) {
      case "store":
        next = { ...s.store, name: str(fd, "name") || s.store.name, legalName: str(fd, "legalName"), cnpj: str(fd, "cnpj"), tagline: str(fd, "tagline"), domain: str(fd, "domain"),
          logoKey: (await upload("logo")) ?? s.store.logoKey, faviconKey: (await upload("favicon")) ?? s.store.faviconKey };
        break;
      case "contact": {
        const email = str(fd, "email");
        if (email && !isValidEmail(email)) return fail("E-mail de contato inválido.");
        next = { phone: str(fd, "phone"), whatsapp: onlyDigits(str(fd, "whatsapp")), email, address: str(fd, "address"), hours: str(fd, "hours") };
        break;
      }
      case "social":
        next = { instagram: safeUrl(str(fd, "instagram")), facebook: safeUrl(str(fd, "facebook")), tiktok: safeUrl(str(fd, "tiktok")), youtube: safeUrl(str(fd, "youtube")), pinterest: safeUrl(str(fd, "pinterest")) };
        break;
      case "theme":
        next = { black: hex(str(fd, "black"), s.theme.black), gold: hex(str(fd, "gold"), s.theme.gold), ivory: hex(str(fd, "ivory"), s.theme.ivory) };
        break;
      case "payment": {
        const pix = dec(fd, "pixDiscount") ?? 0;
        if (pix < 0 || pix > 30) return fail("Desconto Pix entre 0% e 30%.");
        const maxI = int(fd, "maxInstallments") ?? 1;
        if (maxI < 1 || maxI > 12) return fail("Parcelamento entre 1 e 12 vezes.");
        next = { pixEnabled: bool(fd, "pixEnabled"), cardEnabled: bool(fd, "cardEnabled"), pixDiscountBps: Math.round(pix * 100), maxInstallments: maxI,
          interestFreeInstallments: Math.min(maxI, int(fd, "interestFreeInstallments") ?? maxI), monthlyInterestBps: Math.round((dec(fd, "monthlyInterest") ?? 0) * 100),
          minInstallmentCents: money(fd, "minInstallment") ?? 0, pixExpiresMinutes: Math.max(15, Math.min(1440, int(fd, "pixExpiresMinutes") ?? 60)),
          statementDescriptor: str(fd, "statementDescriptor").toUpperCase().replace(/[^A-Z0-9 ]/g, "").slice(0, 13) || "LUXERJOIAS" };
        break;
      }
      case "shipping": {
        const table = str(fd, "table").split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
          const [label, from, to, price, days] = l.split(";").map((x) => x.trim());
          return { label, fromCep: onlyDigits(from), toCep: onlyDigits(to), priceCents: Math.round(Number((price ?? "").replace(",", ".")) * 100), days: Number(days) };
        });
        if (table.some((r) => !r.label || r.fromCep.length !== 8 || r.toCep.length !== 8 || !Number.isFinite(r.priceCents) || r.priceCents < 0 || !Number.isInteger(r.days))) return fail("Tabela de frete: use uma linha por faixa no formato  Nome;CEP inicial;CEP final;preço;prazo em dias.");
        const origin = onlyDigits(str(fd, "originPostalCode"));
        if (origin.length !== 8) return fail("CEP de origem inválido.");
        next = { originPostalCode: origin, provider: str(fd, "provider") === "melhorenvio" ? "melhorenvio" : "table", freeShippingFromCents: money(fd, "freeShippingFrom"),
          handlingDays: int(fd, "handlingDays") ?? 0, table, insuranceEnabled: bool(fd, "insuranceEnabled"),
          allowedServices: str(fd, "allowedServices").split(/[,\s]+/).filter((x) => /^\d+$/.test(x)),
          defaultPackage: { weightG: int(fd, "pkgWeight") ?? 300, lengthCm: int(fd, "pkgLength") ?? 16, widthCm: int(fd, "pkgWidth") ?? 11, heightCm: int(fd, "pkgHeight") ?? 6 } };
        break;
      }
      case "stock":
        next = { reservationMinutes: Math.max(10, int(fd, "reservationMinutes") ?? 60), lowStockDefault: int(fd, "lowStockDefault") ?? 1, allowBackorder: bool(fd, "allowBackorder") };
        break;
      case "seo":
        next = { title: str(fd, "title"), description: str(fd, "description"), ogImageKey: (await upload("ogImage")) ?? s.seo.ogImageKey };
        break;
      case "analytics": {
        const ga = str(fd, "ga4Id"), gtm = str(fd, "gtmId"), px = str(fd, "metaPixelId");
        if (ga && !/^G-[A-Z0-9]{4,12}$/.test(ga)) return fail("ID do GA4 inválido (G-XXXXXXX).");
        if (gtm && !/^GTM-[A-Z0-9]{4,10}$/.test(gtm)) return fail("ID do GTM inválido (GTM-XXXXXX).");
        if (px && !/^\d{8,20}$/.test(px)) return fail("ID do Meta Pixel inválido (somente números).");
        next = { ga4Id: ga, gtmId: gtm, metaPixelId: px, googleSiteVerification: str(fd, "googleSiteVerification").replace(/[^A-Za-z0-9_-]/g, "") };
        break;
      }
      case "notifications": {
        const o = emails(str(fd, "orderEmails")), l = emails(str(fd, "lowStockEmails"));
        if ([...o, ...l].some((e) => !isValidEmail(e))) return fail("Há e-mail inválido na lista.");
        next = { orderEmails: o, lowStockEmails: l, notifyNewOrder: bool(fd, "notifyNewOrder"), notifyLowStock: bool(fd, "notifyLowStock"), notifyNewReview: bool(fd, "notifyNewReview") };
        break;
      }
      case "fiscal":
        next = { regime: str(fd, "regime"), stateRegistration: str(fd, "stateRegistration"), provider: str(fd, "provider"), notes: str(fd, "notes") };
        break;
      case "policies":
        next = { exchangeDays: int(fd, "exchangeDays") ?? 7, warrantyText: str(fd, "warrantyText") };
        break;
      case "marketing": {
        const posts = str(fd, "instagramPosts").split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
          const [imageKey, url, caption] = l.split(";").map((x) => x.trim());
          return { imageKey, url: safeUrl(url), caption };
        }).filter((p) => p.imageKey && p.url).slice(0, 12);
        next = { whatsappButton: bool(fd, "whatsappButton"), whatsappMessage: str(fd, "whatsappMessage"), cartRecoveryEnabled: bool(fd, "cartRecoveryEnabled"),
          cartRecoveryDelayHours: Math.max(1, int(fd, "cartRecoveryDelayHours") ?? 3), newsletterConsentText: str(fd, "newsletterConsentText") || s.marketing.newsletterConsentText, instagramPosts: posts };
        break;
      }
      case "ai": {
        const cats = fd.getAll("categories").map(String);
        next = { tryOnEnabled: bool(fd, "tryOnEnabled"), provider: str(fd, "provider") === "openai" ? "openai" : "gemini", model: str(fd, "model").replace(/[^A-Za-z0-9._-]/g, "") || s.ai.model,
          categories: cats, dailyLimitPerClient: Math.max(1, int(fd, "dailyLimitPerClient") ?? 5), dailyGlobalLimit: Math.max(1, int(fd, "dailyGlobalLimit") ?? 300),
          monthlyBudgetCents: money(fd, "monthlyBudget") ?? 0, costPerRequestCents: money(fd, "costPerRequest") ?? 0, retainResultsHours: Math.max(0, Math.min(72, int(fd, "retainResultsHours") ?? 0)),
          disclaimer: str(fd, "disclaimer"), unavailableMessage: str(fd, "unavailableMessage"), consentText: str(fd, "consentText") || s.ai.consentText };
        break;
      }
      default:
        return fail("Grupo de configuração inválido.");
    }
    await saveSettingsGroup(group, next as never);
    await audit(admin.id, `settings.${group}`, "Setting", group, { changes: diff(before as never, next as never) });
    revalidatePath("/", "layout");
    return ok("Configurações salvas.");
  } catch (e) {
    if (e instanceof ForbiddenError) return fail(e.message);
    console.error(e);
    return fail(e instanceof Error ? e.message : "Erro inesperado.");
  }
}
