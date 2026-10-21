"use client";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "./I18n";

function Pending() {
  const { pending } = useLinkStatus();
  return pending ? <span className="pending-bar" aria-hidden="true" /> : null;
}

/** Desktop navigation inside the floating glass bar. */
export default function NavLinks() {
  const path = usePathname();
  const { lang, t } = useT();
  const links = [
    { href: "/create", label: t.nav.create },
    { href: "/templates", label: lang === "ar" ? "القوالب" : "Templates" },
    { href: "/social", label: lang === "ar" ? "سوشيال" : "Social" },
    { href: "/#models", label: t.nav.models, wide: true },
    { href: "/explore", label: t.nav.explore, wide: true },
    { href: "/library", label: t.nav.library },
    { href: "/credits", label: t.nav.credits },
  ];
  return (
    <nav aria-label="Main" className="flex items-center gap-0.5 text-[15px]">
      {links.map((l) => {
        const active = path === l.href || path.startsWith(l.href + "/");
        return (
          <Link
            key={l.href}
            href={l.href}
            prefetch={l.href === "/library" || l.href === "/credits" ? undefined : true}
            aria-current={active ? "page" : undefined}
            className={`tap relative px-3.5 py-1.5 rounded-full ${l.wide ? "hidden lg:inline-block" : ""} ${active ? "bg-ink/10 text-ink font-semibold" : "text-muted hover:text-ink hover:bg-ink/5"}`}
          >
            {l.label}
            <Pending />
          </Link>
        );
      })}
    </nav>
  );
}
