import Link from "next/link";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { requestResetAction } from "../../_actions/auth";

export default function Page() {
  return (
    <>
      <h1 className="text-xl font-bold">Recuperar senha</h1>
      <p className="mt-1 text-sm text-muted">Informe seu e-mail. Enviaremos um link para definir uma nova senha (também usado no primeiro acesso).</p>
      <ActionForm action={requestResetAction} className="mt-6 space-y-4">
        <div><label htmlFor="email" className="label">E-mail</label><input id="email" name="email" type="email" autoComplete="username" required className="input" /></div>
        <Submit className="btn-primary w-full" pendingText="Enviando…">Enviar link</Submit>
      </ActionForm>
      <p className="mt-4 text-center text-sm"><Link href="/admin/login">Voltar ao login</Link></p>
    </>
  );
}
