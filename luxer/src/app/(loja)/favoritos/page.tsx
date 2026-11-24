import { getCustomer } from "@/lib/customer-auth";
import { Container } from "@/components/site/Section";
import { FavoritesList } from "@/components/site/ClientLists";

export const metadata = { title: "Favoritos", robots: { index: false } };
export default async function Favorites() {
  const c = await getCustomer();
  return <Container className="py-14"><h1 className="display mb-10 text-5xl">Favoritos</h1><FavoritesList logged={Boolean(c)} /></Container>;
}
