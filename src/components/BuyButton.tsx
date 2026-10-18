"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ItemId } from "@/lib/plans";
import type { Locale } from "@/lib/i18n";

export function BuyButton({
  item,
  locale,
  label,
  busyLabel,
  errors,
  variant = "primary",
}: {
  item: ItemId;
  locale: Locale;
  label: string;
  busyLabel: string;
  errors: Record<string, string>;
  variant?: "primary" | "quiet";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buy() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item, locale }),
      });
      if (res.status === 401) {
        const next = `/${locale}/checkout/start?item=${item}`;
        router.push(`/${locale}/login?next=${encodeURIComponent(next)}`);
        return;
      }
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.assign(data.url);
        return;
      }
      setError(errors[data.error ?? "payment_unavailable"] ?? errors.payment_unavailable);
    } catch {
      setError(errors.payment_unavailable);
    }
    setBusy(false);
  }

  return (
    <div className="buy">
      <button type="button" className={`btn btn--${variant} btn--block`} onClick={buy} disabled={busy} aria-busy={busy}>
        {busy ? busyLabel : label}
      </button>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
