"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

import { THEME_COOKIE, themeClass, type StoreThemeName } from "@/lib/store-theme";

const Ctx = createContext<{ theme: StoreThemeName; setTheme: (t: StoreThemeName) => void }>({ theme: "dark", setTheme: () => {} });
export const useStoreTheme = () => useContext(Ctx);

export function StoreThemeProvider({ initial, children, className = "" }: { initial: StoreThemeName; children: React.ReactNode; className?: string }) {
  const [theme, set] = useState<StoreThemeName>(initial);
  const setTheme = useCallback((t: StoreThemeName) => {
    set(t);
    document.cookie = `${THEME_COOKIE}=${t}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }, []);
  // cor da barra do navegador acompanha o tema
  useEffect(() => {
    let m = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!m) { m = document.createElement("meta"); m.name = "theme-color"; document.head.appendChild(m); }
    m.content = theme === "light" ? "#f6f3ee" : "#050505";
  }, [theme]);
  return (
    <Ctx.Provider value={{ theme, setTheme }}>
      <div data-store-theme={theme} className={`${themeClass(theme)} ${className}`}>{children}</div>
    </Ctx.Provider>
  );
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useStoreTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button type="button" onClick={() => setTheme(next)} aria-label={next === "light" ? "Ativar tema claro (Light Luxury)" : "Ativar tema escuro (Dark Luxury)"}
      title={next === "light" ? "Light Luxury" : "Dark Luxury"} className={`inline-flex h-9 w-9 items-center justify-center transition-opacity hover:opacity-70 ${className}`}>
      {theme === "dark" ? <Sun className="h-[18px] w-[18px]" strokeWidth={1.25} /> : <Moon className="h-[18px] w-[18px]" strokeWidth={1.25} />}
    </button>
  );
}
