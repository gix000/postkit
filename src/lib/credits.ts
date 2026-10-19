import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { ITEMS } from "@/lib/plans";

// AI credits live in an append-only ledger (credit_ledger). Spending inserts a negative
// row and checks the balance afterwards; if two requests raced past zero, the later
// one takes its row back out and is refused.

export class CreditError extends Error {
  constructor(public balance: number, public needed: number) {
    super(`This needs ${needed} credits and you have ${balance}.`);
  }
}

export async function balanceOf(userId: string) {
  const { data } = await createAdminClient().from("credit_balances").select("balance").eq("user_id", userId).maybeSingle();
  return (data?.balance as number | undefined) ?? 0;
}

/**
 * Accounts whose plan was set up by hand never got their plan's credits.
 * The first time such an account uses AI, it receives them once.
 */
export async function ensureStarterCredits(userId: string, plan: string) {
  const admin = createAdminClient();
  const { count } = await admin.from("credit_ledger").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if ((count ?? 0) > 0) return;
  const grant = plan === "yearly" ? ITEMS.yearly.credits : ITEMS.monthly.credits;
  await admin.from("credit_ledger").insert({ user_id: userId, delta: grant, reason: "plan_starter" });
}

export async function spend(userId: string, amount: number, reason: string) {
  const admin = createAdminClient();
  const before = await balanceOf(userId);
  if (before < amount) throw new CreditError(before, amount);
  const { data: row, error } = await admin.from("credit_ledger").insert({ user_id: userId, delta: -amount, reason }).select("id").single();
  if (error || !row) throw new Error("Could not record the credits.");
  const after = await balanceOf(userId);
  if (after < 0) {
    await admin.from("credit_ledger").delete().eq("id", row.id);
    throw new CreditError(after + amount, amount);
  }
  return { balance: after, entry: row.id as number };
}

/** Gives credits back when the AI call failed after they were taken. */
export async function refund(userId: string, amount: number, reason: string) {
  await createAdminClient().from("credit_ledger").insert({ user_id: userId, delta: amount, reason: `refund:${reason}` });
}

/** What each AI action costs. The panel shows the same numbers before you run it. */
export const COSTS = {
  plan: (seconds: number) => 12 + 4 * Math.ceil(Math.max(1, seconds) / 60),
  motion: 4,
  montage: 8,
  sfx: 6,
};
