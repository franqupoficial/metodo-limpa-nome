import { ActionForm, Submit } from "@/components/admin/forms";
import { setupOwnerAction } from "../../_actions/auth";
import { PASSWORD_RULES } from "@/lib/auth";
import { setupOpen } from "@/lib/admin-setup";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if (!(await setupOpen())) {
    return (
      <div className="space-y-3">
        <h1 className="text-lg font-semibold">Primeiro acesso indisponível</h1>
        <p className="text-sm text-zinc-500">A conta master já foi criada ou o código de instalação não está configurado. Entre pela página de login.</p>
        <a href="/admin/login" className="btn btn-primary w-full justify-center">Ir para o login</a>
      </div>
    );
  }
  return (
    <ActionForm action={setupOwnerAction} className="space-y-4">
      <h1 className="text-lg font-semibold">Primeiro acesso — conta master</h1>
      <p className="text-xs text-zinc-500">Use o código de instalação definido na hospedagem (ADMIN_SETUP_CODE). Esta página se desativa depois que a conta é criada.</p>
      <div><label className="lbl">Código de instalação</label><input name="code" type="password" autoComplete="off" required className="input" /></div>
      <div><label className="lbl">Nome</label><input name="name" defaultValue="Master" className="input" /></div>
      <div><label className="lbl">E-mail</label><input name="email" type="email" autoComplete="username" required className="input" /></div>
      <p className="text-xs text-zinc-500">{PASSWORD_RULES}</p>
      <div><label className="lbl">Senha</label><input name="password" type="password" autoComplete="new-password" required className="input" /></div>
      <div><label className="lbl">Confirmar senha</label><input name="confirm" type="password" autoComplete="new-password" required className="input" /></div>
      <Submit className="btn btn-primary w-full justify-center">Criar conta master</Submit>
    </ActionForm>
  );
}
