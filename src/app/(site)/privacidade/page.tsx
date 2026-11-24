import type { Metadata } from "next";
import { InstitutionalPage } from "@/components/InstitutionalPage";
export const metadata: Metadata = { title: "Política de privacidade", alternates: { canonical: "/privacidade" } };
export const dynamic = "force-dynamic";
export default function Page() { return <InstitutionalPage slug="privacidade" />; }
