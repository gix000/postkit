import "server-only";

/** True when the Runpod key is set on the server. */
export function runpodReady() {
  return Boolean(process.env.RUNPOD_API_KEY);
}

export class RunpodError extends Error {}

const BASE = "https://api.runpod.ai/v2";

function headers() {
  return { authorization: `Bearer ${process.env.RUNPOD_API_KEY}`, "content-type": "application/json" };
}

type Output = { result?: string; image_url?: string; video_url?: string; cost?: number; error?: string };

/**
 * Runs one job on a Runpod Public Endpoint (a hosted model, billed per result) and waits for it.
 * Uses /run + /status so slow videos don't hit the 60-second sync limit.
 */
export async function runRunpod(slug: string, input: Record<string, unknown>, timeoutMs = 270_000): Promise<{ url: string; cost?: number }> {
  if (!runpodReady()) throw new RunpodError("Runpod not configured");
  const start = await fetch(`${BASE}/${slug}/run`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ input }),
    signal: AbortSignal.timeout(30_000),
  });
  const job = await start.json().catch(() => null);
  if (!start.ok || !job?.id) {
    throw new RunpodError(`Runpod ${start.status}: ${JSON.stringify(job ?? {}).slice(0, 200)}`);
  }

  const deadline = Date.now() + timeoutMs;
  let wait = 1500;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, wait));
    wait = Math.min(wait + 500, 4000);
    const res = await fetch(`${BASE}/${slug}/status/${job.id}`, { headers: headers(), signal: AbortSignal.timeout(20_000), cache: "no-store" });
    const s = await res.json().catch(() => null);
    if (!s) continue;
    if (s.status === "COMPLETED") {
      const out: Output | undefined = Array.isArray(s.output) ? s.output[0] : s.output;
      const url = out?.result ?? out?.image_url ?? out?.video_url;
      if (!url) throw new RunpodError(`Runpod returned no file: ${JSON.stringify(s.output ?? {}).slice(0, 200)}`);
      return { url, cost: out?.cost };
    }
    if (s.status === "FAILED" || s.status === "CANCELLED" || s.status === "TIMED_OUT") {
      throw new RunpodError(`Runpod ${s.status}: ${String(s.error ?? s.output?.error ?? "").slice(0, 200)}`);
    }
  }
  // Took too long: stop it so it isn't billed for nothing.
  await fetch(`${BASE}/${slug}/cancel/${job.id}`, { method: "POST", headers: headers() }).catch(() => {});
  throw new RunpodError("Runpod took too long");
}

/** Downloads a Runpod result (links expire after 7 days, so we keep our own copy). */
export async function downloadResult(url: string, fallbackType: string): Promise<Blob> {
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new RunpodError(`Couldn't download the result (${res.status})`);
  const blob = await res.blob();
  const type = res.headers.get("content-type") ?? "";
  return type.startsWith("image/") || type.startsWith("video/") ? blob : new Blob([await blob.arrayBuffer()], { type: fallbackType });
}

/** Account balance in dollars, for the health check. */
export async function runpodBalance(): Promise<number | null> {
  if (!runpodReady()) return null;
  try {
    const res = await fetch("https://api.runpod.io/graphql", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ query: "query { myself { clientBalance } }" }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    const j = await res.json();
    const b = j?.data?.myself?.clientBalance;
    return typeof b === "number" ? Math.round(b * 100) / 100 : null;
  } catch {
    return null;
  }
}
