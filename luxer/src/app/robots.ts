import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/mail";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/checkout", "/carrinho", "/conta", "/pedido/", "/busca", "/favoritos", "/comparar"] }],
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}
