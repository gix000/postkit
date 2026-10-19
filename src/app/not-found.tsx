import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-20">
      <h1 className="text-5xl font-semibold tracking-tight">Not found</h1>
      <p className="mt-3 text-muted max-w-[50ch]">
        This repo doesn&apos;t exist, is private, or was renamed. Check the spelling of the owner and name.
      </p>
      <div className="mt-6 flex gap-2">
        <Link href="/models" className="tap inline-flex h-10 items-center rounded-full bg-ink text-paper px-4 text-sm font-medium">
          Browse models
        </Link>
        <Link href="/datasets" className="tap inline-flex h-10 items-center rounded-full border border-rule bg-surface px-4 text-sm font-medium">
          Browse datasets
        </Link>
      </div>
    </div>
  );
}
