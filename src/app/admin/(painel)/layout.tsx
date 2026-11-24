import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { Sidebar } from "@/components/admin/Sidebar";
import { logoutAction } from "../_actions/auth";

export const metadata: Metadata = { title: { default: "Painel", template: "%s | Painel Portal Consumidor" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="min-h-screen bg-surface">
      <Sidebar name={admin.name} role={admin.role} logout={logoutAction} />
      <main className="lg:pl-60">
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
