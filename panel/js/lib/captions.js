// Groups word timings into short captions and writes SRT.

/**
 * @param words [{word, start, end}] in sequence seconds
 * @param opts.maxWords  words per caption (1–3 for reels)
 * @param opts.maxGap    a pause longer than this starts a new caption
 * @param opts.maxChars  keep lines short enough for a phone screen
 */
function group(words, { maxWords = 3, maxGap = 0.6, maxChars = 22 } = {}) {
  const clean = words
    .map((w) => ({ text: String(w.word || "").trim(), start: +w.start, end: +w.end }))
    .filter((w) => w.text && w.end > w.start)
    .sort((a, b) => a.start - b.start);

  const caps = [];
  let cur = null;
  for (const w of clean) {
    const text = cur ? `${cur.text} ${w.text}` : w.text;
    const startNew =
      !cur || cur.count >= maxWords || w.start - cur.end > maxGap || text.length > maxChars || /[.!?؟،,]$/.test(cur.text);
    if (startNew) {
      if (cur) caps.push(cur);
      cur = { text: w.text, start: w.start, end: w.end, count: 1 };
    } else {
      cur.text = text;
      cur.end = w.end;
      cur.count += 1;
    }
  }
  if (cur) caps.push(cur);

  // Close tiny gaps so captions don't flicker between words.
  for (let i = 0; i < caps.length - 1; i++) {
    if (caps[i + 1].start - caps[i].end < 0.25) caps[i].end = caps[i + 1].start;
  }
  return caps.map(({ text, start, end }) => ({ text, start, end }));
}

function srtTime(sec) {
  const ms = Math.max(0, Math.round(sec * 1000));
  const p = (n, w = 2) => String(n).padStart(w, "0");
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
}

function toSrt(captions) {
  return captions.map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text}\n`).join("\n");
}

module.exports = { group, toSrt, srtTime };
