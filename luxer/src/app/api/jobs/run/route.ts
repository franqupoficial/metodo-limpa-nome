import { runJobs } from "@/lib/jobs";
import { safeEqual } from "@/lib/crypto";

export const maxDuration = 300;

/** Disparado pelo agendador (Vercel Cron envia Authorization: Bearer CRON_SECRET). */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) return new Response("Unauthorized", { status: 401 });
  return Response.json(await runJobs());
}
