import { NextResponse } from "next/server";
import { settleOrder } from "@/lib/orders";

// Whish calls this after the buyer pays or cancels.
// The call itself is never trusted: settleOrder asks Whish for the real status.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function handle(request: Request) {
  const orderId = new URL(request.url).searchParams.get("order") ?? "";
  if (!UUID.test(orderId)) return NextResponse.json({ received: false }, { status: 400 });
  try {
    const order = await settleOrder(orderId);
    return NextResponse.json({ received: true, status: order?.status ?? "missing" });
  } catch {
    return NextResponse.json({ received: true, status: "pending" }, { status: 202 });
  }
}

export const GET = handle;
export const POST = handle;
