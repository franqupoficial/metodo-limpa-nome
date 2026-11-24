"use server";
import { revalidatePath } from "next/cache";
import { assertAdmin, ForbiddenError } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { sendMail, appUrl } from "@/lib/mail";
import { fail, ok, str, type ActionState } from "@/lib/action";

async function run(fn: () => Promise<ActionState>): Promise<ActionState> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ForbiddenError) return fail(e.message);
    console.error(e);
    return fail(e instanceof Error ? e.message : "Erro inesperado.");
  }
}

export async function agentReply(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const admin = await assertAdmin("support.chat");
    const id = str(fd, "id");
    const body = str(fd, "body").slice(0, 3000);
    if (!body) return fail("Escreva a resposta.");
    const c = await prisma.chatConversation.findUniqueOrThrow({ where: { id } });
    await prisma.chatMessage.create({ data: { conversationId: id, role: "AGENT", body, adminId: admin.id, adminName: admin.name } });
    await prisma.chatConversation.update({ where: { id }, data: { status: "HUMAN", assignedAdminId: c.assignedAdminId ?? admin.id, unreadCustomer: { increment: 1 }, lastMessageAt: new Date() } });
    // se o cliente deixou e-mail e não está com o chat aberto, avisa por e-mail (no máximo a cada resposta)
    if (str(fd, "notifyEmail") === "on" && c.email) {
      await sendMail({ to: c.email, template: "chat.reply", subject: "Resposta da Luxer Joias", title: "Respondemos a sua mensagem", paragraphs: [body], cta: { label: "Continuar a conversa", url: appUrl() + "/?chat=1" } });
    }
    return ok("Resposta enviada.");
  });
}

export async function chatOp(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const admin = await assertAdmin("support.chat");
    const id = str(fd, "id");
    const op = str(fd, "op");
    if (op === "assign") await prisma.chatConversation.update({ where: { id }, data: { assignedAdminId: admin.id, status: "HUMAN" } });
    if (op === "close") {
      await prisma.chatConversation.update({ where: { id }, data: { status: "CLOSED", closedAt: new Date() } });
      await prisma.chatMessage.create({ data: { conversationId: id, role: "SYSTEM", body: "Atendimento encerrado. Obrigado por falar com a Luxer!" } });
    }
    if (op === "ai") {
      await prisma.chatConversation.update({ where: { id }, data: { status: "AI", assignedAdminId: null } });
      await prisma.chatMessage.create({ data: { conversationId: id, role: "SYSTEM", body: "O Concierge virtual voltou a responder esta conversa." } });
    }
    await audit(admin.id, `chat.${op}`, "ChatConversation", id);
    revalidatePath("/admin/atendimento");
    return ok("Atualizado.");
  });
}
