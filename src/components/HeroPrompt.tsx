"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

/** The home page's main action: type a prompt, pick photo or video, go to Create. */
export default function HeroPrompt() {
  const router = useRouter();
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
        Describe what to create
      </label>
      <textarea
        id="hero-prompt"
        rows={2}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }
        }}
        placeholder={kind === "photo" ? "A neon-lit street market in Beirut at night, rain on the asphalt" : "A drone shot over the Jeita grotto, slow and cinematic"}
        className="w-full resize-none bg-transparent px-4 pt-3 pb-2 text-lg sm:text-xl placeholder:text-muted focus:outline-none"
      />
      <div className="flex items-center justify-between gap-2 px-1.5 pb-1">
        <div className="flex gap-1 rounded-full bg-paper/60 p-1" role="radiogroup" aria-label="What to create">
          {(["photo", "video"] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => setKind(k)}
              className={`h-9 px-4 rounded-full text-sm font-semibold ${kind === k ? "bg-ink text-paper" : "text-muted hover:text-ink"}`}
            >
              {k === "photo" ? "Photo" : "Video"}
            </button>
          ))}
        </div>
        <button className="btn-neon h-11 px-6 rounded-full text-[15px] font-semibold">Create</button>
      </div>
    </form>
  );
}
