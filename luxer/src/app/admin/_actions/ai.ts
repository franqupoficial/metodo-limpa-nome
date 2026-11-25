"use server";
import { assertAdmin, ForbiddenError } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getSettings } from "@/lib/settings";
import { checkModels } from "@/lib/ai/tryon";
import { fail, ok, type ActionState } from "@/lib/action";

/** Diagnóstico real da integração do provador: chave no servidor + disponibilidade dos dois modelos (sem gerar imagem). */
export async function testTryOnIntegration(_: ActionState, _fd: FormData): Promise<ActionState> {
  try {
    const admin = await assertAdmin("ai.manage");
    const s = (await getSettings()).ai;
    const r = await checkModels([s.analysisModel, s.model]);
    await audit(admin.id, "ai.tryon.diagnostic", "Setting", "ai", { meta: { ok: r.every((x) => x.ok) } });
    const text = r.map((x) => `${x.ok ? "✓" : "✗"} ${x.model}: ${x.detail}`).join(" · ");
    return r.every((x) => x.ok) ? ok(`Integração OK — ${text}`) : fail(`Integração com problema — ${text}`);
  } catch (e) {
    if (e instanceof ForbiddenError) return fail(e.message);
    throw e;
  }
}
