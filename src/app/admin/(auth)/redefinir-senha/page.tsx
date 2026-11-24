import Link from "next/link";
import { PASSWORD_RULES } from "@/lib/auth";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { resetPasswordAction } from "../../_actions/auth";

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!token) return <p className="text-sm">Link inválido. <Link href="/admin/recuperar-senha">Solicite um novo link</Link>.</p>;
  return (
    <>
      <h1 className="text-xl font-bold">Definir nova senha</h1>
      <p className="mt-1 text-sm text-muted">{PASSWORD_RULES}</p>
      <ActionForm action={resetPasswordAction} className="mt-6 space-y-4">
        <input type="hidden" name="token" value={token} />
        <div><label htmlFor="password" className="label">Nova senha</label><input id="password" name="password" type="password" autoComplete="new-password" minLength={12} required className="input" /></div>
        <div><label htmlFor="confirm" className="label">Confirme a nova senha</label><input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={12} required className="input" /></div>
        <Submit className="btn-primary w-full">Definir senha</Submit>
      </ActionForm>
      <p className="mt-4 text-center text-sm"><Link href="/admin/login">Ir para o login</Link></p>
    </>
  );
}
