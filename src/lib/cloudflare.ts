import "server-only";

/** True when the Cloudflare account and token are set on the server. */
export function cloudflareReady() {
  return Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN);
}

export class CloudflareError extends Error {}

type Input = {
  model: string; // "@cf/black-forest-labs/..."
  multipart: boolean;
  prompt: string;
  width?: number;
  height?: number;
  steps?: number;
  /** Reference photo for editing. Cloudflare's FLUX.2 needs it under 512×512. */
  image?: Blob | null;
};

/** Runs a Workers AI image model and returns the picture as a Blob. Throws on any failure. */
export async function runCloudflareImage(input: Input): Promise<Blob> {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!account || !token) throw new CloudflareError("not configured");

  const url = `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${input.model}`;
  let body: BodyInit;
  const headers: Record<string, string> = { authorization: `Bearer ${token}` };

  if (input.multipart) {
    const form = new FormData();
    form.append("prompt", input.prompt);
    if (input.width) form.append("width", String(input.width));
    if (input.height) form.append("height", String(input.height));
    if (input.steps) form.append("steps", String(input.steps));
    if (input.image) form.append("input_image_0", input.image, "input.jpg");
    body = form;
  } else {
    headers["content-type"] = "application/json";
    body = JSON.stringify({ prompt: input.prompt.slice(0, 2048), steps: input.steps ?? 6 });
  }

  const res = await fetch(url, { method: "POST", headers, body, signal: AbortSignal.timeout(90_000) });
  const type = res.headers.get("content-type") ?? "";
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new CloudflareError(`Cloudflare ${res.status}: ${text.slice(0, 200)}`);
  }
  if (type.startsWith("image/")) return await res.blob();

  const data = await res.json();
  const b64: unknown = data?.result?.image ?? data?.image;
  if (typeof b64 !== "string" || !b64) throw new CloudflareError("Cloudflare returned no image");
  const bytes = Buffer.from(b64, "base64");
  // JPEG starts with FF D8; anything else here is PNG.
  const mime = bytes[0] === 0xff && bytes[1] === 0xd8 ? "image/jpeg" : "image/png";
  return new Blob([bytes], { type: mime });
}
