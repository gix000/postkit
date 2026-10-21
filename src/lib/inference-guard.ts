import "server-only";
import { createClient } from "./supabase/server";
import { supabaseEnabled } from "./supabase/config";
import { cloudflareReady } from "./cloudflare";
import { runpodReady } from "./runpod";

const hits = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = Number(process.env.PLAYGROUND_RATE_PER_MIN ?? 12);

/**
 * Inference spends your HF credits, so:
 * - when accounts are on, only signed-in users can run models;
 * - every caller gets a small per-minute budget (per instance, best effort).
 */
export async function guardInference(ip: string): Promise<{ ok: true; userId?: string } | { ok: false; status: number; error: string }> {
  if (!process.env.HF_TOKEN && !cloudflareReady() && !runpodReady()) {
    return { ok: false, status: 503, error: "Creating isn't switched on yet. The site owner needs to add an AI token." };
  }
  let key = `ip:${ip}`;
  let userId: string | undefined;
  if (supabaseEnabled) {
    const sb = await createClient();
    const user = sb ? (await sb.auth.getUser()).data.user : null;
    if (!user) return { ok: false, status: 401, error: "Sign in to create." };
    key = `u:${user.id}`;
    userId = user.id;
  }
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    return { ok: false, status: 429, error: "Too many runs this minute. Wait a moment and try again." };
  }
  recent.push(now);
  hits.set(key, recent);
  return { ok: true, userId };
}

export function clientIp(h: Headers): string {
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "local";
}

export function validModelId(s: unknown): s is string {
  return typeof s === "string" && /^[\w.-]+\/[\w.-]+(:[\w.-]+)?$/.test(s) && s.length < 200;
}
