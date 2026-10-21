"use server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/supabase/server";

const OWNERS = (process.env.OWNER_EMAILS ?? "georgescharbel6@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export async function isOwner() {
  const me = await getSessionUser();
  return Boolean(me?.email && OWNERS.includes(me.email.toLowerCase()));
}

export type GrantState = { ok: boolean; message: string } | null;

/** Adds credits to a customer's account after they paid you (WhatsApp, Whish, cash). */
export async function grantCredits(_prev: GrantState, form: FormData): Promise<GrantState> {
  if (!(await isOwner())) return { ok: false, message: "Only the site owner can add credits." };
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const amount = Math.round(Number(form.get("amount")));
  const note = String(form.get("note") ?? "").trim().slice(0, 80);
  if (!email.includes("@")) return { ok: false, message: "Enter the customer's email." };
  if (!Number.isFinite(amount) || amount < 1 || amount > 100000) return { ok: false, message: "Enter how many credits (1 or more)." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, message: "The server key for credits is missing." };

  let userId: string | null = null;
  for (let page = 1; page <= 20 && !userId; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return { ok: false, message: `Couldn't look up accounts: ${error.message}` };
    userId = data.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
    if (data.users.length < 1000) break;
  }
  if (!userId) return { ok: false, message: `No account with ${email}. Ask them to sign in on PostKit first.` };

  const { data: balance, error } = await admin.rpc("grant_credits", {
    p_user: userId,
    p_amount: amount,
    p_reason: note ? `purchase: ${note}` : "purchase",
  });
  if (error) return { ok: false, message: `Couldn't add credits: ${error.message}` };
  return { ok: true, message: `Added ${amount} credits to ${email}. New balance: ${balance}.` };
}
