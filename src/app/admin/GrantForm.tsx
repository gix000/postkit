"use client";
import { useActionState, useState } from "react";
import { grantCredits, type GrantState } from "./actions";

type Pack = { id: string; label: string; credits: number; usd: number };

export default function GrantForm({ packs }: { packs: Pack[] }) {
  const [state, action, pending] = useActionState<GrantState, FormData>(grantCredits, null);
  const [amount, setAmount] = useState(String(packs[0]?.credits ?? 100));
  const [note, setNote] = useState(packs[0] ? `${packs[0].label} $${packs[0].usd}` : "");
  const field = "w-full h-12 rounded-2xl bg-ink/5 border border-rule px-4 text-[16px] focus:outline-none focus:border-cobalt";
  return (
    <form action={action} className="glass rounded-[28px] p-5 sm:p-6 space-y-4 max-w-[560px]">
      <label className="block">
        <span className="block text-sm text-muted mb-1.5">Customer email (their PostKit account)</span>
        <input name="email" type="email" required autoComplete="off" placeholder="name@gmail.com" className={field} />
      </label>
      <div>
        <span className="block text-sm text-muted mb-1.5">Pack they paid for</span>
        <div className="flex flex-wrap gap-2">
          {packs.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setAmount(String(p.credits));
                setNote(`${p.label} $${p.usd}`);
              }}
              className={`tap h-10 px-4 rounded-full text-sm font-semibold border ${amount === String(p.credits) ? "bg-cobalt text-cobalt-ink border-transparent" : "border-rule"}`}
            >
              {p.label} · {p.credits} · ${p.usd}
            </button>
          ))}
        </div>
      </div>
      <label className="block">
        <span className="block text-sm text-muted mb-1.5">Credits to add</span>
        <input name="amount" type="number" min={1} inputMode="numeric" required value={amount} onChange={(e) => setAmount(e.target.value)} className={field} />
      </label>
      <input type="hidden" name="note" value={note} />
      <button disabled={pending} className="tap btn-neon w-full h-12 rounded-full text-[15px] font-semibold disabled:opacity-60">
        {pending ? "Adding…" : "Add credits"}
      </button>
      {state && <p className={`text-sm ${state.ok ? "text-cobalt" : "text-danger"}`} role="status">{state.message}</p>}
    </form>
  );
}
