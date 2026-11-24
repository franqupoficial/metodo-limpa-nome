import { prisma } from "@/lib/db";

/** Conta o clique do banner e redireciona (somente para caminhos internos ou https). */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const to = u.searchParams.get("to") ?? "/";
  const safe = to.startsWith("/") && !to.startsWith("//") ? to : /^https:\/\//.test(to) ? to : "/";
  const id = u.searchParams.get("id");
  if (id) await prisma.banner.updateMany({ where: { id }, data: { clicks: { increment: 1 } } }).catch(() => {});
  return Response.redirect(new URL(safe, u.origin), 302);
}
