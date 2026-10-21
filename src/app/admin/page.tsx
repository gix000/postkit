import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PACKS, type PackId } from "@/lib/catalog";
import GrantForm from "./GrantForm";
import { isOwner } from "./actions";
import { welcomeReport } from "@/lib/welcome";
import { ago } from "@/lib/format";

export const metadata: Metadata = { title: "Owner", robots: { index: false, follow: false } };

/** Owner-only: add credits after a customer pays on WhatsApp. Everyone else gets a 404. */
export default async function AdminPage() {
  if (!(await isOwner())) notFound();
  const report = await welcomeReport(7);
  const packs = (Object.keys(PACKS) as PackId[]).map((id) => ({ id, label: PACKS[id].label.en, credits: PACKS[id].credits, usd: PACKS[id].usd }));
  return (
    <div className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-10 pb-16">
      <h1 className="text-[40px] font-extrabold tracking-[-0.03em] leading-none">Add credits</h1>
      <p className="text-muted mt-3 mb-6 max-w-[56ch]">
        When someone pays you on WhatsApp, enter the email from their message and tap their pack. The credits show up on their account right away.
      </p>
      <GrantForm packs={packs} />

      {report && (
        <section className="mt-14">
          <h2 className="text-2xl font-bold tracking-tight">Free credits · last 7 days</h2>
          <ul className="grid grid-cols-3 gap-3 mt-4 max-w-[560px]">
            {[
              ["Given", report.granted],
              ["Refused · temp email", report.disposable],
              ["Refused · same device", report.device],
            ].map(([label, n]) => (
              <li key={label} className="glass rounded-[20px] p-4">
                <span className="block text-2xl font-bold tabular-nums">{n}</span>
                <span className="block text-xs text-muted mt-1">{label}</span>
              </li>
            ))}
          </ul>

          <h3 className="text-lg font-bold mt-8">Several new accounts from one network</h3>
          <p className="text-sm text-muted mt-1 max-w-[62ch]">
            3 or more sign-ups from the same internet address on the same day. Lebanese mobile networks share addresses between many people, so treat this as a hint, not proof.
          </p>
          {report.clusters.length === 0 ? (
            <p className="text-sm text-muted mt-4">Nothing suspicious.</p>
          ) : (
            <ul className="mt-4 space-y-3 max-w-[720px]">
              {report.clusters.map((c) => (
                <li key={`${c.ip}-${c.last_at}`} className="glass rounded-[20px] p-4">
                  <p className="text-sm font-semibold">
                    {c.accounts} accounts · <span className="font-mono text-muted">{c.ip}</span> · {ago(c.last_at)}
                  </p>
                  <p className="text-sm text-muted mt-1 break-all">{c.emails.join(", ")}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
