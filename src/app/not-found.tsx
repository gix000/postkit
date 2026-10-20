import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-20">
      <h1 className="text-5xl font-semibold tracking-tight">{t.notFound.title}</h1>
      <p className="mt-3 text-muted max-w-[50ch]">{t.notFound.body}</p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/create" className="tap btn-neon inline-flex h-11 items-center rounded-full px-5 text-sm font-semibold">
          {t.notFound.create}
        </Link>
        <Link href="/models" className="tap inline-flex h-11 items-center rounded-full border border-rule bg-surface px-5 text-sm font-medium">
          {t.notFound.models}
        </Link>
      </div>
    </div>
  );
}
