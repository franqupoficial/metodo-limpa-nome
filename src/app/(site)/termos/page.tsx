import type { Metadata } from "next";
import { InstitutionalPage } from "@/components/InstitutionalPage";
export const metadata: Metadata = { title: "Termos de uso", alternates: { canonical: "/termos" } };
export const dynamic = "force-dynamic";
export default function Page() { return <InstitutionalPage slug="termos" />; }
