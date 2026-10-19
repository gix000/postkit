// Search inside a transcript and build YouTube chapters from it.

function norm(s) {
  return String(s)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[ً-ْـ]/g, "") // Arabic diacritics and tatweel
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim();
}

/** Every place a word or phrase is said, with a little context. */
function search(words, query, { context = 4 } = {}) {
  const q = norm(query).split(/\s+/).filter(Boolean);
  if (!q.length) return [];
  const w = words.map((x) => norm(x.word));
  const hits = [];
  for (let i = 0; i + q.length <= w.length; i++) {
    let ok = true;
    for (let j = 0; j < q.length; j++) if (!w[i + j].startsWith(q[j])) { ok = false; break; }
    if (!ok) continue;
    const from = Math.max(0, i - context);
    const to = Math.min(words.length, i + q.length + context);
    hits.push({
      time: words[i].start,
      text: words.slice(from, to).map((x) => x.word).join(" "),
    });
  }
  return hits;
}

function stamp(sec) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const p = (n) => String(n).padStart(2, "0");
  return h ? `${h}:${p(m)}:${p(r)}` : `${m}:${p(r)}`;
}

/**
 * Chapters at the longest pauses between sentences, at least `minLength` apart.
 * YouTube needs the first chapter at 0:00, at least 3 chapters, each ≥ 10 s.
 */
function chapters(segments, { minLength = 45, max = 12 } = {}) {
  const segs = segments.filter((s) => s.text).sort((a, b) => a.start - b.start);
  if (!segs.length) return [];
  const candidates = [];
  for (let i = 1; i < segs.length; i++) candidates.push({ i, pause: segs[i].start - segs[i - 1].end });
  candidates.sort((a, b) => b.pause - a.pause);

  const starts = [0];
  for (const c of candidates) {
    if (starts.length >= max) break;
    const t = segs[c.i].start;
    if (starts.every((s) => Math.abs(segs[s].start - t) >= minLength) && t >= minLength) starts.push(c.i);
  }
  starts.sort((a, b) => a - b);
  const title = (seg) => {
    const words = seg.text.replace(/[.!?؟،,]+$/, "").split(/\s+/);
    return words.slice(0, 7).join(" ") + (words.length > 7 ? "…" : "");
  };
  return starts.map((i, n) => ({ time: n === 0 ? 0 : segs[i].start, title: title(segs[i]) }));
}

function toYouTube(list) {
  return list.map((c) => `${stamp(c.time)} ${c.title}`).join("\n");
}

module.exports = { search, chapters, toYouTube, stamp, norm };
