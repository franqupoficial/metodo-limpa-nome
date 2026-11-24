"use client";
import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import type { ActionState } from "@/lib/action";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

export function Submit({ children, className = "btn btn-primary", pendingText = "Salvando…", name, value, confirm }: { children: ReactNode; className?: string; pendingText?: string; name?: string; value?: string; confirm?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      className={className}
      disabled={pending}
      name={name}
      value={value}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending ? pendingText : children}
    </button>
  );
}

/** Formulário com server action, mensagem de retorno e redirecionamento opcional (data.redirect). */
export function ActionForm({ action, children, className = "", resetOnSuccess = false, id }: { action: Action; children: ReactNode; className?: string; resetOnSuccess?: boolean; id?: string }) {
  const [state, formAction] = useActionState(action, null);
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && state.data?.redirect) router.push(state.data.redirect);
    else if (state?.ok) {
      if (resetOnSuccess) ref.current?.reset();
      router.refresh();
    }
  }, [state, router, resetOnSuccess]);
  return (
    <form ref={ref} action={formAction} className={className} id={id}>
      {children}
      {state && (
        <p role="status" className={`mt-3 rounded-md px-3 py-2 text-sm ${state.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}

/** Botão isolado que executa uma ação com confirmação (ex.: excluir). */
export function ActionButton({ action, fields, label, confirm, className = "btn", pendingText = "Aguarde…" }: { action: Action; fields: Record<string, string>; label: ReactNode; confirm?: string; className?: string; pendingText?: string }) {
  const [state, formAction] = useActionState(action, null);
  const router = useRouter();
  useEffect(() => {
    if (state?.ok && state.data?.redirect) router.push(state.data.redirect);
    else if (state?.ok) router.refresh();
    else if (state && !state.ok) window.alert(state.message);
  }, [state, router]);
  return (
    <form action={formAction} className="inline">
      {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <Submit className={className} pendingText={pendingText} confirm={confirm}>{label}</Submit>
    </form>
  );
}

/** Caixa de seleção "marcar todos" para ações em lote (marca inputs name=ids do formulário). */
export function SelectAll({ form }: { form: string }) {
  return (
    <input
      type="checkbox"
      aria-label="Selecionar todos"
      onChange={(e) => {
        document.querySelectorAll<HTMLInputElement>(`input[name="ids"][form="${form}"]`).forEach((i) => (i.checked = e.target.checked));
      }}
    />
  );
}

export function Collapsible({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-zinc-800">
        {title}
        <span className="text-zinc-400">{open ? "−" : "+"}</span>
      </button>
      <div className={open ? "border-t border-zinc-100 p-4" : "hidden"}>{children}</div>
    </div>
  );
}
