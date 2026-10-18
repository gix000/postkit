import { notFound, redirect } from "next/navigation";
import { getDict, isLocale } from "@/lib/i18n";
import { getUser } from "@/lib/supabase/server";
import { isItemId } from "@/lib/plans";
import { startCheckout, CheckoutError } from "@/lib/orders";

// Where sign-in sends a buyer who picked a plan before they had an account:
// creates the order and goes straight on to Whish.
export default async function CheckoutStart({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ item?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { item } = await searchParams;
  if (!isItemId(item)) redirect(`/${locale}#pricing`);

  const user = await getUser();
  if (!user) {
    redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/checkout/start?item=${item}`)}`);
  }

  let url: string | null = null;
  let code = "payment_unavailable";
  try {
    url = await startCheckout(user.id, item, locale);
  } catch (err) {
    if (err instanceof CheckoutError) code = err.code;
  }
  if (url) redirect(url);

  const t = getDict(locale);
  return (
    <div className="page">
      <div className="wrap result result--failed">
        <h1 className="page__title">{t.checkout.result.failed.title}</h1>
        <p className="page__lede">{t.checkout.errors[code]}</p>
        <div className="actions">
          <a className="btn btn--primary" href={`/${locale}#pricing`}>
            {t.checkout.result.tryAgain}
          </a>
        </div>
      </div>
    </div>
  );
}
