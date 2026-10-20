import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { whishConfig } from "@/lib/whish";
import { cloudflareReady, runCloudflareImage } from "@/lib/cloudflare";

/** Yes/no checks for the site owner. Shows nothing secret. */
export async function GET(req: Request) {
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
  // Owner-only test: makes one tiny picture to prove generation works end to end.
  let probe: string | undefined;
  const key = new URL(req.url).searchParams.get("probe");
  if (key && process.env.HEALTH_KEY && key === process.env.HEALTH_KEY) {
    const started = Date.now();
    try {
      const blob = await runCloudflareImage({
        model: "@cf/black-forest-labs/flux-2-klein-4b",
        multipart: true,
        prompt: "a red apple on a table",
        width: 256,
        height: 256,
      });
      probe = `ok ${blob.size} bytes in ${Date.now() - started}ms`;
    } catch (e) {
      probe = `failed in ${Date.now() - started}ms: ${e instanceof Error ? e.message : String(e)}`.slice(0, 400);
    }
  }
  return NextResponse.json(
    {
      probe,
      ai: Boolean(process.env.HF_TOKEN),
      cloudflare,
      credits,
      payments: w.ready ? w.mode : "not set",
    },
    { headers: { "cache-control": "no-store" } },
  );
}
