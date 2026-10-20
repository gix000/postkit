"use client";

async function loadBitmap(src: Blob): Promise<ImageBitmap> {
  return await createImageBitmap(src);
}

/** Shrinks a photo so uploads stay small and fast (long side ≤ maxSide), keeping transparency for PNGs. */
export async function prepareUpload(file: Blob, maxSide = 1600): Promise<string> {
  const bmp = await loadBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const keepAlpha = file.type === "image/png" || file.type === "image/webp";
  const out = canvas.toDataURL(keepAlpha ? "image/png" : "image/jpeg", 0.9);
  // PNGs can be heavy; fall back to JPEG if the upload would be too large.
  return out.length > 5_200_000 ? canvas.toDataURL("image/jpeg", 0.88) : out;
}

export async function urlToUpload(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Couldn't load that image.");
  return prepareUpload(await res.blob());
}

/** Applies a black-and-white mask to a photo and returns a transparent PNG. */
export async function applyMask(photoDataUrl: string, maskDataUrl: string): Promise<Blob> {
  const [photo, mask] = await Promise.all([
    fetch(photoDataUrl).then((r) => r.blob()).then(loadBitmap),
    fetch(maskDataUrl).then((r) => r.blob()).then(loadBitmap),
  ]);
  const w = photo.width;
  const h = photo.height;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(mask, 0, 0, w, h);
  const m = ctx.getImageData(0, 0, w, h);
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(photo, 0, 0, w, h);
  const p = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < p.data.length; i += 4) p.data[i + 3] = m.data[i];
  ctx.putImageData(p, 0, 0);
  photo.close();
  mask.close();
  return await new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("png"))), "image/png"));
}
