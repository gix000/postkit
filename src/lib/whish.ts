import "server-only";

// Whish Pay collect API, carried over from the PostKit plugin store.
// Endpoints follow the community Laravel client (ahmad-chebbo/laravel-whishpay);
// confirm them against the merchant documentation Whish sends with your channel credentials.

const BASE = {
  sandbox: "https://lb.sandbox.whish.money/itel-service/api",
  production: "https://whish.money/itel-service/api",
} as const;

export type CollectStatus = "success" | "failed" | "pending";

export function siteUrl(fallbackOrigin?: string) {
  return (process.env.NEXT_PUBLIC_SITE_URL || fallbackOrigin || "http://localhost:3000").replace(/\/$/, "");
}

export function whishConfig() {
  const mode: keyof typeof BASE = process.env.WHISH_MODE === "production" ? "production" : "sandbox";
  const channel = process.env.WHISH_CHANNEL ?? "";
  const secret = process.env.WHISH_SECRET ?? "";
  // The fake payment page is for local testing only and never runs on the live site.
  const fake = process.env.WHISH_FAKE === "1" && mode !== "production" && process.env.VERCEL_ENV !== "production";
  return { mode, channel, secret, fake, ready: fake || Boolean(channel && secret) };
}

export class WhishError extends Error {}

type Envelope<T> = { status: boolean; dialog?: { message?: string } | null; data?: T };

async function call<T>(path: string, body: unknown): Promise<T> {
  const cfg = whishConfig();
  if (!cfg.channel || !cfg.secret) throw new WhishError("Whish credentials are not set.");
  const res = await fetch(`${BASE[cfg.mode]}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      channel: cfg.channel,
      secret: cfg.secret,
      websiteUrl: process.env.WHISH_WEBSITE_URL || siteUrl(),
    },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new WhishError(`Whish responded ${res.status}.`);
  const json = (await res.json()) as Envelope<T>;
  if (!json.status || !json.data) throw new WhishError(json.dialog?.message ?? "Whish rejected the request.");
  return json.data;
}

export async function createPayment(input: {
  amount: number;
  invoice: string;
  externalId: number;
  callbackUrl: string;
  returnUrl: string;
}): Promise<string> {
  if (whishConfig().fake) return input.returnUrl;
  const data = await call<{ collectUrl: string }>("/payment/whish", {
    amount: input.amount,
    currency: "USD",
    invoice: input.invoice,
    externalId: input.externalId,
    successCallbackUrl: input.callbackUrl,
    failureCallbackUrl: input.callbackUrl,
    successRedirectUrl: input.returnUrl,
    failureRedirectUrl: input.returnUrl,
  });
  return data.collectUrl;
}

/** Ask Whish what happened. Never trust a redirect or callback on its own. */
export async function getCollectStatus(externalId: number): Promise<{ status: CollectStatus; payerPhone: string | null }> {
  if (whishConfig().fake) return { status: "success", payerPhone: null };
  const data = await call<{ collectStatus: string; payerPhoneNumber?: string }>("/payment/collect/status", {
    currency: "USD",
    externalId,
  });
  const raw = data.collectStatus.toLowerCase();
  return {
    status: raw === "success" ? "success" : raw === "failed" ? "failed" : "pending",
    payerPhone: data.payerPhoneNumber ?? null,
  };
}
