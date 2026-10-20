import Link from "next/link";
import { redirect } from "next/navigation";
import AutoRefresh from "./AutoRefresh";
import { createClient, getViewer } from "@/lib/supabase/server";
import { settleOrder } from "@/lib/orders";
import { getT } from "@/lib/i18n/server";
import { first } from "@/lib/format";

type Status = "paid" | "pending" | "failed" | "missing";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Whish sends the buyer here after paying or cancelling. */
export default async function CreditsReturn({ searchParams }: PageProps<"/credits/return">) {
  const orderId = first((await searchParams).order) ?? "";
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(`/credits/return?order=${orderId}`)}`);
  const { t } = await getT();

  let status: Status = "missing";
  if (UUID.test(orderId)) {
    const sb = await createClient();
    const { data } = sb ? await sb.from("orders").select("id, status").eq("id", orderId).maybeSingle() : { data: null };
    if (data) {
      status = data.status as Status;
      if (status === "pending") {
        const settled = await settleOrder(orderId).catch(() => null);
        status = settled?.status ?? "pending";
      }
    }
  }

  const copy = t.credits.ret[status];
  return (
    <div className="mx-auto max-w-[560px] px-4 pt-16 text-center">
      <div
        className={`mx-auto grid place-items-center h-16 w-16 rounded-full text-2xl font-bold ${
          status === "paid" ? "btn-neon" : status === "failed" ? "bg-hot text-ink" : "glass"
        }`}
        aria-hidden="true"
      >
        {status === "paid" ? "✓" : status === "failed" ? "!" : "…"}
      </div>
      <h1 className="text-4xl font-bold tracking-tight mt-6">{copy.title}</h1>
      <p className="text-muted mt-3" role="status">
        {copy.body}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <Link href="/create" className="tap btn-neon inline-flex h-12 items-center rounded-full px-6 font-semibold">
          {t.credits.ret.toCreate}
        </Link>
        <Link href="/credits" className="tap inline-flex h-12 items-center rounded-full px-6 border border-rule font-medium">
          {t.credits.ret.toCredits}
        </Link>
      </div>
      {status === "pending" && <AutoRefresh everyMs={4000} maxTimes={20} />}
    </div>
  );
}
