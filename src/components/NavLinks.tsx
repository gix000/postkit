"use client";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/create", label: "Create" },
  { href: "/models", label: "Models" },
  { href: "/datasets", label: "Datasets" },
];

function Pending() {
  const { pending } = useLinkStatus();
  return pending ? <span className="pending-bar" aria-hidden="true" /> : null;
}

/** Desktop navigation inside the floating glass bar. */
export default function NavLinks() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="flex items-center gap-0.5 text-[15px]">
      {LINKS.map((l) => {
        const active = path === l.href || path.startsWith(l.href + "/");
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`tap relative px-3.5 py-1.5 rounded-full ${active ? "bg-ink/10 text-ink font-semibold" : "text-muted hover:text-ink hover:bg-ink/5"}`}
          >
            {l.label}
            <Pending />
          </Link>
        );
      })}
    </nav>
  );
}
