"use client";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "./I18n";

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
const Compass = (
  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m15.5 8.5-2 5-5 2 2-5z" />
  </svg>
);
const Stack = (
  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
    <rect x="4" y="4" width="16" height="12" rx="2.5" />
    <path d="M7 20h10" />
    <path d="m8 12 2.5-3 2 2.2L14 9.5l2 2.5" />
  </svg>
);
const BoltIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
    <path d="M13.2 3 5 13.5h6l-1 7.5 8-10.5h-6z" />
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
export default function TabBar({ signedIn }: { signedIn: boolean }) {
  const path = usePathname();
  const { lang, t } = useT();
  const tabs: Tab[] = [
    { href: "/", label: t.nav.home, icon: Home },
    { href: "/explore", label: t.nav.explore, icon: Compass },
    { href: "/create", label: t.nav.create, icon: Spark, primary: true },
    { href: "/library", label: t.nav.library, icon: Stack },
    signedIn ? { href: "/credits", label: t.nav.credits, icon: BoltIcon } : { href: "/login", label: t.nav.signIn, icon: Person },
  ];
  return (
    <nav
      aria-label="Main"
      style={{ bottom: "max(12px, env(safe-area-inset-bottom))" }}
      className="md:hidden fixed inset-x-3 z-50 glass-float glass-strong glass-edge rounded-[28px] px-2 py-1.5"
    >
      <ul className="relative grid grid-cols-5 items-end">
        {(() => {
          const i = tabs.findIndex((tab) => (tab.href === "/" ? path === "/" : path === tab.href || path.startsWith(tab.href + "/")));
          const show = i >= 0 && !tabs[i].primary;
          return (
            <span
              aria-hidden="true"
              className="lens lens-dim"
              style={{
                top: 2,
                bottom: 2,
                insetInlineStart: 0,
                width: "20%",
                opacity: show ? 1 : 0,
                transform: `translateX(${(lang === "ar" ? -1 : 1) * Math.max(i, 0) * 100}%) scale(${show ? 1 : 0.6})`,
              }}
            />
          );
        })()}
        {tabs.map((tab) => {
          const active = tab.href === "/" ? path === "/" : path === tab.href || path.startsWith(tab.href + "/");
          return (
            <li key={tab.href} className="flex justify-center">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`tap relative z-10 flex flex-col items-center gap-0.5 rounded-2xl px-1 py-1 text-[11px] font-medium whitespace-nowrap ${active ? "text-ink" : "text-muted"}`}
              >
                {tab.primary ? (
                  <span className="btn-neon grid place-items-center h-11 w-11 -mt-5 rounded-full shadow-[0_0_24px_rgba(187,239,31,0.45)]">{tab.icon}</span>
                ) : (
                  <span className={`grid place-items-center h-8 w-12 rounded-full transition-transform duration-300 ${active ? "scale-110" : ""}`}>{tab.icon}</span>
                )}
                {tab.label}
                <Dot />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
