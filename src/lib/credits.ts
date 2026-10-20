import "server-only";
import { createAdminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";

export class CreditsError extends Error {
  constructor(public code: "insufficient" | "unavailable") {
    super(code);
  }
}

/** Current balance, read with the visitor's own session (RLS: their rows only). */
export async function getBalance(): Promise<number | null> {
  const sb = await createClient();
  if (!sb) return null;
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb.from("credit_ledger").select("delta").eq("user_id", user.id);
  return (data ?? []).reduce((sum, r) => sum + (r.delta as number), 0);
}

export type LedgerRow = { id: number; delta: number; reason: string; created_at: string };

export async function getHistory(limit = 25): Promise<LedgerRow[]> {
  const sb = await createClient();
  if (!sb) return [];
  const { data } = await sb.from("credit_ledger").select("id, delta, reason, created_at").order("created_at", { ascending: false }).limit(limit);
  return (data as LedgerRow[]) ?? [];
}

/** Takes credits before a generation. Throws CreditsError("insufficient") when the balance is too low. */
export async function spend(userId: string, amount: number, reason: string): Promise<number> {
  const admin = createAdminClient();
  if (!admin) throw new CreditsError("unavailable");
  const { data, error } = await admin.rpc("spend_credits", { p_user: userId, p_amount: amount, p_reason: reason });
  if (error) throw new CreditsError(error.message.includes("insufficient_credits") ? "insufficient" : "unavailable");
  return data as number;
}

/** Gives credits back, e.g. when a generation fails. */
export async function refund(userId: string, amount: number, reason: string): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;
  await admin.rpc("grant_credits", { p_user: userId, p_amount: amount, p_reason: `refund:${reason}` });
}
