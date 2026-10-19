import { NextResponse } from "next/server";
import { preflight, withCors } from "@/lib/cors";
import { fail, panelUser } from "@/lib/panelAuth";

// B-roll search through Pexels (free stock video and photos). The key stays on the server.
export const OPTIONS = preflight;

type PexelsVideo = { id: number; duration: number; width: number; height: number; image: string; url: string; user: { name: string }; video_files: { link: string; width: number; height: number; quality: string; file_type: string }[] };
type PexelsPhoto = { id: number; width: number; height: number; url: string; photographer: string; src: { large2x: string; medium: string } };

export async function POST(request: Request) {
  const user = await panelUser(request);
  if (user instanceof Response) return user;
  const key = process.env.PEXELS_API_KEY;
  if (!key) return fail("unavailable", "B-roll search isn't set up on the server yet.", 503);
  const body = (await request.json().catch(() => ({}))) as { q?: string; kind?: string; orientation?: string; page?: number };
  const q = String(body.q || "").trim().slice(0, 100);
  if (!q) return fail("bad_request", "Type what you're looking for.", 400);
  const orientation = ["portrait", "landscape", "square"].includes(String(body.orientation)) ? body.orientation : "portrait";
  const page = Math.max(1, Math.min(10, Number(body.page) || 1));
  const photos = body.kind === "photos";
  const url = photos
    ? `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&orientation=${orientation}&per_page=24&page=${page}`
    : `https://api.pexels.com/videos/search?query=${encodeURIComponent(q)}&orientation=${orientation}&per_page=24&page=${page}`;
  const res = await fetch(url, { headers: { Authorization: key }, signal: AbortSignal.timeout(15_000) }).catch(() => null);
  if (!res || !res.ok) return fail("upstream", "The stock library didn't respond. Try again.", 502);
  const data = (await res.json()) as { videos?: PexelsVideo[]; photos?: PexelsPhoto[] };
  const items = photos
    ? (data.photos || []).map((p) => ({ id: `p${p.id}`, kind: "photo", width: p.width, height: p.height, thumb: p.src.medium, file: p.src.large2x, by: p.photographer, page: p.url }))
    : (data.videos || []).map((v) => {
        // A file around 1080p is plenty for a cutaway and quick to download.
        const files = v.video_files.filter((f) => f.file_type === "video/mp4").sort((a, b) => Math.abs(Math.min(a.width, a.height) - 1080) - Math.abs(Math.min(b.width, b.height) - 1080));
        return { id: `v${v.id}`, kind: "video", width: v.width, height: v.height, duration: v.duration, thumb: v.image, file: files[0]?.link, by: v.user.name, page: v.url };
      }).filter((v) => v.file);
  return withCors(NextResponse.json({ items }));
}
