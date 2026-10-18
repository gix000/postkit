import Link from "next/link";
import { redirect } from "next/navigation";
import { t } from "@/lib/i18n";
import { createUserClient, getUser } from "@/lib/supabase/server";
import { settleOrder } from "@/lib/orders";
import { AutoRefresh } from "@/components/AutoRefresh";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Whish sends the buyer here after paying (or cancelling).
export default async function CheckoutReturn({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order: orderId = "" } = await searchParams;

  const user = await getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/checkout/return?order=${orderId}`)}`);
  }

  let status: "paid" | "pending" | "failed" | "missing" = "missing";
  if (UUID.test(orderId)) {
    // RLS: the visitor can only see their own order.
    const supabase = await createUserClient();
    const { data } = await supabase.from("orders").select("id, status").eq("id", orderId).maybeSingle();
    if (data) {
      status = data.status;
      if (status === "pending") {
        const settled = await settleOrder(orderId).catch(() => null);
        status = settled?.status ?? "pending";
      }
    }
  }

  const copy = t.checkout.result[status];
  return (
    <div className="page">
      <div className={`wrap result result--${status}`}>
        <div className="result__mark" aria-hidden="true">
          {status === "paid" && "✓"}
          {status === "failed" && "!"}
        </div>
        <h1 className="page__title">{copy.title}</h1>
        <p className="page__lede" role="status">
          {copy.body}
        </p>
        <div className="actions">
          <Link className="btn btn--primary" href="/account">
            {t.checkout.result.toAccount}
          </Link>
          {status === "failed" && (
            <Link className="btn btn--quiet" href="/#pricing">
              {t.checkout.result.tryAgain}
            </Link>
          )}
        </div>
        {status === "pending" && <AutoRefresh everyMs={4000} maxTimes={20} />}
      </div>
    </div>
  );
}
