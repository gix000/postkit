"use client";
import { useState } from "react";
import type { PackId } from "@/lib/catalog";
import { useT } from "@/components/I18n";

export default function BuyButton({ pack, usd, featured }: { pack: PackId; usd: number; featured?: boolean }) {
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const res = await fetch("/api/checkout", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ pack }),
            });
            const data = await res.json();
            if (!res.ok || !data.url) throw new Error(data.error || "Error");
            window.location.href = data.url;
          } catch (e) {
            setError((e as Error).message);
            setBusy(false);
          }
        }}
        className={`tap w-full h-12 rounded-full text-[15px] font-semibold disabled:opacity-60 ${featured ? "btn-neon" : "bg-ink text-paper"}`}
      >
        {busy ? t.credits.starting : t.credits.buy(usd)}
      </button>
      {error && <p className="text-sm text-danger mt-2">{error}</p>}
    </div>
  );
}
