import { RequestList } from "@/components/admin/RequestList";

export const metadata = { title: "Empréstimos" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <RequestList service="EMPRESTIMO" sp={await searchParams} />;
}
