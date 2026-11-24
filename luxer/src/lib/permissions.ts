import type { AdminRole } from "@prisma/client";

/** Catálogo de permissões granulares: módulo.ação */
export const PERMISSIONS = {
  "dashboard.view": "Ver visão geral",
  "products.view": "Consultar produtos",
  "products.edit": "Criar e editar produtos",
  "products.price": "Alterar preços e promoções",
  "products.publish": "Publicar, despublicar e arquivar",
  "products.delete": "Excluir produtos",
  "categories.manage": "Gerenciar categorias e coleções",
  "stock.view": "Consultar estoque",
  "stock.adjust": "Movimentar e ajustar estoque",
  "orders.view": "Consultar pedidos",
  "orders.update": "Atualizar status e envio",
  "orders.cancel": "Cancelar pedidos",
  "orders.refund": "Reembolsar pagamentos",
  "customers.view": "Consultar clientes",
  "customers.edit": "Editar clientes e observações",
  "customers.pii": "Ver CPF completo",
  "customers.export": "Exportar clientes",
  "finance.view": "Consultar financeiro",
  "finance.export": "Exportar relatórios financeiros",
  "marketing.manage": "Banners, pop-ups, cupons e campanhas",
  "content.manage": "Páginas, homepage e perguntas frequentes",
  "reviews.moderate": "Moderar avaliações",
  "support.chat": "Atendimento ao cliente (chat)",
  "ai.view": "Consultar Luxer AI",
  "ai.manage": "Configurar Luxer AI",
  "reports.view": "Ver relatórios",
  "users.manage": "Gerenciar usuários e permissões",
  "settings.manage": "Configurações da loja",
  "integrations.manage": "Integrações e credenciais",
  "audit.view": "Ver log de auditoria",
} as const;

export type Permission = keyof typeof PERMISSIONS;
export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

export const ROLE_LABEL: Record<AdminRole, string> = {
  OWNER: "Proprietário",
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  OPERATOR: "Operador",
  MARKETING: "Marketing",
};

export const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  OWNER: ALL_PERMISSIONS,
  ADMIN: [
    "dashboard.view", "products.view", "products.edit", "products.price", "products.publish", "products.delete",
    "categories.manage", "stock.view", "stock.adjust", "orders.view", "orders.update", "orders.cancel",
    "customers.view", "customers.edit", "customers.export", "marketing.manage", "content.manage",
    "reviews.moderate", "support.chat", "ai.view", "reports.view", "audit.view",
  ],
  MANAGER: [
    "dashboard.view", "products.view", "products.edit", "products.price", "products.publish", "categories.manage",
    "stock.view", "stock.adjust", "orders.view", "orders.update", "orders.cancel", "customers.view",
    "reviews.moderate", "reports.view", "ai.view", "support.chat",
  ],
  OPERATOR: ["dashboard.view", "products.view", "stock.view", "orders.view", "orders.update", "support.chat"],
  MARKETING: [
    "dashboard.view", "products.view", "marketing.manage", "content.manage", "reviews.moderate", "reports.view", "ai.view", "support.chat",
  ],
};

export function effectivePermissions(role: AdminRole, grants: string[] = [], denies: string[] = []): Set<Permission> {
  const set = new Set<Permission>(ROLE_PERMISSIONS[role]);
  for (const g of grants) if (g in PERMISSIONS) set.add(g as Permission);
  // o proprietário nunca perde acesso total (evita travar a loja)
  if (role !== "OWNER") for (const d of denies) set.delete(d as Permission);
  return set;
}
