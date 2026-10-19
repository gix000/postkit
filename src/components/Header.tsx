import Link from "next/link";
import Logo from "./Logo";
import NavLinks from "./NavLinks";
import SearchBox from "./SearchBox";
import { getViewer } from "@/lib/supabase/server";
import { supabaseEnabled } from "@/lib/supabase/config";

export default async function Header() {
  const viewer = await getViewer();
  return (
    <header className="border-b border-rule bg-paper/90 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 h-14 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-[17px] shrink-0">
          <Logo />
          PostKit
        </Link>
        <div className="hidden md:block w-[300px]">
          <SearchBox compact />
        </div>
        <div className="hidden sm:block">
          <NavLinks />
        </div>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          {supabaseEnabled && viewer ? (
            <>
              <Link
                href="/new"
                className="hidden sm:inline-flex h-8 items-center rounded-md border border-rule bg-surface px-3 text-sm font-medium hover:border-cobalt"
              >
                New repo
              </Link>
              <Link
                href={viewer.profile ? `/u/${viewer.profile.username}` : "/settings"}
                className="h-8 w-8 rounded-full bg-hot text-ink grid place-items-center text-sm font-semibold uppercase"
                aria-label="Your profile"
              >
                {(viewer.profile?.display_name || viewer.profile?.username || viewer.email || "?").slice(0, 1)}
              </Link>
            </>
          ) : supabaseEnabled ? (
            <Link
              href="/login"
              className="btn-neon inline-flex h-8 items-center rounded-md px-3 text-sm font-semibold"
            >
              Sign in
            </Link>
          ) : null}
        </div>
      </div>
      <div className="sm:hidden border-t border-rule px-4 py-2 flex items-center justify-between gap-2">
        <NavLinks />
      </div>
    </header>
  );
}
