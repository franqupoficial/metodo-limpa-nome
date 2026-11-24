import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ROLE_LABEL, type Permission } from "@/lib/permissions";
import { formatDate } from "@/lib/format";
import { Shell, NotificationsBell, Icon, type NavItem } from "@/components/admin/Shell";
import { logoutAction, markNotificationsRead } from "../_actions/auth";

export const metadata = { title: { default: "Painel", template: "%s · Painel Luxer" }, robots: { index: false } };
export const dynamic = "force-dynamic";

const NAV: (NavItem & { perm: Permission })[] = [
  { href: "/admin", label: "Visão geral", icon: "home", perm: "dashboard.view" },
  { href: "/admin/produtos", label: "Produtos", icon: "box", perm: "products.view" },
  { href: "/admin/categorias", label: "Categorias", icon: "layers", perm: "categories.manage", children: [{ href: "/admin/categorias", label: "Categorias" }, { href: "/admin/categorias/colecoes", label: "Coleções" }] },
  { href: "/admin/estoque", label: "Estoque", icon: "tag", perm: "stock.view", children: [{ href: "/admin/estoque", label: "Saldos" }, { href: "/admin/estoque/movimentacoes", label: "Movimentações" }, { href: "/admin/estoque/inventario", label: "Inventário e CSV" }] },
  { href: "/admin/pedidos", label: "Pedidos", icon: "cart", perm: "orders.view" },
  { href: "/admin/atendimento", label: "Atendimento", icon: "chat", perm: "support.chat" },
  { href: "/admin/clientes", label: "Clientes", icon: "users", perm: "customers.view", children: [{ href: "/admin/clientes", label: "Clientes" }, { href: "/admin/clientes/segmentos", label: "Segmentos" }] },
  { href: "/admin/financeiro", label: "Financeiro", icon: "coin", perm: "finance.view" },
  { href: "/admin/marketing", label: "Marketing", icon: "megaphone", perm: "marketing.manage", children: [
    { href: "/admin/marketing/remarketing", label: "Remarketing" }, { href: "/admin/marketing/banners", label: "Banners" }, { href: "/admin/marketing/cupons", label: "Cupons" }, { href: "/admin/marketing/popups", label: "Pop-ups" },
    { href: "/admin/marketing/campanhas", label: "Campanhas" }, { href: "/admin/marketing/leads", label: "Leads e newsletter" }, { href: "/admin/marketing/carrinhos", label: "Carrinhos abandonados" },
  ] },
  { href: "/admin/conteudo", label: "Conteúdo", icon: "file", perm: "content.manage", children: [{ href: "/admin/conteudo/homepage", label: "Homepage" }, { href: "/admin/conteudo/paginas", label: "Páginas" }, { href: "/admin/conteudo/faq", label: "Perguntas frequentes" }, { href: "/admin/conteudo/midia", label: "Biblioteca de mídia" }] },
  { href: "/admin/avaliacoes", label: "Avaliações", icon: "star", perm: "reviews.moderate" },
  { href: "/admin/luxer-ai", label: "Luxer AI", icon: "spark", perm: "ai.view" },
  { href: "/admin/relatorios", label: "Relatórios", icon: "chart", perm: "reports.view" },
  { href: "/admin/usuarios", label: "Usuários", icon: "shield", perm: "users.manage", children: [{ href: "/admin/usuarios", label: "Usuários" }, { href: "/admin/usuarios/auditoria", label: "Auditoria" }] },
  { href: "/admin/configuracoes", label: "Configurações", icon: "gear", perm: "settings.manage" },
];

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const nav = NAV.filter((n) => admin.can(n.perm) || (n.href === "/admin/usuarios" && admin.can("audit.view"))).map(({ perm: _p, ...n }) => n);
  const navWithBadges = () => nav.map((n) => (n.href === "/admin/atendimento" && waiting ? { ...n, label: `Atendimento (${waiting})` } : n));
  const notes = await prisma.adminNotification.findMany({ where: { OR: [{ adminId: admin.id }, { adminId: null }] }, orderBy: { createdAt: "desc" }, take: 15 });
  const waiting = admin.can("support.chat") ? await prisma.chatConversation.count({ where: { status: { in: ["WAITING_HUMAN", "HUMAN"] }, unreadAdmin: { gt: 0 } } }) : 0;
  const unread = await prisma.adminNotification.count({ where: { readAt: null, OR: [{ adminId: admin.id }, { adminId: null }] } });
  return (
    <Shell
      nav={navWithBadges()}
      user={{ name: admin.name, role: ROLE_LABEL[admin.role] }}
      topbar={
        <>
          <form action="/admin/busca" className="relative flex-1 max-w-xl">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input name="q" placeholder="Buscar pedidos, produtos, clientes, cupons…" className="input !pl-9" aria-label="Busca global" />
          </form>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden sm:block"><Link href="/" target="_blank" className="btn"><Icon name="ext" /> Ver loja</Link></span>
            <NotificationsBell items={notes.map((n) => ({ id: n.id, title: n.title, body: n.body, link: n.link, at: formatDate(n.createdAt, true), read: Boolean(n.readAt) }))} unread={unread} onOpen={markNotificationsRead} />
            <form action={logoutAction}><button className="btn !px-2" aria-label="Sair" title="Sair"><Icon name="out" /></button></form>
          </div>
        </>
      }
    >
      {children}
    </Shell>
  );
}
