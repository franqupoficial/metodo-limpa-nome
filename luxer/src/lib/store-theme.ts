/** Dois temas da loja: Dark Luxury (obsidiana) e Light Luxury (porcelana). A escolha fica num cookie. */
export type StoreThemeName = "dark" | "light";
export const THEME_COOKIE = "lx-theme";
export const themeClass = (t: StoreThemeName) => (t === "light" ? "theme-ivory" : "theme-obsidian");

/** Luz do estúdio 3D por tema: no claro, o ambiente refletido é mais claro (ouro quente e luminoso sobre porcelana). */
export const studioFor = (t: StoreThemeName) => (t === "light" ? { backdrop: "#8a7a62", intensity: 1.12 } : { backdrop: "#050505", intensity: 1 });
