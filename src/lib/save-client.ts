"use client";
import { createClient as browserSupabase } from "@/lib/supabase/browser";

const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "video/mp4": "mp4", "video/webm": "webm" };

/** Saves a file made in the browser (cutout, text overlay, reel, menu) to the visitor's Library. */
export async function saveFromBrowser(
  file: Blob,
  meta: { kind: "photo" | "video"; tool: string; prompt?: string },
): Promise<{ id: string; url: string } | null> {
  const sb = browserSupabase();
  if (!sb) return null;
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const id = crypto.randomUUID();
  const type = (file.type || (meta.kind === "video" ? "video/mp4" : "image/png")).split(";")[0];
  const path = `${user.id}/${id}.${EXT[type] ?? (meta.kind === "video" ? "mp4" : "png")}`;
  const up = await sb.storage.from("creations").upload(path, file, { contentType: type, cacheControl: "31536000" });
  if (up.error) return null;
  const url = sb.storage.from("creations").getPublicUrl(path).data.publicUrl;
  const { error } = await sb.from("creations").insert({ id, user_id: user.id, kind: meta.kind, tool: meta.tool, path, url, prompt: meta.prompt ?? null });
  return error ? null : { id, url };
}

/** Starts a download of a Blob with a friendly file name. */
export function downloadBlob(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/** Loads an image for drawing on a canvas (works with our storage, data: and blob: URLs). */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (/^https?:/.test(src)) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't load the image"));
    img.src = src;
  });
}

/** Draws an image to fill a box (like CSS object-fit: cover). */
export function drawCover(ctx: CanvasRenderingContext2D, img: CanvasImageSource & { width: number; height: number }, x: number, y: number, w: number, h: number) {
  const s = Math.max(w / img.width, h / img.height);
  const sw = w / s;
  const sh = h / s;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}

/** Resolves the real font family names next/font generated, for drawing text on canvas. */
export function siteFont(varName: "--font-bricolage" | "--font-naskh") {
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return v || (varName === "--font-naskh" ? "serif" : "sans-serif");
}
