"use client";
import { useEffect } from "react";
import { reportClientError } from "@/lib/client-errors";

/** Erros não tratados e promessas rejeitadas da loja vão para o monitor (scripts de terceiros são ignorados). */
export function ClientErrorReporter() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      if (e.filename && !e.filename.startsWith(location.origin)) return;
      reportClientError("window", e.error ?? e.message);
    };
    const onRejection = (e: PromiseRejectionEvent) => reportClientError("promise", e.reason);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => { window.removeEventListener("error", onError); window.removeEventListener("unhandledrejection", onRejection); };
  }, []);
  return null;
}
