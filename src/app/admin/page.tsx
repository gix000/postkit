import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PACKS, type PackId } from "@/lib/catalog";
import GrantForm from "./GrantForm";
import { isOwner } from "./actions";

export const metadata: Metadata = { title: "Owner", robots: { index: false, follow: false } };

/** Owner-only: add credits after a customer pays on WhatsApp. Everyone else gets a 404. */
export default async function AdminPage() {
  if (!(await isOwner())) notFound();
  const packs = (Object.keys(PACKS) as PackId[]).map((id) => ({ id, label: PACKS[id].label.en, credits: PACKS[id].credits, usd: PACKS[id].usd }));
  return (
    <div className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-10 pb-16">
      <h1 className="text-[40px] font-extrabold tracking-[-0.03em] leading-none">Add credits</h1>
      <p className="text-muted mt-3 mb-6 max-w-[56ch]">
        When someone pays you on WhatsApp, enter the email from their message and tap their pack. The credits show up on their account right away.
      </p>
      <GrantForm packs={packs} />
    </div>
  );
}
