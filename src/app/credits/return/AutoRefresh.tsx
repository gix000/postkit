"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Re-checks the order every few seconds while Whish confirms the payment. */
export default function AutoRefresh({ everyMs, maxTimes }: { everyMs: number; maxTimes: number }) {
  const router = useRouter();
  useEffect(() => {
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      if (n > maxTimes) clearInterval(id);
      else router.refresh();
    }, everyMs);
    return () => clearInterval(id);
  }, [everyMs, maxTimes, router]);
  return null;
}
