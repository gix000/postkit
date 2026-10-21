import type { Metadata } from "next";
import Link from "next/link";
import WhatsAppBuy, { WHATSAPP, whatsappLink } from "./WhatsAppBuy";
import { Bolt } from "@/components/Header";
import { COST, PACKS, type PackId } from "@/lib/catalog";
import { getBalance, getHistory } from "@/lib/credits";
import { getViewer } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { ago } from "@/lib/format";
import { isOwner } from "@/app/admin/actions";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.credits.title };
}

export default async function CreditsPage() {
  const [{ lang, t }, viewer] = await Promise.all([getT(), getViewer()]);
  const [balance, history] = viewer ? await Promise.all([getBalance(), getHistory()]) : [null, []];
  const payments = Boolean(WHATSAPP);
  const owner = viewer ? await isOwner() : false;
  const packIds = Object.keys(PACKS) as PackId[];

  const costs: [string, number | null][] = [
    [t.credits.costs.photoFast, 1],
    [t.credits.costs.photo, COST.photo],
    [t.credits.costs.edit, COST.edit],
    [t.credits.costs.upscale, COST.upscale],
    [t.credits.costs.cutout, COST.cutout],
    [t.credits.costs.video, COST.video],
    [t.credits.costs.animate, COST.animate],
    [t.credits.costs.chat, null],
  ];

  return (
    <div>
      <section className="relative overflow-hidden border-b border-rule">
        <div className="neon-field opacity-70" aria-hidden="true" />
        <div className="relative z-10 mx-auto max-w-[1240px] px-4 sm:px-6 pt-10 pb-12">
          <h1 className="text-[44px] sm:text-[64px] font-extrabold tracking-[-0.03em] leading-none">{t.credits.title}</h1>
          <p className="text-muted mt-3 max-w-[50ch]">{t.credits.sub}</p>
          {owner && (
            <Link href="/admin" className="tap inline-flex mt-4 h-10 items-center rounded-full px-4 text-sm font-semibold bg-hot text-ink">
              Owner: add credits for a customer →
            </Link>
          )}
          {balance !== null && (
            <div className="glass inline-flex items-center gap-3 rounded-full ps-3 pe-6 py-2.5 mt-6">
              <span className="grid place-items-center h-10 w-10 rounded-full bg-cobalt text-cobalt-ink">
                <Bolt size={18} />
              </span>
              <span>
                <span className="block text-xs text-muted">{t.credits.balance}</span>
                <span className="block text-2xl font-bold tabular-nums leading-tight">{balance}</span>
              </span>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-10">
        <h2 className="text-2xl font-bold tracking-tight mb-4">{t.credits.packs}</h2>
        <p className="text-muted text-sm mb-4 max-w-[60ch]">{payments ? t.credits.waNote : t.credits.paymentsSoon}</p>
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {packIds.map((id) => {
            const p = PACKS[id];
            const featured = id === "creator";
            const cents = ((p.usd / p.credits) * 100).toFixed(1).replace(/\.0$/, "");
            return (
              <li
                key={id}
                className={`relative rounded-[28px] p-6 flex flex-col gap-4 ${featured ? "glass border-cobalt/60 shadow-[0_0_40px_-12px_rgba(187,239,31,0.45)]" : "glass"}`}
              >
                {featured && (
                  <span className="absolute -top-3 start-6 rounded-full bg-hot text-ink text-xs font-bold px-3 py-1">{t.credits.popular}</span>
                )}
                <div>
                  <p className="text-sm text-muted">{p.label[lang]}</p>
                  <p className="mt-1 flex items-baseline gap-2">
                    <span className="text-5xl font-extrabold tabular-nums">{p.credits}</span>
                    <span className="text-muted">{t.credits.creditsWord}</span>
                  </p>
                  <p className="text-sm text-muted mt-1">{p.note[lang]}</p>
                </div>
                <p className="text-sm">
                  <span className="text-2xl font-bold">${p.usd}</span> <span className="text-muted">· {t.credits.perCredit(cents)}</span>
                </p>
                <div className="mt-auto">
                  {!viewer ? (
                    <Link href="/login?next=/credits" className="tap inline-flex w-full h-12 items-center justify-center rounded-full bg-ink text-paper text-[15px] font-semibold">
                      {t.credits.signInToBuy}
                    </Link>
                  ) : payments ? (
                    <WhatsAppBuy
                      href={whatsappLink(t.credits.waMessage(p.label[lang], p.credits, p.usd, viewer.email ?? viewer.profile?.username ?? ""))}
                      label={t.credits.buy(p.usd)}
                      featured={featured}
                    />
                  ) : (
                    <button disabled className="w-full h-12 rounded-full bg-ink/20 text-muted text-[15px] font-semibold">
                      {t.credits.buy(p.usd)}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-12 grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div>
          <h2 className="text-2xl font-bold tracking-tight mb-4">{t.credits.costTitle}</h2>
          <ul className="glass rounded-2xl divide-y divide-rule">
            {costs.map(([label, n]) => (
              <li key={label} className="flex items-center justify-between gap-4 px-4 py-3 text-[15px]">
                <span>{label}</span>
                <span className="font-semibold tabular-nums">{n === null ? t.credits.costs.free : t.create.credit(n)}</span>
              </li>
            ))}
          </ul>
        </div>
        {viewer && (
          <div>
            <h2 className="text-2xl font-bold tracking-tight mb-4">{t.credits.history}</h2>
            {history.length === 0 ? (
              <p className="text-muted">{t.credits.noHistory}</p>
            ) : (
              <ul className="glass rounded-2xl divide-y divide-rule">
                {history.map((h) => {
                  const key = h.reason.startsWith("refund") ? "refund" : h.reason;
                  return (
                    <li key={h.id} className="flex items-center justify-between gap-4 px-4 py-3 text-[15px]">
                      <span>
                        {t.credits.reasons[key] ?? h.reason}
                        <span className="block text-xs text-muted">{ago(h.created_at, lang)}</span>
                      </span>
                      <span className={`font-semibold tabular-nums ltr ${h.delta > 0 ? "text-cobalt" : "text-muted"}`}>
                        {h.delta > 0 ? `+${h.delta}` : h.delta}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
