// Everything a buyer can pay for. Prices live here and nowhere else:
// the checkout route reads the amount from this file, never from the browser.

export type ItemId = "monthly" | "yearly" | "credits1000";

export type Item = {
  id: ItemId;
  priceUsd: number;
  /** Days added to the subscription; 0 for add-ons. */
  days: number;
  /** AI credits granted with the purchase. */
  credits: number;
  /** Requires an active plan to buy. */
  addOn: boolean;
};

export const ITEMS: Record<ItemId, Item> = {
  monthly: { id: "monthly", priceUsd: 9, days: 30, credits: 100, addOn: false },
  yearly: { id: "yearly", priceUsd: 59, days: 365, credits: 1500, addOn: false },
  credits1000: { id: "credits1000", priceUsd: 10, days: 0, credits: 1000, addOn: true },
};

export function isItemId(value: unknown): value is ItemId {
  return typeof value === "string" && value in ITEMS;
}

export const yearlySavingUsd = ITEMS.monthly.priceUsd * 12 - ITEMS.yearly.priceUsd;
