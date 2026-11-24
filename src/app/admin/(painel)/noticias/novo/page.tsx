import { requireAdmin } from "@/lib/auth";
import { AdminHeader } from "@/components/admin/ui";
import { NewsForm } from "@/components/admin/NewsForm";
import { saveNewsAction } from "../../../_actions/news";

export const metadata = { title: "Nova notícia" };

export default async function Page() {
  const admin = await requireAdmin();
  return (
    <>
      <AdminHeader back={{ href: "/admin/noticias", label: "Notícias" }} title="Nova notícia" />
      <NewsForm action={saveNewsAction} defaultAuthor={admin.name} />
    </>
  );
}
