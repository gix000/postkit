import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { whishConfig } from "@/lib/whish";

/** Yes/no checks for the site owner. Shows nothing secret. */
export async function GET() {
  const admin = createAdminClient();
  let credits: "ok" | "missing" | "error" = "missing";
  if (admin) {
    const { error } = await admin.from("orders").select("id", { count: "exact", head: true });
    credits = error ? "error" : "ok";
  }
  const w = whishConfig();
  return NextResponse.json(
    {
      ai: Boolean(process.env.HF_TOKEN),
      credits,
      payments: w.ready ? w.mode : "not set",
    },
    { headers: { "cache-control": "no-store" } },
  );
}
