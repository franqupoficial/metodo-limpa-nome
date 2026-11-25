"use client";
import { useEffect, useState } from "react";

/** null enquanto verifica; false quando o aparelho não oferece WebGL (usa a alternativa estática). */
export function useWebGL() {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      setOk(Boolean(c.getContext("webgl2") || c.getContext("webgl")));
    } catch {
      setOk(false);
    }
  }, []);
  return ok;
}
