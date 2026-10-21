"use client";

/** Opens the phone's share sheet (Instagram, WhatsApp, TikTok…) with the file. Returns false if not supported. */
export async function shareBlob(blob: Blob, name: string, text?: string): Promise<boolean> {
  const file = new File([blob], name, { type: blob.type });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (!nav.share || !nav.canShare?.({ files: [file] })) return false;
  try {
    await nav.share({ files: [file], text });
    return true;
  } catch (e) {
    // Closing the share sheet is not an error.
    return (e as DOMException)?.name === "AbortError";
  }
}

/** Same as shareBlob, starting from a file URL (our storage or a blob: URL). */
export async function shareUrl(url: string, name: string, text?: string): Promise<boolean> {
  try {
    const blob = await (await fetch(url)).blob();
    return await shareBlob(blob, name, text);
  } catch {
    return false;
  }
}
