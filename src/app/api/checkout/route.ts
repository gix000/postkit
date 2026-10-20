import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPack } from "@/lib/catalog";
import { CheckoutError, startCheckout } from "@/lib/orders";
import { whishConfig } from "@/lib/whish";

export async function POST(req: NextRequest) {
  const sb = await createClient();
  const user = sb ? (await sb.auth.getUser()).data.user : null;
  if (!user) return NextResponse.json({ error: "Sign in to buy credits." }, { status: 401 });
  if (!whishConfig().ready) return NextResponse.json({ error: "Payments open soon." }, { status: 503 });

  const body = await req.json().catch(() => null);
  if (!isPack(body?.pack)) return NextResponse.json({ error: "Pick a pack." }, { status: 400 });

  try {
    const url = await startCheckout(user.id, body.pack, req.nextUrl.origin);
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof CheckoutError ? e.message : "Payment couldn't start. Try again." },
      { status: 502 },
    );
  }
}
