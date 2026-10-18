import { notFound, redirect } from "next/navigation";
import { fill, formatDate, getDict, isLocale } from "@/lib/i18n";
import { createUserClient, getUser } from "@/lib/supabase/server";
import { ITEMS } from "@/lib/plans";
import { serverEnv, site } from "@/lib/env";
import { BuyButton } from "@/components/BuyButton";
import { SubmitButton } from "@/components/SubmitButton";
import { removeDevice, signOut } from "./actions";

export const dynamic = "force-dynamic";

type Device = { id: string; name: string | null; platform: string | null; last_seen_at: string };
type Order = { id: string; number: number; item: string; amount: number; status: string; created_at: string };

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await getUser();
  if (!user) redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/account`)}`);

  const t = getDict(locale);
  const a = t.account;
  const supabase = await createUserClient();

  const [{ data: sub }, { data: devices }, { data: orders }, { data: credits }] = await Promise.all([
    supabase.from("subscriptions").select("plan, expires_at, devices_allowed").eq("user_id", user.id).maybeSingle(),
    supabase.from("devices").select("id, name, platform, last_seen_at").order("last_seen_at", { ascending: false }),
    supabase.from("orders").select("id, number, item, amount, status, created_at").order("created_at", { ascending: false }).limit(20),
    supabase.from("credit_balances").select("balance").eq("user_id", user.id).maybeSingle(),
  ]);

  const active = !!sub && new Date(sub.expires_at) > new Date();
  const downloads = serverEnv.downloads();
  const allowed = (sub?.devices_allowed as number | undefined) ?? 1;
  const planName = sub ? (a.plan.names[sub.plan] ?? sub.plan) : "";

  return (
    <div className="page">
      <div className="wrap">
        <h1 className="page__title">{a.title}</h1>
        <p className="page__lede" dir="auto">
          {fill(a.signedInAs, { email: user.email ?? "" })}
        </p>

        <div className="account">
          <section className="card" aria-labelledby="plan-h">
            <h2 id="plan-h">{a.plan.title}</h2>
            <p>
              <span className={`status-dot${active ? " status-dot--on" : ""}`} aria-hidden="true" />
              {!sub && a.plan.none}
              {sub && active && fill(a.plan.active, { plan: planName, date: formatDate(sub.expires_at, locale) })}
              {sub && !active && fill(a.plan.expired, { date: formatDate(sub.expires_at, locale) })}
            </p>
            {sub && <p className="muted">{a.plan.renew}</p>}
            <div className="actions">
              <BuyButton
                item="monthly"
                locale={locale}
                label={`${t.pricing.monthly.name} $${ITEMS.monthly.priceUsd}`}
                busyLabel={t.checkout.redirecting}
                errors={t.checkout.errors}
                variant="quiet"
              />
              <BuyButton
                item="yearly"
                locale={locale}
                label={`${t.pricing.yearly.name} $${ITEMS.yearly.priceUsd}`}
                busyLabel={t.checkout.redirecting}
                errors={t.checkout.errors}
              />
            </div>
            {sub && <p className="muted">{a.plan.extendNote}</p>}
          </section>

          <section className="card" aria-labelledby="dl-h">
            <h2 id="dl-h">{a.download.title}</h2>
            {!active && <p className="muted">{a.download.locked}</p>}
            {active && !downloads.win && !downloads.mac && <p className="muted">{a.download.soon}</p>}
            {active && (downloads.win || downloads.mac) && (
              <>
                <p className="muted">{a.download.body}</p>
                <div className="actions">
                  {downloads.win && (
                    <a className="btn btn--primary" href={downloads.win}>
                      {a.download.win}
                    </a>
                  )}
                  {downloads.mac && (
                    <a className="btn btn--primary" href={downloads.mac}>
                      {a.download.mac}
                    </a>
                  )}
                </div>
              </>
            )}
          </section>

          <section className={`card${site.aiEditor ? "" : " card--wide"}`} aria-labelledby="dev-h">
            <h2 id="dev-h">{a.devices.title}</h2>
            <p className="muted">{fill(allowed === 1 ? a.devices.lede : a.devices.ledePlural, { n: allowed })}</p>
            {(devices as Device[] | null)?.length ? (
              <ul className="devices">
                {(devices as Device[]).map((d) => (
                  <li key={d.id}>
                    <div>
                      <strong dir="auto">{d.name ?? (d.platform ? a.devices.platforms[d.platform] : "—")}</strong>
                      <span>{fill(a.devices.lastSeen, { date: formatDate(d.last_seen_at, locale) })}</span>
                    </div>
                    <form action={removeDevice}>
                      <input type="hidden" name="id" value={d.id} />
                      <input type="hidden" name="locale" value={locale} />
                      <SubmitButton label={a.devices.remove} busyLabel={a.devices.removing} />
                    </form>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">{a.devices.empty}</p>
            )}
          </section>

          {site.aiEditor && (
            <section className="card" aria-labelledby="cr-h">
              <h2 id="cr-h">{a.credits.title}</h2>
              <p>{fill(a.credits.balance, { n: (credits?.balance as number | undefined) ?? 0 })}</p>
              {active && (
                <div className="actions">
                  <BuyButton
                    item="credits1000"
                    locale={locale}
                    label={t.pricing.credits.pay}
                    busyLabel={t.checkout.redirecting}
                    errors={t.checkout.errors}
                    variant="quiet"
                  />
                </div>
              )}
            </section>
          )}

          <section className="card card--wide" aria-labelledby="ord-h">
            <h2 id="ord-h">{a.orders.title}</h2>
            {(orders as Order[] | null)?.length ? (
              <div className="table-wrap">
                <table className="orders">
                  <thead>
                    <tr>
                      <th scope="col">{a.orders.cols.date}</th>
                      <th scope="col">{a.orders.cols.item}</th>
                      <th scope="col">{a.orders.cols.amount}</th>
                      <th scope="col">{a.orders.cols.status}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(orders as Order[]).map((o) => (
                      <tr key={o.id}>
                        <td>{formatDate(o.created_at, locale)}</td>
                        <td>{a.orders.items[o.item] ?? o.item}</td>
                        <td className="num" dir="ltr">
                          ${Number(o.amount).toFixed(2)}
                        </td>
                        <td>{a.orders.status[o.status] ?? o.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">{a.orders.empty}</p>
            )}
          </section>
        </div>

        <form action={signOut} className="signout">
          <input type="hidden" name="locale" value={locale} />
          <SubmitButton label={a.signOut} className="link-button" />
        </form>
      </div>
    </div>
  );
}
