"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/** Re-renders the current server page on a timer, a limited number of times. */
export function AutoRefresh({ everyMs, maxTimes }: { everyMs: number; maxTimes: number }) {
  const router = useRouter();
  const count = useRef(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      count.current += 1;
      if (count.current > maxTimes) {
        window.clearInterval(id);
        return;
      }
      router.refresh();
    }, everyMs);
    return () => window.clearInterval(id);
  }, [router, everyMs, maxTimes]);

  return null;
}
