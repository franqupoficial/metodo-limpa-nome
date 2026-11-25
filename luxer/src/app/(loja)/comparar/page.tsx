import { Container, PageHeading } from "@/components/site/Section";
import { CompareTable } from "@/components/site/ClientLists";

export const metadata = { title: "Comparar joias", robots: { index: false } };
export default function Compare() {
  return <Container className="pb-24 pt-10 sm:pt-16"><PageHeading eyebrow="Lado a lado" title="Comparar joias" /><CompareTable /></Container>;
}
