import Link from "next/link";
import Logo from "./Logo";
import NavLinks from "./NavLinks";
import SearchBox from "./SearchBox";
import TabBar from "./TabBar";
import { LangSwitch } from "./I18n";
import { getViewer } from "@/lib/supabase/server";
import { supabaseEnabled } from "@/lib/supabase/config";
import { getBalance } from "@/lib/credits";
import { getT } from "@/lib/i18n/server";

export function Bolt({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M13.2 2.5 4.8 13.4c-.4.5 0 1.1.6 1.1h5.1l-1.1 7.2c-.1.7.8 1 1.2.5l8.4-10.9c.4-.5 0-1.1-.6-1.1h-5.1l1.1-7.2c.1-.7-.8-1-1.2-.5Z" />
    </svg>
  );
}

/** Floating liquid-glass bar on top; on phones, a glass tab bar at the bottom. */
export default async function Header() {
  const [{ t }, viewer] = await Promise.all([getT(), getViewer()]);
  const balance = viewer ? await getBalance() : null;
  const profileHref = viewer ? (viewer.profile ? `/u/${viewer.profile.username}` : "/settings") : "/login";
  const initial = (viewer?.profile?.display_name || viewer?.profile?.username || viewer?.email || "?").slice(0, 1);

  return (
    <>
      <header className="sticky top-0 z-40 px-3 sm:px-4 pt-3">
        <div className="glass glass-strong mx-auto max-w-[1240px] h-14 rounded-full ps-4 pe-2 flex items-center gap-3">
          <Link href="/" className="tap flex items-center gap-2 font-semibold tracking-tight text-[17px] shrink-0 rounded-full">
            <Logo size={24} />
            PostKit
          </Link>
          <div className="hidden xl:block w-[260px]">
            <SearchBox compact />
          </div>
          <div className="hidden md:block">
            <NavLinks />
          </div>
          <div className="ms-auto flex items-center gap-1.5 shrink-0">
            <Link
              href="/models"
              aria-label={t.nav.searchModels}
              className="tap xl:hidden grid place-items-center h-10 w-10 rounded-full text-muted hover:text-ink"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16 16 4 4" strokeLinecap="round" />
              </svg>
            </Link>
            <LangSwitch className="inline-flex items-center px-2.5 sm:px-3" />
            {supabaseEnabled && viewer ? (
              <>
                {balance !== null && (
                  <Link
                    href="/credits"
                    aria-label={`${t.nav.credits}: ${balance}`}
                    className="tap inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold bg-cobalt-soft text-cobalt border border-cobalt/30"
                  >
                    <Bolt />
                    <span className="tabular-nums">{balance}</span>
                  </Link>
                )}
                <Link
                  href={profileHref}
                  className="tap hidden sm:grid h-10 w-10 rounded-full bg-hot text-ink place-items-center text-sm font-bold uppercase shadow-[0_0_18px_rgba(255,0,85,0.45)]"
                  aria-label={t.nav.profile}
                >
                  {initial}
                </Link>
              </>
            ) : supabaseEnabled ? (
              <Link href="/login" className="tap btn-neon inline-flex h-10 items-center rounded-full px-5 text-sm font-semibold">
                {t.nav.signIn}
              </Link>
            ) : null}
          </div>
        </div>
      </header>
      <TabBar signedIn={Boolean(viewer)} />
    </>
  );
}
