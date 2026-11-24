"use client";
import { useActionState, useState } from "react";
import { submitReview, reportReview } from "@/app/(loja)/_actions/reviews";

export function ReviewForm({ productId }: { productId: string }) {
  const [state, action, pending] = useActionState(submitReview, null);
  const [rating, setRating] = useState(5);
  if (state?.ok) return <p className="text-sm text-emerald-700">{state.message}</p>;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="rating" value={rating} />
      <div className="flex gap-1" role="radiogroup" aria-label="Nota">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" role="radio" aria-checked={rating === n} onClick={() => setRating(n)} className={`text-2xl ${n <= rating ? "text-gold" : "text-line"}`}>★</button>)}</div>
      <input name="title" placeholder="Título (opcional)" className="field" maxLength={120} />
      <textarea name="body" placeholder="Conte como foi sua experiência com a peça" rows={4} required minLength={10} className="field" />
      <button disabled={pending} className="btn-gold">{pending ? "Enviando…" : "Enviar avaliação"}</button>
      {state && !state.ok && <p className="text-sm text-red-700">{state.message}</p>}
    </form>
  );
}

export function ReportForm({ reviewId }: { reviewId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(reportReview, null);
  if (state?.ok) return <p className="mt-2 text-xs text-stone">{state.message}</p>;
  if (!open) return <button onClick={() => setOpen(true)} className="mt-2 text-[11px] text-stone underline">Denunciar</button>;
  return (
    <form action={action} className="mt-2 flex gap-2">
      <input type="hidden" name="reviewId" value={reviewId} />
      <input name="reason" placeholder="Motivo da denúncia" required className="field !py-1.5 text-xs" />
      <button disabled={pending} className="text-xs underline">Enviar</button>
      {state && !state.ok && <span className="text-xs text-red-700">{state.message}</span>}
    </form>
  );
}
