"use client";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

type Tab = { href: string; label: string; icon: React.ReactNode; primary?: boolean };

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const Home = (
  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
    <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z" />
  </svg>
);
const Spark = (
  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2.5c.7 4.6 3.4 7.6 9 9.5-5.6 1.9-8.3 4.9-9 9.5-.7-4.6-3.4-7.6-9-9.5 5.6-1.9 8.3-4.9 9-9.5Z" fill="currentColor" />
  </svg>
);
const Grid = (
  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
    <rect x="4" y="4" width="7" height="7" rx="2" />
    <rect x="13" y="4" width="7" height="7" rx="2" />
    <rect x="4" y="13" width="7" height="7" rx="2" />
    <rect x="13" y="13" width="7" height="7" rx="2" />
  </svg>
);
const Table = (
  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
    <ellipse cx="12" cy="6" rx="7" ry="2.5" />
    <path d="M5 6v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6M5 12v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6" />
  </svg>
);
const Person = (
  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
    <circle cx="12" cy="8.5" r="3.5" />
    <path d="M5 20c.9-3.4 3.6-5.5 7-5.5s6.1 2.1 7 5.5" />
  </svg>
);

function Dot() {
  const { pending } = useLinkStatus();
  return pending ? <span className="pending-bar" aria-hidden="true" /> : null;
}

/** App-style bottom bar on phones: thumbs reach it, and it floats over content as liquid glass. */
export default function TabBar({ profileHref }: { profileHref: string }) {
  const path = usePathname();
  const tabs: Tab[] = [
    { href: "/", label: "Home", icon: Home },
    { href: "/models", label: "Models", icon: Grid },
    { href: "/create", label: "Create", icon: Spark, primary: true },
    { href: "/datasets", label: "Data", icon: Table },
    { href: profileHref, label: profileHref === "/login" ? "Sign in" : "You", icon: Person },
  ];
  return (
    <nav
      aria-label="Main"
      style={{ bottom: "max(12px, env(safe-area-inset-bottom))" }}
      className="sm:hidden fixed inset-x-3 z-50 glass glass-strong rounded-[28px] px-2 py-1.5"
    >
      <ul className="grid grid-cols-5 items-end">
        {tabs.map((t) => {
          const active = t.href === "/" ? path === "/" : path === t.href || path.startsWith(t.href + "/");
          return (
            <li key={t.label} className="flex justify-center">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`tap relative flex flex-col items-center gap-0.5 rounded-2xl px-2 py-1 text-[11px] font-medium ${active ? "text-ink" : "text-muted"}`}
              >
                {t.primary ? (
                  <span className="btn-neon grid place-items-center h-11 w-11 -mt-5 rounded-full shadow-[0_0_24px_rgba(187,239,31,0.45)]">{t.icon}</span>
                ) : (
                  <span className={`grid place-items-center h-8 w-12 rounded-full ${active ? "bg-ink/10" : ""}`}>{t.icon}</span>
                )}
                {t.label}
                <Dot />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
