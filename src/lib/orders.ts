import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { createPayment, getCollectStatus, type WhishCurrency } from "@/lib/whish";
import { ITEMS, isItemId, type ItemId } from "@/lib/plans";
import { site } from "@/lib/env";
import type { Locale } from "@/lib/i18n";

export type OrderRow = {
  id: string;
  number: number;
  user_id: string;
  item: string;
  amount: number;
  currency: WhishCurrency;
  status: "pending" | "paid" | "failed";
  created_at: string;
  paid_at: string | null;
};

export class CheckoutError extends Error {
  constructor(
    public code: "needs_plan" | "unknown_item" | "payment_unavailable",
    message: string,
  ) {
    super(message);
  }
}

async function hasActivePlan(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("subscriptions")
    .select("expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  return !!data && new Date(data.expires_at) > new Date();
}

/** Creates a pending order and returns the Whish URL to send the buyer to. */
export async function startCheckout(userId: string, itemId: ItemId, locale: Locale) {
  if (!isItemId(itemId)) throw new CheckoutError("unknown_item", "Unknown item.");
  const item = ITEMS[itemId];
  if (item.addOn && !(await hasActivePlan(userId))) {
    throw new CheckoutError("needs_plan", "Credit packs need an active plan.");
  }

  const admin = createAdminClient();
  const { data: order, error } = await admin
    .from("orders")
    .insert({ user_id: userId, item: item.id, amount: item.priceUsd, currency: "USD" })
    .select("*")
    .single<OrderRow>();
  if (error || !order) throw new CheckoutError("payment_unavailable", "Could not create the order.");

  const back = `${site.url}/${locale}/checkout/return?order=${order.id}`;
  const callback = `${site.url}/api/whish/callback?order=${order.id}`;

  try {
    return await createPayment({
      amount: Number(order.amount),
      currency: order.currency,
      invoice: `PostKit ${item.id} #${order.number}`,
      externalId: order.number,
      successCallbackUrl: callback,
      failureCallbackUrl: callback,
      successRedirectUrl: back,
      failureRedirectUrl: back,
    });
  } catch {
    await admin.from("orders").update({ status: "failed" }).eq("id", order.id);
    throw new CheckoutError("payment_unavailable", "Whish is not reachable right now.");
  }
}

/**
 * Checks a pending order with Whish and applies the result.
 * Safe to call any number of times: fulfilment happens once, in the database.
 */
export async function settleOrder(orderId: string): Promise<OrderRow | null> {
  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("*").eq("id", orderId).maybeSingle<OrderRow>();
  if (!order || order.status !== "pending") return order ?? null;

  const { status, payerPhone } = await getCollectStatus(order.currency, order.number);

  if (status === "success" && isItemId(order.item)) {
    const item = ITEMS[order.item];
    await admin.rpc("fulfil_order", {
      p_order: order.id,
      p_payer_phone: payerPhone,
      p_plan: item.days > 0 ? item.id : "addon",
      p_days: item.days,
      p_credits: item.credits,
    });
  } else if (status === "failed") {
    await admin.from("orders").update({ status: "failed" }).eq("id", order.id).eq("status", "pending");
  }

  const { data: fresh } = await admin.from("orders").select("*").eq("id", orderId).single<OrderRow>();
  return fresh;
}
