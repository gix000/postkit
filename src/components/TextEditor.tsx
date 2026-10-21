"use client";
import { useEffect, useRef, useState } from "react";
import { useT } from "./I18n";
import { haptic, useToast } from "./Toast";
import { downloadBlob, loadImage, saveFromBrowser, siteFont } from "@/lib/save-client";

type Font = "display" | "arabic" | "serif";
type Look = "plain" | "shadow" | "pill" | "bar";
type Layer = {
  id: string;
  kind: "text" | "logo";
  text: string;
  font: Font;
  size: number; // fraction of the image width
  color: string;
  look: Look;
  x: number; // centre, 0..1
  y: number;
  logo?: HTMLImageElement;
};

const COLORS = ["#ffffff", "#0d0303", "#bbef1f", "#ff0055", "#f5c542", "#eff8ff"];
const ARABIC = /[؀-ۿ]/;
const uid = () => Math.random().toString(36).slice(2, 9);

function light(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
}

function fontFamily(f: Font) {
  if (f === "arabic") return siteFont("--font-naskh");
  if (f === "serif") return "Georgia, 'Times New Roman', serif";
  return siteFont("--font-bricolage");
}

type Box = { id: string; x: number; y: number; w: number; h: number };

/** Draws the photo and every layer. Used for the live preview and the full-size export. */
function render(ctx: CanvasRenderingContext2D, W: number, H: number, img: HTMLImageElement, layers: Layer[], selected?: string): Box[] {
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(img, 0, 0, W, H);
  const boxes: Box[] = [];
  for (const l of layers) {
    const cx = l.x * W;
    const cy = l.y * H;
    if (l.kind === "logo" && l.logo) {
      const w = l.size * W * 2.2;
      const h = (w * l.logo.height) / l.logo.width;
      ctx.drawImage(l.logo, cx - w / 2, cy - h / 2, w, h);
      boxes.push({ id: l.id, x: cx - w / 2, y: cy - h / 2, w, h });
      continue;
    }
    const px = Math.max(8, l.size * W);
    ctx.font = `${l.font === "serif" ? 700 : 800} ${px}px ${fontFamily(l.font)}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.direction = ARABIC.test(l.text) ? "rtl" : "ltr";
    const lines = (l.text || " ").split("\n");
    const lh = px * 1.12;
    const tw = Math.max(...lines.map((s) => ctx.measureText(s).width));
    const th = lh * lines.length;
    const padX = px * 0.55;
    const padY = px * 0.32;
    const by = cy - th / 2 - padY;
    const bh = th + padY * 2;
    let bx = cx - tw / 2 - padX;
    let bw = tw + padX * 2;
    let textColor = l.color;
    if (l.look === "pill" || l.look === "bar") {
      if (l.look === "bar") {
        bx = 0;
        bw = W;
      }
      ctx.fillStyle = l.color;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, l.look === "pill" ? bh / 2 : 0);
      ctx.fill();
      textColor = light(l.color) ? "#0d0303" : "#ffffff";
    }
    ctx.save();
    if (l.look === "shadow") {
      ctx.shadowColor = "rgba(0,0,0,0.65)";
      ctx.shadowBlur = px * 0.35;
      ctx.shadowOffsetY = px * 0.06;
    }
    ctx.fillStyle = textColor;
    lines.forEach((s, i) => ctx.fillText(s, cx, cy - th / 2 + lh * (i + 0.5)));
    ctx.restore();
    boxes.push({ id: l.id, x: bx, y: by, w: bw, h: bh });
  }
  if (selected) {
    const b = boxes.find((x) => x.id === selected);
    if (b) {
      ctx.save();
      ctx.setLineDash([W * 0.012, W * 0.008]);
      ctx.lineWidth = Math.max(2, W * 0.003);
      ctx.strokeStyle = "#bbef1f";
      ctx.strokeRect(b.x - 4, b.y - 4, b.w + 8, b.h + 8);
      ctx.restore();
    }
  }
  return boxes;
}

/** Full-screen editor for adding headlines, prices, badges and a logo on a photo. */
export default function TextEditor({ src, onClose, onSaved }: { src: string; onClose: () => void; onSaved?: (r: { id?: string; url: string }) => void }) {
  const { lang } = useT();
  const ar = lang === "ar";
  const toast = useToast();
  const dialog = useRef<HTMLDialogElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const boxes = useRef<Box[]>([]);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [layers, setLayers] = useState<Layer[]>(() => [
    { id: uid(), kind: "text", text: ar ? "عرض خاص" : "NEW IN", font: ar ? "arabic" : "display", size: 0.1, color: "#ffffff", look: "shadow", x: 0.5, y: 0.14 },
  ]);
  const [sel, setSel] = useState<string | undefined>(layers[0]?.id);
  const [busy, setBusy] = useState(false);
  const [, setFontsReady] = useState(0);
  const current = layers.find((l) => l.id === sel);

  useEffect(() => {
    dialog.current?.showModal();
    loadImage(src).then(setImg).catch(() => setFailed(true));
    Promise.all([
      document.fonts.load(`800 40px ${siteFont("--font-bricolage")}`),
      document.fonts.load(`700 40px ${siteFont("--font-naskh")}`, "عربي"),
    ]).finally(() => setFontsReady((n) => n + 1));
  }, [src]);

  // Live preview, sized to the screen.
  useEffect(() => {
    const c = canvas.current;
    if (!c || !img) return;
    const maxW = Math.min(c.parentElement?.clientWidth ?? 600, 720);
    const maxH = Math.min(window.innerHeight * 0.52, 720);
    const s = Math.min(maxW / img.width, maxH / img.height);
    const w = Math.round(img.width * s);
    const h = Math.round(img.height * s);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = w * dpr;
    c.height = h * dpr;
    c.style.width = `${w}px`;
    c.style.height = `${h}px`;
    const ctx = c.getContext("2d")!;
    boxes.current = render(ctx, c.width, c.height, img, layers, sel).map((b) => ({ ...b, x: b.x / dpr, y: b.y / dpr, w: b.w / dpr, h: b.h / dpr }));
  });

  function update(patch: Partial<Layer>) {
    setLayers((ls) => ls.map((l) => (l.id === sel ? { ...l, ...patch } : l)));
  }
  function add(kind: "headline" | "price" | "badge" | "arabic") {
    const base = { id: uid(), kind: "text" as const, x: 0.5 };
    const l: Layer =
      kind === "headline"
        ? { ...base, text: ar ? "عنوانك هنا" : "YOUR HEADLINE", font: ar ? "arabic" : "display", size: 0.085, color: "#ffffff", look: "shadow", y: 0.5 }
        : kind === "price"
          ? { ...base, text: "$12", font: "display", size: 0.075, color: "#bbef1f", look: "pill", y: 0.82, x: 0.78 }
          : kind === "badge"
            ? { ...base, text: ar ? "خصم ٢٠٪" : "20% OFF", font: ar ? "arabic" : "display", size: 0.06, color: "#ff0055", look: "pill", y: 0.1, x: 0.24 }
            : { ...base, text: "أهلا وسهلا", font: "arabic", size: 0.08, color: "#ffffff", look: "shadow", y: 0.86 };
    setLayers((ls) => [...ls, l]);
    setSel(l.id);
    haptic(6);
  }
  async function addLogo(file?: File | null) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const logo = await loadImage(url);
    const l: Layer = { id: uid(), kind: "logo", text: "", font: "display", size: 0.08, color: "#fff", look: "plain", x: 0.84, y: 0.1, logo };
    setLayers((ls) => [...ls, l]);
    setSel(l.id);
  }

  function pointer(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height };
  }

  async function exportBlob(): Promise<Blob> {
    if (!img) throw new Error("no image");
    const s = Math.min(1, 2048 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * s);
    c.height = Math.round(img.height * s);
    render(c.getContext("2d")!, c.width, c.height, img, layers);
    return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("export"))), "image/png"));
  }

  async function save(download: boolean) {
    setBusy(true);
    try {
      const blob = await exportBlob();
      if (download) downloadBlob(blob, "postkit-post.png");
      const saved = await saveFromBrowser(blob, { kind: "photo", tool: "text", prompt: layers.filter((l) => l.kind === "text").map((l) => l.text).join(" · ").slice(0, 200) });
      onSaved?.(saved ?? { url: URL.createObjectURL(blob) });
      toast(ar ? "حُفظت في مكتبتك" : "Saved to your Library");
      haptic(18);
      dialog.current?.close();
    } catch {
      toast(ar ? "تعذّر الحفظ. حاول مجددًا." : "Couldn't save. Try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  const chip = "tap shrink-0 h-9 px-3.5 rounded-full text-[13px] font-semibold border border-rule hover:border-ink/40";
  return (
    <dialog ref={dialog} onClose={onClose} className="viewer text-ink" aria-label={ar ? "أضف نصًا" : "Add text"}>
      <div className="h-full w-full flex flex-col bg-paper">
        <div className="flex items-center justify-between gap-2 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-2">
          <button type="button" onClick={() => dialog.current?.close()} className="tap h-10 px-4 rounded-full border border-rule text-sm font-medium">
            {ar ? "إلغاء" : "Cancel"}
          </button>
          <p className="font-bold">{ar ? "نص وشعار" : "Text & logo"}</p>
          <button type="button" disabled={busy || !img} onClick={() => save(true)} className="tap btn-neon h-10 px-5 rounded-full text-sm font-semibold disabled:opacity-50">
            {busy ? (ar ? "نحفظ…" : "Saving…") : ar ? "حفظ وتنزيل" : "Save & download"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="grid place-items-center px-4 py-2 min-h-[40vh]">
            {failed ? (
              <p className="text-muted text-sm">{ar ? "تعذّر فتح الصورة." : "Couldn't open this photo."}</p>
            ) : !img ? (
              <div className="skel h-64 w-48 rounded-2xl" />
            ) : (
              <canvas
                ref={canvas}
                className="rounded-2xl shadow-2xl touch-none cursor-grab"
                onPointerDown={(e) => {
                  const p = pointer(e);
                  const hit = [...boxes.current].reverse().find((b) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h);
                  if (!hit) return;
                  setSel(hit.id);
                  const l = layers.find((x) => x.id === hit.id)!;
                  drag.current = { id: hit.id, dx: p.x / p.w - l.x, dy: p.y / p.h - l.y };
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => {
                  if (!drag.current) return;
                  const p = pointer(e);
                  const { id, dx, dy } = drag.current;
                  const x = Math.min(0.98, Math.max(0.02, p.x / p.w - dx));
                  const y = Math.min(0.98, Math.max(0.02, p.y / p.h - dy));
                  setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, x, y } : l)));
                }}
                onPointerUp={() => (drag.current = null)}
                onPointerCancel={() => (drag.current = null)}
              />
            )}
            <p className="text-xs text-muted mt-2">{ar ? "اسحب أي نص لتحريكه." : "Drag anything to move it."}</p>
          </div>

          <div className="px-4 pb-[max(16px,env(safe-area-inset-bottom))] space-y-4 max-w-[720px] mx-auto">
            <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
              <button type="button" className={chip} onClick={() => add("headline")}>+ {ar ? "عنوان" : "Headline"}</button>
              <button type="button" className={chip} onClick={() => add("price")}>+ {ar ? "سعر" : "Price"}</button>
              <button type="button" className={chip} onClick={() => add("badge")}>+ {ar ? "شارة عرض" : "Offer badge"}</button>
              <button type="button" className={chip} onClick={() => add("arabic")}>+ عربي</button>
              <button type="button" className={chip} onClick={() => logoInput.current?.click()}>+ {ar ? "شعار" : "Logo"}</button>
              <input ref={logoInput} type="file" accept="image/png,image/webp,image/jpeg,image/svg+xml" className="sr-only" onChange={(e) => addLogo(e.target.files?.[0])} />
            </div>

            {current && (
              <div className="glass rounded-[22px] p-4 space-y-4">
                {current.kind === "text" && (
                  <textarea
                    value={current.text}
                    onChange={(e) => update({ text: e.target.value })}
                    rows={2}
                    dir="auto"
                    className="w-full rounded-2xl border border-rule bg-surface px-3 py-2.5 text-[16px] focus:outline-none focus:border-cobalt"
                  />
                )}
                {current.kind === "text" && (
                  <div className="flex gap-2 overflow-x-auto">
                    {(["display", "arabic", "serif"] as Font[]).map((f) => (
                      <button key={f} type="button" onClick={() => update({ font: f })} className={`${chip} ${current.font === f ? "bg-cobalt text-cobalt-ink border-transparent" : ""}`}>
                        {f === "display" ? "Bold" : f === "arabic" ? "عربي" : "Elegant"}
                      </button>
                    ))}
                    {(["plain", "shadow", "pill", "bar"] as Look[]).map((k) => (
                      <button key={k} type="button" onClick={() => update({ look: k })} className={`${chip} ${current.look === k ? "bg-ink text-paper border-transparent" : ""}`}>
                        {ar ? { plain: "عادي", shadow: "ظل", pill: "كبسولة", bar: "شريط" }[k] : { plain: "Plain", shadow: "Shadow", pill: "Pill", bar: "Bar" }[k]}
                      </button>
                    ))}
                  </div>
                )}
                <label className="flex items-center gap-3 text-sm">
                  <span className="w-12 text-muted">{ar ? "الحجم" : "Size"}</span>
                  <input type="range" min={0.03} max={0.2} step={0.005} value={current.size} onChange={(e) => update({ size: Number(e.target.value) })} className="flex-1 accent-[#bbef1f]" />
                </label>
                {current.kind === "text" && (
                  <div className="flex items-center gap-2">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={c}
                        onClick={() => update({ color: c })}
                        className={`tap h-9 w-9 rounded-full border-2 ${current.color === c ? "border-cobalt scale-110" : "border-white/20"}`}
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setLayers((ls) => ls.filter((l) => l.id !== sel));
                    setSel(undefined);
                  }}
                  className="text-sm text-muted hover:text-danger"
                >
                  {ar ? "احذف هذه الطبقة" : "Delete this layer"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </dialog>
  );
}
