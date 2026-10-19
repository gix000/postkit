import Link from "next/link";
import Logo from "./Logo";
import NavLinks from "./NavLinks";
import SearchBox from "./SearchBox";
import TabBar from "./TabBar";
import { getViewer } from "@/lib/supabase/server";
import { supabaseEnabled } from "@/lib/supabase/config";

/** Floating liquid-glass bar on top; on phones, a glass tab bar at the bottom. */
export default async function Header() {
  const viewer = await getViewer();
  const profileHref = viewer ? (viewer.profile ? `/u/${viewer.profile.username}` : "/settings") : "/login";
  const initial = (viewer?.profile?.display_name || viewer?.profile?.username || viewer?.email || "?").slice(0, 1);

  return (
    <>
      <header className="sticky top-0 z-40 px-3 sm:px-4 pt-3">
        <div className="glass glass-strong mx-auto max-w-[1240px] h-14 rounded-full pl-4 pr-2 flex items-center gap-3">
          <Link href="/" className="tap flex items-center gap-2 font-semibold tracking-tight text-[17px] shrink-0 rounded-full">
            <Logo size={24} />
            PostKit
          </Link>
          <div className="hidden md:block w-[280px]">
            <SearchBox compact />
          </div>
          <div className="hidden sm:block">
            <NavLinks />
          </div>
          <div className="ml-auto flex items-center gap-1.5 shrink-0">
            <Link
              href="/models"
              aria-label="Search models"
              className="tap md:hidden grid place-items-center h-10 w-10 rounded-full text-muted hover:text-ink"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16 16 4 4" strokeLinecap="round" />
              </svg>
            </Link>
            {supabaseEnabled && viewer ? (
              <>
                <Link href="/new" className="tap hidden sm:inline-flex h-10 items-center rounded-full px-4 text-sm font-medium text-muted hover:text-ink hover:bg-ink/5">
                  Publish
                </Link>
                <Link
                  href={profileHref}
                  className="tap h-10 w-10 rounded-full bg-hot text-ink grid place-items-center text-sm font-bold uppercase shadow-[0_0_18px_rgba(255,0,85,0.45)]"
                  aria-label="Your profile"
                >
                  {initial}
                </Link>
              </>
            ) : supabaseEnabled ? (
              <Link href="/login" className="tap btn-neon inline-flex h-10 items-center rounded-full px-5 text-sm font-semibold">
                Sign in
              </Link>
            ) : null}
          </div>
        </div>
      </header>
      <TabBar profileHref={supabaseEnabled ? profileHref : "/datasets"} />
    </>
  );
}
