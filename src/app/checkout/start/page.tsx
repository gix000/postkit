import Link from "next/link";
import { redirect } from "next/navigation";
import { t } from "@/lib/i18n";
import { getUser } from "@/lib/supabase/server";
import { isItemId } from "@/lib/plans";
import { startCheckout, CheckoutError } from "@/lib/orders";

// Where sign-in sends a buyer who picked a plan before they had an account:
// creates the order and goes straight on to Whish.
export default async function CheckoutStart({ searchParams }: { searchParams: Promise<{ item?: string }> }) {
  const { item } = await searchParams;
  if (!isItemId(item)) redirect("/#pricing");

  const user = await getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/checkout/start?item=${item}`)}`);
  }

  let url: string | null = null;
  let code = "payment_unavailable";
  try {
    url = await startCheckout(user.id, item);
  } catch (err) {
    if (err instanceof CheckoutError) code = err.code;
  }
  if (url) redirect(url);

  return (
    <div className="page">
      <div className="wrap result result--failed">
        <h1 className="page__title">{t.checkout.result.failed.title}</h1>
        <p className="page__lede">{t.checkout.errors[code]}</p>
        <div className="actions">
          <Link className="btn btn--primary" href="/#pricing">
            {t.checkout.result.tryAgain}
          </Link>
        </div>
      </div>
    </div>
  );
}
