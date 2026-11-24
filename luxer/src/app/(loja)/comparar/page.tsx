import { Container } from "@/components/site/Section";
import { CompareTable } from "@/components/site/ClientLists";

export const metadata = { title: "Comparar joias", robots: { index: false } };
export default function Compare() {
  return <Container className="py-14"><h1 className="display mb-10 text-5xl">Comparar</h1><CompareTable /></Container>;
}
