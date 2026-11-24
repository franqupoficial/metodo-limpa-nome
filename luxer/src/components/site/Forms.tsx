"use client";
import { useActionState, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/action";

export function SiteForm({ action, children, className = "space-y-4", reset = false }: { action: (p: ActionState, fd: FormData) => Promise<ActionState>; children: ReactNode; className?: string; reset?: boolean }) {
  const [state, act] = useActionState(action, null);
  const router = useRouter();
  useEffect(() => {
    if (state?.ok && state.data?.redirect) router.push(state.data.redirect);
    else if (state?.ok) router.refresh();
  }, [state, router]);
  return (
    <form action={act} className={className} key={reset && state?.ok ? Math.random() : undefined}>
      {children}
      {state?.message && <p role="status" className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`}>{state.message}</p>}
    </form>
  );
}

export function SiteSubmit({ children, className = "btn-gold w-full" }: { children: ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return <button disabled={pending} className={className}>{pending ? "Aguarde…" : children}</button>;
}

export function Lbl({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="eyebrow mb-1.5 block text-stone">{label}</span>{children}</label>;
}
