"use client";
import { drawCover, loadImage, siteFont } from "./save-client";

export type ReelOptions = { before?: string; after?: string; brand?: boolean; seconds?: number; onProgress?: (p: number) => void };

function pickType() {
  const types = ["video/mp4;codecs=avc1.42E01E", "video/mp4", "video/webm;codecs=vp9", "video/webm"];
  return types.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) ?? "";
}

export function reelSupported() {
  return typeof window !== "undefined" && typeof MediaRecorder !== "undefined" && "captureStream" in HTMLCanvasElement.prototype && pickType() !== "";
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Records a 9:16 swipe-reveal clip: the original photo, a lime line sweeping across, then the result.
 * Made entirely in the browser, so it's free and instant to share on Reels, TikTok and Stories.
 */
export async function makeBeforeAfterReel(beforeSrc: string, afterSrc: string, opts: ReelOptions = {}): Promise<Blob> {
  const [a, b] = await Promise.all([loadImage(beforeSrc), loadImage(afterSrc)]);
  const W = 720, H = 1280, FPS = 30;
  const total = (opts.seconds ?? 5.5) * 1000;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const font = siteFont("--font-bricolage");
  await document.fonts.load(`800 40px ${font}`).catch(() => {});

  const label = (text: string, x: number, align: CanvasTextAlign, alpha: number) => {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `800 44px ${font}`;
    const w = ctx.measureText(text).width + 44;
    const lx = align === "left" ? x : x - w;
    ctx.fillStyle = "rgba(13,3,3,0.72)";
    ctx.beginPath();
    ctx.roundRect(lx, 64, w, 72, 36);
    ctx.fill();
    ctx.fillStyle = text === (opts.after ?? "AFTER") ? "#bbef1f" : "#eff8ff";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText(text, lx + 22, 101);
    ctx.restore();
  };

  const frame = (ms: number) => {
    const t = ms / total;
    // 0–15% before, 15–55% sweep, 55–100% after (with a small zoom for life)
    const sweep = ease(Math.min(1, Math.max(0, (t - 0.15) / 0.4)));
    const zoom = 1 + 0.04 * Math.min(1, t);
    ctx.fillStyle = "#0d0303";
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-W / 2, -H / 2);
    drawCover(ctx, a, 0, 0, W, H);
    const edge = W * sweep;
    if (edge > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, edge, H);
      ctx.clip();
      drawCover(ctx, b, 0, 0, W, H);
      ctx.restore();
    }
    ctx.restore();
    if (sweep > 0 && sweep < 1) {
      ctx.save();
      ctx.shadowColor = "#bbef1f";
      ctx.shadowBlur = 28;
      ctx.fillStyle = "#bbef1f";
      ctx.fillRect(edge - 3, 0, 6, H);
      ctx.restore();
    }
    label(opts.before ?? "BEFORE", W - 40, "right", 1 - sweep * 1.4);
    label(opts.after ?? "AFTER", 40, "left", (sweep - 0.6) * 2.5);
    if (opts.brand !== false && t > 0.6) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, (t - 0.6) * 4);
      ctx.font = `700 30px ${font}`;
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(13,3,3,0.6)";
      const w = ctx.measureText("Made with PostKit").width + 40;
      ctx.beginPath();
      ctx.roundRect(W / 2 - w / 2, H - 120, w, 54, 27);
      ctx.fill();
      ctx.fillStyle = "#eff8ff";
      ctx.textBaseline = "middle";
      ctx.fillText("Made with PostKit", W / 2, H - 93);
      ctx.restore();
    }
  };

  const type = pickType();
  const stream = c.captureStream(FPS);
  const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 6_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<void>((r) => (rec.onstop = () => r()));
  frame(0);
  rec.start(250);
  const start = performance.now();
  await new Promise<void>((resolve) => {
    const tick = () => {
      const ms = performance.now() - start;
      frame(Math.min(ms, total));
      opts.onProgress?.(Math.min(1, ms / total));
      if (ms < total) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
  rec.stop();
  await done;
  return new Blob(chunks, { type: type.split(";")[0] });
}
