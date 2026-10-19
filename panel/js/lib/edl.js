// Keeps transcript timings right while the AI editor changes the timeline:
// after ranges are ripple-deleted and a hook is inserted at the start.

function merge(ranges) {
  const sorted = ranges.filter((r) => r.end > r.start).map((r) => ({ start: r.start, end: r.end })).sort((a, b) => a.start - b.start);
  const out = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (last && r.start <= last.end + 1e-6) last.end = Math.max(last.end, r.end);
    else out.push(r);
  }
  return out;
}

/**
 * A map from original sequence time to edited time.
 * removed: ranges ripple-deleted (original time). hook: {start, end} copied to 0:00 after the cuts
 * (in edited time, before the insert), or null.
 */
function makeMap(removed, hook) {
  const cuts = merge(removed);
  const hookDur = hook ? hook.end - hook.start : 0;
  /** Edited time for an original time, or null when it was cut out. */
  function map(t) {
    let shift = 0;
    for (const r of cuts) {
      if (t >= r.end) shift += r.end - r.start;
      else if (t >= r.start) return null;
      else break;
    }
    return t - shift + hookDur;
  }
  return { map, cuts, hookDur };
}

/** Moves words to edited time: drops words that were cut, adds the hook's words at the start. */
function mapWords(words, removed, hook) {
  const m = makeMap(removed, hook);
  const out = [];
  if (hook) {
    // Hook words come from the cut timeline (edited time without the hook shift).
    for (const w of words) {
      const s = m.map(w.start), e = m.map(w.end - 1e-3);
      if (s === null || e === null) continue;
      const s0 = s - m.hookDur, e0 = e - m.hookDur + 1e-3;
      if (s0 >= hook.start - 1e-3 && e0 <= hook.end + 0.05) out.push({ ...w, start: s0 - hook.start, end: Math.min(e0, hook.end) - hook.start, hook: true });
    }
  }
  for (const w of words) {
    const s = m.map(w.start), e = m.map(w.end - 1e-3);
    if (s === null || e === null) continue;
    out.push({ ...w, start: s, end: e + 1e-3 });
  }
  return out.sort((a, b) => a.start - b.start);
}

/** Segments ({start, end, text}) mapped the same way; partly-cut segments are clipped. */
function mapSegments(segments, removed, hook) {
  const m = makeMap(removed, hook);
  const out = [];
  for (const s of segments) {
    let a = m.map(s.start), b = m.map(s.end - 1e-3);
    if (a === null) {
      const r = m.cuts.find((c) => s.start >= c.start && s.start < c.end);
      a = r ? m.map(r.end) : null;
    }
    if (b === null) {
      const r = m.cuts.find((c) => s.end > c.start && s.end <= c.end);
      b = r && r.start > s.start ? m.map(r.start - 1e-3) : null;
    }
    if (a === null || b === null || b <= a) continue;
    out.push({ ...s, start: a, end: b });
  }
  return out;
}

module.exports = { merge, makeMap, mapWords, mapSegments };
