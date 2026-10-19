import { NextResponse, type NextRequest } from "next/server";
import { quickSearch } from "@/lib/hf";
import { listCommunity, repoPath } from "@/lib/community";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 100);
  if (!q) return NextResponse.json({ hits: [] });

  const [hub, cModels, cDatasets] = await Promise.all([
    quickSearch(q, 6),
    listCommunity({ kind: "model", search: q, limit: 3 }),
    listCommunity({ kind: "dataset", search: q, limit: 3 }),
  ]);

  const hits = [
    ...cModels.map((r) => ({ id: `${r.owner?.username}/${r.slug}`, kind: "model", href: repoPath(r), source: "community" })),
    ...hub
      .filter((h) => h.kind === "model")
      .map((h) => ({ id: h.id, kind: "model", href: `/models/${h.id}`, source: "hub" })),
    ...cDatasets.map((r) => ({ id: `${r.owner?.username}/${r.slug}`, kind: "dataset", href: repoPath(r), source: "community" })),
    ...hub
      .filter((h) => h.kind === "dataset")
      .map((h) => ({ id: h.id, kind: "dataset", href: `/datasets/${h.id}`, source: "hub" })),
  ];

  return NextResponse.json({ hits }, { headers: { "cache-control": "public, max-age=30" } });
}
