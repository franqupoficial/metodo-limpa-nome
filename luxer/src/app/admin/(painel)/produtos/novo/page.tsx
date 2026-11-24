import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata = { title: "Novo produto" };

export default async function NewProduct() {
  const admin = await requireAdmin("products.edit");
  const [categories, collections] = await Promise.all([
    prisma.category.findMany({ orderBy: [{ position: "asc" }, { name: "asc" }], select: { id: true, name: true, parentId: true, parent: { select: { name: true } } } }),
    prisma.collection.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const sorted = categories.filter((c) => !c.parentId).flatMap((c) => [c, ...categories.filter((s) => s.parentId === c.id)]);
  return (
    <>
      <PageHeader title="Novo produto" back={{ href: "/admin/produtos", label: "Produtos" }} subtitle="Depois de salvar você poderá enviar fotografias, vídeos e variações." />
      <ProductForm categories={sorted} collections={collections} can={{ price: admin.can("products.price"), publish: admin.can("products.publish") }} />
    </>
  );
}
