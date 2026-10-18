import { NextResponse } from "next/server";
import { settleOrder } from "@/lib/orders";

// Whish calls this URL (success and failure) after the buyer acts.
// We never trust the call itself: settleOrder asks Whish for the real status.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function handle(request: Request) {
  const orderId = new URL(request.url).searchParams.get("order") ?? "";
  if (!UUID.test(orderId)) return NextResponse.json({ received: false }, { status: 400 });

  try {
    const order = await settleOrder(orderId);
    return NextResponse.json({ received: true, status: order?.status ?? "missing" });
  } catch {
    // Whish unreachable: the order stays pending and is retried from the return page.
    return NextResponse.json({ received: true, status: "pending" }, { status: 202 });
  }
}

export const GET = handle;
export const POST = handle;
