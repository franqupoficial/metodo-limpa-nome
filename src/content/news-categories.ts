export const NEWS_CATEGORIES = [
  { slug: "direitos-do-consumidor", label: "Direitos do consumidor" },
  { slug: "credito", label: "Crédito" },
  { slug: "cpf", label: "CPF" },
  { slug: "formalizacao", label: "Formalização" },
  { slug: "mei", label: "MEI" },
  { slug: "empreendedorismo", label: "Empreendedorismo" },
  { slug: "mobilidade", label: "Mobilidade" },
  { slug: "locacao", label: "Locação" },
  { slug: "motoristas-de-aplicativo", label: "Motoristas de aplicativo" },
  { slug: "servicos-digitais", label: "Serviços digitais" },
] as const;

export const newsCategoryLabel = (slug: string) => NEWS_CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
export const isNewsCategory = (slug: string) => NEWS_CATEGORIES.some((c) => c.slug === slug);
