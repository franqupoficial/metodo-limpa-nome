import Link from "next/link";
import { ActionForm, Submit } from "@/components/admin/forms";
import { loginAction } from "../../_actions/auth";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <ActionForm action={loginAction} className="space-y-4">
      <h1 className="text-lg font-semibold">Entrar</h1>
      <input type="hidden" name="next" value={next ?? ""} />
      <div><label className="lbl" htmlFor="email">E-mail</label><input id="email" name="email" type="email" autoComplete="username" required className="input" /></div>
      <div><label className="lbl" htmlFor="password">Senha</label><input id="password" name="password" type="password" autoComplete="current-password" required className="input" /></div>
      <Submit className="btn btn-primary w-full justify-center" pendingText="Entrando…">Entrar</Submit>
      <p className="text-center text-xs"><Link href="/admin/recuperar-senha" className="text-zinc-500 hover:text-zinc-900">Esqueci minha senha</Link></p>
    </ActionForm>
  );
}
