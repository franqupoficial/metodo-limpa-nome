"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef } from "react";
import type { ActionState } from "@/lib/action";

const PendingCtx = createContext(false);

/**
 * Formulário ligado a uma Server Action (proteção CSRF nativa do Next.js: verificação de Origin).
 * Envia via onSubmit para preservar os valores digitados quando há erro de validação.
 */
export function ActionForm({
  action, children, className = "", resetOnSuccess = false, confirm,
}: { action: (prev: ActionState, fd: FormData) => Promise<ActionState>; children: React.ReactNode; className?: string; resetOnSuccess?: boolean; confirm?: string }) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok && resetOnSuccess) ref.current?.reset(); }, [state, resetOnSuccess]);
  return (
    <form
      ref={ref}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        if (pending) return;
        if (confirm && !window.confirm(confirm)) return;
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
    >
      <PendingCtx.Provider value={pending}>{children}</PendingCtx.Provider>
      {state && !pending && (
        <p role="status" className={`mt-3 rounded-lg px-3 py-2 text-sm ${state.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-900"}`}>
          {state.message}
          {state.data && Object.entries(state.data).map(([k, v]) => <span key={k} className="mt-1 block font-mono font-bold">{k}: {v}</span>)}
        </p>
      )}
    </form>
  );
}

export function Submit({ children, className = "btn-primary", pendingText = "Salvando…" }: { children: React.ReactNode; className?: string; pendingText?: string }) {
  const pending = useContext(PendingCtx);
  return <button type="submit" className={className} disabled={pending}>{pending ? pendingText : children}</button>;
}
