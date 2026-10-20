"use client";
import { useT } from "./I18n";

type Option<T extends string> = { id: T; label: React.ReactNode };

/**
 * A pill switch with a glass lens that slides to the chosen option.
 * Works right-to-left in Arabic.
 */
export default function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  tone = "light",
  size = "md",
  className = "",
  role = "radiogroup",
}: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  tone?: "light" | "neon";
  size?: "md" | "lg";
  className?: string;
  role?: "radiogroup" | "tablist";
}) {
  const { lang } = useT();
  const n = options.length;
  const i = Math.max(0, options.findIndex((o) => o.id === value));
  const dir = lang === "ar" ? -1 : 1;
  const h = size === "lg" ? "h-10" : "h-9";
  const itemRole = role === "tablist" ? "tab" : "radio";

  return (
    <div role={role} aria-label={label} className={`glass relative grid rounded-full p-1 ${className}`} style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
      <span
        aria-hidden="true"
        className={`lens ${tone === "neon" ? "lens-neon" : ""}`}
        style={{ insetInlineStart: 4, width: `calc((100% - 8px) / ${n})`, transform: `translateX(${dir * i * 100}%)` }}
      />
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role={itemRole}
            aria-checked={itemRole === "radio" ? on : undefined}
            aria-selected={itemRole === "tab" ? on : undefined}
            onClick={() => onChange(o.id)}
            className={`relative z-10 ${h} px-4 rounded-full text-sm font-semibold whitespace-nowrap transition-colors duration-300 ${
              on ? "text-[#0d0303]" : "text-muted hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
