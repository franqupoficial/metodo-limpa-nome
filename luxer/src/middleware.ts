import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ADMIN = ["/admin/login", "/admin/recuperar-senha", "/admin/redefinir-senha"];
const COOKIE = process.env.NODE_ENV === "production" ? "__Host-lx_admin" : "lx_admin";

/** Barreira inicial: sem cookie de sessão → login. A validação real (sessão + permissão) ocorre no servidor. */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_ADMIN.some((p) => pathname.startsWith(p))) return NextResponse.next();
  if (!req.cookies.get(COOKIE)?.value) {
    if (pathname.startsWith("/api/admin")) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
