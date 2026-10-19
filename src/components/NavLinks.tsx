"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/create", label: "Create" },
  { href: "/models", label: "Models" },
  { href: "/datasets", label: "Datasets" },
];

export default function NavLinks() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="flex items-center gap-1 text-[15px]">
      {LINKS.map((l) => {
        const active = path === l.href || path.startsWith(l.href + "/");
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`px-2.5 py-1.5 rounded-md ${active ? "text-ink font-medium bg-surface border border-rule" : "text-muted hover:text-ink border border-transparent"}`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
