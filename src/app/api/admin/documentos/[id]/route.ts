import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth";
import { decryptBuffer } from "@/lib/crypto";
import { audit } from "@/lib/audit";

/** Download de documento enviado pelo cliente: somente administradores autenticados, com auditoria. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return new Response("Não autenticado", { status: 401 });
  const { id } = await params;
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return new Response("Não encontrado", { status: 404 });
  const data = decryptBuffer(Buffer.from(doc.dataEnc));
  await audit(admin.id, "document.downloaded", "Document", doc.id, { requestId: doc.requestId });
  const name = doc.originalName.replace(/[^\w.\- ]/g, "_");
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": doc.mime,
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
