import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { startCheckout, CheckoutError } from "@/lib/orders";
import { isItemId } from "@/lib/plans";
import { isLocale } from "@/lib/i18n";

const Body = z.object({
  item: z.string().refine(isItemId),
  locale: z.string().refine(isLocale),
});

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "signIn" }, { status: 401 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "unknown_item" }, { status: 400 });

  try {
    const url = await startCheckout(
      user.id,
      parsed.data.item as Parameters<typeof startCheckout>[1],
      parsed.data.locale as Parameters<typeof startCheckout>[2],
    );
    return NextResponse.json({ url });
  } catch (err) {
    const code = err instanceof CheckoutError ? err.code : "payment_unavailable";
    return NextResponse.json({ error: code }, { status: code === "payment_unavailable" ? 502 : 400 });
  }
}
