import { ActionForm, Submit } from "@/components/admin/forms";
import { resetAction } from "../../_actions/auth";
import { PASSWORD_RULES } from "@/lib/auth";

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <ActionForm action={resetAction} className="space-y-4">
      <h1 className="text-lg font-semibold">Definir nova senha</h1>
      <p className="text-xs text-zinc-500">{PASSWORD_RULES}</p>
      <input type="hidden" name="token" value={token ?? ""} />
      <div><label className="lbl">Nova senha</label><input name="password" type="password" autoComplete="new-password" required className="input" /></div>
      <div><label className="lbl">Confirmar senha</label><input name="confirm" type="password" autoComplete="new-password" required className="input" /></div>
      <Submit className="btn btn-primary w-full justify-center">Salvar senha</Submit>
    </ActionForm>
  );
}
