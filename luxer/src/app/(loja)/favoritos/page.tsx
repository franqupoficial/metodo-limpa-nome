import { getCustomer } from "@/lib/customer-auth";
import { Container, PageHeading } from "@/components/site/Section";
import { FavoritesList } from "@/components/site/ClientLists";

export const metadata = { title: "Favoritos", robots: { index: false } };
export default async function Favorites() {
  const c = await getCustomer();
  return <Container className="pb-24 pt-10 sm:pt-16"><PageHeading eyebrow="Sua seleção" title="Favoritos" /><FavoritesList logged={Boolean(c)} /></Container>;
}
