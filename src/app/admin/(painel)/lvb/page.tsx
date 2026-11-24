import { RequestList } from "@/components/admin/RequestList";

export const metadata = { title: "LVB" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <RequestList service="LVB" sp={await searchParams} />;
}
