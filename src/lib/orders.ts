import "server-only";
import { createAdminClient } from "./supabase/admin";
import { createPayment, getCollectStatus, siteUrl } from "./whish";
import { PACKS, type PackId } from "./catalog";

export type Order = {
  id: string;
  number: number;
  user_id: string;
  pack: string;
  credits: number;
  amount: number;
  status: "pending" | "paid" | "failed";
  created_at: string;
};

export class CheckoutError extends Error {}

/** Creates a pending order and returns the Whish page to send the buyer to. Prices come from the catalog only. */
export async function startCheckout(userId: string, pack: PackId, origin?: string): Promise<string> {
  const admin = createAdminClient();
  if (!admin) throw new CheckoutError("Payments aren't set up.");
  const p = PACKS[pack];
  const { data: order, error } = await admin
    .from("orders")
    .insert({ user_id: userId, pack, credits: p.credits, amount: p.usd, currency: "USD" })
    .select("*")
    .single<Order>();
  if (error || !order) throw new CheckoutError("Could not create the order.");

  const base = siteUrl(origin);
  try {
    return await createPayment({
      amount: Number(order.amount),
      invoice: `PostKit ${p.label.en} ${p.credits} credits #${order.number}`,
      externalId: order.number,
      callbackUrl: `${base}/api/whish/callback?order=${order.id}`,
      returnUrl: `${base}/credits/return?order=${order.id}`,
    });
  } catch {
    await admin.from("orders").update({ status: "failed" }).eq("id", order.id);
    throw new CheckoutError("Whish isn't reachable right now.");
  }
}

/** Checks a pending order with Whish and adds the credits once. Safe to call repeatedly. */
export async function settleOrder(orderId: string): Promise<Order | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data: order } = await admin.from("orders").select("*").eq("id", orderId).maybeSingle<Order>();
  if (!order || order.status !== "pending") return order ?? null;

  const { status, payerPhone } = await getCollectStatus(order.number);
  if (status === "success") {
    await admin.rpc("fulfil_credit_order", { p_order: order.id, p_payer_phone: payerPhone });
  } else if (status === "failed") {
    await admin.from("orders").update({ status: "failed" }).eq("id", order.id).eq("status", "pending");
  }
  const { data: fresh } = await admin.from("orders").select("*").eq("id", orderId).single<Order>();
  return fresh;
}
