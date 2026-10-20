import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { whishConfig } from "@/lib/whish";
import { cloudflareReady } from "@/lib/cloudflare";

/** Yes/no checks for the site owner. Shows nothing secret. */
export async function GET() {
  const admin = createAdminClient();
  let credits: "ok" | "missing" | "error" = "missing";
  if (admin) {
    const { error } = await admin.from("orders").select("id", { count: "exact", head: true });
    credits = error ? "error" : "ok";
  }
  const w = whishConfig();
  // Free call (no image made): checks the Cloudflare token can reach Workers AI.
  let cloudflare: string = cloudflareReady() ? "set" : "not set";
  if (cloudflareReady()) {
    try {
      const r = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/models/search?per_page=1`,
        { headers: { authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` }, signal: AbortSignal.timeout(8000), cache: "no-store" },
      );
      const j = await r.json().catch(() => null);
      cloudflare = r.ok ? "ok" : `error ${r.status}${j?.errors?.[0]?.message ? `: ${j.errors[0].message}` : ""}`;
    } catch {
      cloudflare = "unreachable";
    }
  }
  return NextResponse.json(
    {
      ai: Boolean(process.env.HF_TOKEN),
      cloudflare,
      credits,
      payments: w.ready ? w.mode : "not set",
    },
    { headers: { "cache-control": "no-store" } },
  );
}
