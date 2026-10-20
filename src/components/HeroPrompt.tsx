"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "./I18n";

/** The home page's main action: type a prompt, pick photo or video, go to Create. */
export default function HeroPrompt() {
  const router = useRouter();
  const { t } = useT();
  const [kind, setKind] = useState<"photo" | "video">("photo");
  const [prompt, setPrompt] = useState("");

  return (
    <form
      className="glass rounded-3xl p-2 sm:p-2.5"
      onSubmit={(e) => {
        e.preventDefault();
        const p = new URLSearchParams({ mode: kind });
        if (prompt.trim()) p.set("prompt", prompt.trim());
        router.push(`/create?${p}`);
      }}
    >
      <label htmlFor="hero-prompt" className="sr-only">
        {t.home.promptLabel}
      </label>
      <textarea
        id="hero-prompt"
        rows={2}
        dir="auto"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }
        }}
        placeholder={kind === "photo" ? t.home.photoPlaceholder : t.home.videoPlaceholder}
        className="w-full resize-none bg-transparent px-4 pt-3 pb-2 text-lg sm:text-xl placeholder:text-muted focus:outline-none"
      />
      <div className="flex items-center justify-between gap-2 px-1.5 pb-1">
        <div className="flex gap-1 rounded-full bg-paper/60 p-1" role="radiogroup" aria-label={t.home.promptLabel}>
          {(["photo", "video"] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => setKind(k)}
              className={`h-9 px-4 rounded-full text-sm font-semibold ${kind === k ? "bg-ink text-paper" : "text-muted hover:text-ink"}`}
            >
              {k === "photo" ? t.home.photo : t.home.video}
            </button>
          ))}
        </div>
        <button className="tap btn-neon h-11 px-6 rounded-full text-[15px] font-semibold">{t.home.create}</button>
      </div>
    </form>
  );
}
