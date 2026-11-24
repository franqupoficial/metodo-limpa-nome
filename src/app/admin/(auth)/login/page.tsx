import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { loginAction } from "../../_actions/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getCurrentAdmin()) redirect("/admin");
  return (
    <>
      <h1 className="text-xl font-bold">Entrar</h1>
      <p className="mt-1 text-sm text-muted">Acesso restrito à equipe autorizada.</p>
      <ActionForm action={loginAction} className="mt-6 space-y-4">
        <div><label htmlFor="email" className="label">E-mail</label><input id="email" name="email" type="email" autoComplete="username" required className="input" /></div>
        <div><label htmlFor="password" className="label">Senha</label><input id="password" name="password" type="password" autoComplete="current-password" required className="input" /></div>
        <Submit className="btn-primary w-full" pendingText="Entrando…">Entrar</Submit>
      </ActionForm>
      <p className="mt-4 text-center text-sm"><Link href="/admin/recuperar-senha">Esqueci minha senha / primeiro acesso</Link></p>
    </>
  );
}
