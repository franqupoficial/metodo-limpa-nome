"use server";
import { revalidatePath } from "next/cache";
import { assertAdmin, ForbiddenError } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { reconcilePayments } from "@/lib/finance";
import { fail, ok, type ActionState } from "@/lib/action";

export async function reconcileAction(): Promise<ActionState> {
  try {
    const admin = await assertAdmin("finance.view");
    const r = await reconcilePayments();
    await audit(admin.id, "finance.reconcile", "Payment", undefined, { meta: r });
    revalidatePath("/admin/financeiro");
    return ok(`${r.ok} pagamento(s) conciliado(s)${r.waiting ? `; ${r.waiting} ainda sem recebíveis no gateway` : ""}.`);
  } catch (e) {
    return fail(e instanceof ForbiddenError ? e.message : (e as Error).message);
  }
}
