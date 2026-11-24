import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { AdminHeader, Panel } from "@/components/admin/ui";
import { NewsForm } from "@/components/admin/NewsForm";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { Notice } from "@/components/ui";
import { deleteNewsAction, saveNewsAction } from "../../../_actions/news";

export const metadata = { title: "Editar notícia" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ criado?: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const { criado } = await searchParams;
  const post = await prisma.newsPost.findUnique({ where: { id } });
  if (!post) notFound();
  return (
    <>
      <AdminHeader back={{ href: "/admin/noticias", label: "Notícias" }} title="Editar notícia" />
      {criado && <div className="mb-4"><Notice tone="success">Notícia criada.</Notice></div>}
      <NewsForm action={saveNewsAction} post={post} defaultAuthor={admin.name} />
      <Panel title="Excluir notícia" className="mt-6 max-w-md">
        <ActionForm action={deleteNewsAction} confirm="Excluir esta notícia definitivamente?"><input type="hidden" name="id" value={post.id} /><Submit className="btn-danger btn-sm" pendingText="Excluindo…">Excluir</Submit></ActionForm>
      </Panel>
    </>
  );
}
