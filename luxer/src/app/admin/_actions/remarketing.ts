"use server";
import { revalidatePath } from "next/cache";
import { assertAdmin, ForbiddenError } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { runFlow, flowAudience, type FlowConfig } from "@/lib/remarketing";
import { bool, dec, fail, int, money, ok, str, type ActionState } from "@/lib/action";

async function run(fn: () => Promise<ActionState>): Promise<ActionState> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ForbiddenError) return fail(e.message);
    console.error(e);
    return fail(e instanceof Error ? e.message : "Erro inesperado.");
  }
}

function readConfig(fd: FormData, prev: FlowConfig): FlowConfig {
  const pct = dec(fd, "couponPercent") ?? 0;
  return {
    ...prev,
    inactiveDays: int(fd, "inactiveDays") ?? prev.inactiveDays,
    delayDays: int(fd, "delayDays") ?? prev.delayDays,
    minSpentCents: money(fd, "minSpent") ?? prev.minSpentCents,
    couponPercent: Math.max(0, Math.min(50, pct)),
    couponDays: int(fd, "couponDays") ?? prev.couponDays,
    followUpDays: int(fd, "followUpDays") ?? undefined,
    channel: (str(fd, "channel") || prev.channel || "EMAIL") as FlowConfig["channel"],
    subject: str(fd, "subject") || prev.subject,
    body: str(fd, "body") || prev.body,
    reminderSubject: str(fd, "reminderSubject") || undefined,
    reminderBody: str(fd, "reminderBody") || undefined,
    ctaLabel: str(fd, "ctaLabel") || prev.ctaLabel,
    ctaUrl: str(fd, "ctaUrl").startsWith("/") ? str(fd, "ctaUrl") : prev.ctaUrl,
    whatsappText: str(fd, "whatsappText") || prev.whatsappText,
    batchPerRun: Math.max(10, Math.min(500, int(fd, "batchPerRun") ?? prev.batchPerRun ?? 80)),
  };
}

export async function saveFlow(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const admin = await assertAdmin("marketing.manage");
    const f = await prisma.automationFlow.findUniqueOrThrow({ where: { id: str(fd, "id") } });
    const config = readConfig(fd, f.config as FlowConfig);
    await prisma.automationFlow.update({ where: { id: f.id }, data: { name: str(fd, "name") || f.name, active: bool(fd, "active"), config } });
    await audit(admin.id, "remarketing.flow_save", "AutomationFlow", f.id, { meta: { active: bool(fd, "active") } });
    revalidatePath("/admin/marketing/remarketing");
    return ok(bool(fd, "active") ? "Fluxo salvo e ATIVO: a rotina automática fará os envios." : "Fluxo salvo (desativado).");
  });
}

export async function runFlowNow(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const admin = await assertAdmin("marketing.manage");
    const r = await runFlow(str(fd, "id"), { force: true });
    await audit(admin.id, "remarketing.flow_run", "AutomationFlow", str(fd, "id"), { meta: r });
    revalidatePath("/admin/marketing/remarketing");
    return ok(`Executado: ${r.sent} e-mail(s), ${r.queued} WhatsApp na fila, ${r.reminders} lembrete(s).`);
  });
}

/** "Recuperar clientes": campanha única para um segmento, executada em lotes pela rotina. */
export async function launchRecovery(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const admin = await assertAdmin("marketing.manage");
    const name = str(fd, "name") || "Recuperação de clientes";
    const config: FlowConfig = readConfig(fd, { subject: "", body: "", runOnce: true, segmentId: str(fd, "segmentId") || null, ctaUrl: "/" });
    if (!config.subject || !config.body) return fail("Preencha assunto e mensagem.");
    const preview = await flowAudience("MANUAL", config, 1);
    if (!preview.total) return fail("O público escolhido está vazio.");
    const f = await prisma.automationFlow.create({ data: { trigger: "MANUAL", name, active: true, config } });
    const r = await runFlow(f.id);
    await audit(admin.id, "remarketing.recovery_launch", "AutomationFlow", f.id, { meta: { total: preview.total, ...r } });
    revalidatePath("/admin/marketing/remarketing");
    return ok(`Campanha iniciada para até ${preview.total} cliente(s). Primeiro lote: ${r.sent} e-mail(s) e ${r.queued} WhatsApp na fila. O restante segue automaticamente a cada 15 minutos.`);
  });
}

export async function whatsappDone(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const admin = await assertAdmin("marketing.manage");
    const op = str(fd, "op");
    await prisma.automationSend.update({ where: { id: str(fd, "id") }, data: { status: op === "skip" ? "SKIPPED" : "DONE", clickedAt: op === "skip" ? undefined : new Date() } });
    await audit(admin.id, `remarketing.whatsapp_${op || "done"}`, "AutomationSend", str(fd, "id"));
    revalidatePath("/admin/marketing/remarketing");
    return ok(op === "skip" ? "Removido da fila." : "Marcado como enviado.");
  });
}
