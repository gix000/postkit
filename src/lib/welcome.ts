import "server-only";
import { cookies, headers } from "next/headers";
import { createAdminClient } from "./supabase/admin";
import { WELCOME_CREDITS } from "./catalog";

export const DEVICE_COOKIE = "pk_device";

let lists: Promise<{ exact: Set<string>; wildcard: string[] }> | null = null;
function loadLists() {
  // ~2 MB list, loaded only when a brand-new account claims its welcome credits.
  lists ??= import("./disposable-domains.json").then((m) => {
    const d = (m.default ?? m) as { exact: string[]; wildcard: string[] };
    return { exact: new Set(d.exact), wildcard: d.wildcard };
  });
  return lists;
}

/** True for throwaway inboxes (10minutemail, temp-mail, mailinator…), including their subdomains. */
export async function isDisposable(email: string): Promise<boolean> {
  const domain = email.split("@")[1]?.trim().toLowerCase();
  if (!domain) return false;
  const { exact, wildcard } = await loadLists();
  const parts = domain.split(".");
  for (let i = 0; i < parts.length - 1; i++) {
    const d = parts.slice(i).join(".");
    if (exact.has(d) || wildcard.includes(d)) return true;
  }
  return false;
}

/**
 * Gives a new account its welcome credits, once per person: refused for throwaway emails
 * and for a second account on the same device. Returns the credits given (0 if refused).
 */
export async function claimWelcome(userId: string, email: string | undefined): Promise<number> {
  const admin = createAdminClient();
  if (!admin) return 0;
  const [jar, h] = await Promise.all([cookies(), headers()]);
  const device = jar.get(DEVICE_COOKIE)?.value ?? null;
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "").trim() || null;
  const domain = email?.split("@")[1]?.toLowerCase() ?? null;
  const disposable = email ? await isDisposable(email) : false;
  const { data, error } = await admin.rpc("claim_welcome", {
    p_user: userId,
    p_device: device,
    p_ip: ip,
    p_domain: domain,
    p_disposable: disposable,
    p_amount: WELCOME_CREDITS,
  });
  if (error) return 0;
  return (data as number) ?? 0;
}

export type WelcomeStatus = "granted" | "disposable" | "device" | null;

/** Why this account did or didn't get the free credits (for a friendly note on the Credits page). */
export async function welcomeStatus(userId: string): Promise<WelcomeStatus> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from("welcome_claims").select("granted, reason").eq("user_id", userId).maybeSingle();
  if (!data) return null;
  return data.granted ? "granted" : (data.reason as WelcomeStatus);
}

export type WelcomeReport = {
  granted: number;
  disposable: number;
  device: number;
  clusters: { ip: string; accounts: number; last_at: string; emails: string[] }[];
};

export async function welcomeReport(days = 7): Promise<WelcomeReport | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.rpc("welcome_report", { p_days: days });
  if (error) return null;
  return data as WelcomeReport;
}
