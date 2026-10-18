// Plans scale keyframes so a talking shot changes size with each sentence.

/**
 * @param sentences [{start, end}] in sequence seconds
 * @param opts.style "punch" (instant cut to a tighter frame) or "push" (slow zoom across the sentence)
 * @param opts.amount extra scale in percent, e.g. 12 → 112%
 * @param opts.base   the clip's current scale (usually 100)
 * @returns [{time, value}] in sequence seconds, sorted
 */
function plan(sentences, { style = "punch", amount = 12, base = 100, fps = 30, minLength = 1.2 } = {}) {
  const frame = 1 / fps;
  const keys = [];
  const list = sentences.filter((s) => s.end - s.start >= minLength).sort((a, b) => a.start - b.start);

  list.forEach((s, i) => {
    if (style === "push") {
      keys.push({ time: s.start, value: base }, { time: Math.max(s.start + frame, s.end - frame), value: base + amount });
    } else {
      // Alternate wide / tight on each sentence. Two keys one frame apart make a clean cut.
      const tight = i % 2 === 1;
      const value = tight ? base + amount : base;
      const prev = tight ? base : base + amount;
      if (i === 0) keys.push({ time: s.start, value });
      else keys.push({ time: s.start - frame, value: prev }, { time: s.start, value });
    }
  });

  // Snap to frames and drop duplicates at the same time.
  const seen = new Set();
  return keys
    .map((k) => ({ time: Math.round(k.time * fps) / fps, value: +k.value.toFixed(2) }))
    .filter((k) => (seen.has(k.time) ? false : seen.add(k.time)))
    .sort((a, b) => a.time - b.time);
}

module.exports = { plan };
