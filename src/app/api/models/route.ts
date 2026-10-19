import { NextResponse, type NextRequest } from "next/server";
import { listModels } from "@/lib/hf";

const ALLOWED = new Set(["text-to-image", "text-to-video", "text-generation", "image-text-to-text"]);

/** Popular models for one task, for the model chooser's "More models" sheet. */
export async function GET(req: NextRequest) {
  const task = req.nextUrl.searchParams.get("task") ?? "";
  if (!ALLOWED.has(task)) return NextResponse.json({ models: [] }, { status: 400 });
  const search = (req.nextUrl.searchParams.get("search") ?? "").trim().slice(0, 60) || undefined;
  const { items } = await listModels({ task, search, sort: search ? "downloads" : "trendingScore", limit: 40 });
  const models = items
    .filter((m) => !m.gated)
    .map((m) => ({ id: m.id, downloads: m.downloads ?? 0, likes: m.likes ?? 0 }));
  return NextResponse.json({ models }, { headers: { "cache-control": "public, max-age=300" } });
}
