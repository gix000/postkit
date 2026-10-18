import "server-only";
import { serverEnv, site } from "@/lib/env";

// Whish Pay collect API.
// Endpoints and headers follow the community Laravel client (ahmad-chebbo/laravel-whishpay).
// Confirm them against the merchant documentation Whish sends with your channel credentials.

const BASE = {
  sandbox: "https://lb.sandbox.whish.money/itel-service/api",
  production: "https://whish.money/itel-service/api",
} as const;

export type WhishCurrency = "USD" | "LBP";
export type CollectStatus = "success" | "failed" | "pending";

type WhishEnvelope<T> = {
  status: boolean;
  code?: string;
  dialog?: { title?: string; message?: string } | null;
  data?: T;
};

export class WhishError extends Error {}

async function call<T>(path: string, body: unknown): Promise<T> {
  const cfg = serverEnv.whish();
  if (!cfg.channel || !cfg.secret) throw new WhishError("Whish credentials are not set.");

  const res = await fetch(`${BASE[cfg.mode as keyof typeof BASE]}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      channel: cfg.channel,
      secret: cfg.secret,
      websiteUrl: cfg.websiteUrl,
    },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) throw new WhishError(`Whish responded ${res.status}.`);
  const json = (await res.json()) as WhishEnvelope<T>;
  if (!json.status || !json.data) {
    throw new WhishError(json.dialog?.message ?? "Whish rejected the request.");
  }
  return json.data;
}

export type CreatePaymentInput = {
  amount: number;
  currency: WhishCurrency;
  invoice: string;
  externalId: number;
  successCallbackUrl: string;
  failureCallbackUrl: string;
  successRedirectUrl: string;
  failureRedirectUrl: string;
};

/** Returns the Whish page where the buyer approves the payment. */
export async function createPayment(input: CreatePaymentInput): Promise<string> {
  if (serverEnv.whish().fake) {
    const q = new URLSearchParams({
      callback: input.successCallbackUrl,
      redirect: input.successRedirectUrl,
    });
    return `${site.url}/api/whish/fake?${q}`;
  }
  const data = await call<{ collectUrl: string }>("/payment/whish", input);
  return data.collectUrl;
}

/** Ask Whish what happened. Never trust a redirect or callback on its own. */
export async function getCollectStatus(
  currency: WhishCurrency,
  externalId: number,
): Promise<{ status: CollectStatus; payerPhone: string | null }> {
  if (serverEnv.whish().fake) return { status: "success", payerPhone: null };

  const data = await call<{ collectStatus: string; payerPhoneNumber?: string }>(
    "/payment/collect/status",
    { currency, externalId },
  );
  const raw = data.collectStatus.toLowerCase();
  const status: CollectStatus = raw === "success" ? "success" : raw === "failed" ? "failed" : "pending";
  return { status, payerPhone: data.payerPhoneNumber ?? null };
}
