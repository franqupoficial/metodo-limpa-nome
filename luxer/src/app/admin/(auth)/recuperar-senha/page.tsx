import Link from "next/link";
import { ActionForm, Submit } from "@/components/admin/forms";
import { forgotAction } from "../../_actions/auth";

export default function ForgotPage() {
  return (
    <ActionForm action={forgotAction} className="space-y-4">
      <h1 className="text-lg font-semibold">Recuperar acesso</h1>
      <p className="text-sm text-zinc-500">Informe seu e-mail. Enviaremos um link válido por 1 hora.</p>
      <div><label className="lbl" htmlFor="email">E-mail</label><input id="email" name="email" type="email" required className="input" /></div>
      <Submit className="btn btn-primary w-full justify-center" pendingText="Enviando…">Enviar link</Submit>
      <p className="text-center text-xs"><Link href="/admin/login" className="text-zinc-500">Voltar ao login</Link></p>
    </ActionForm>
  );
}
