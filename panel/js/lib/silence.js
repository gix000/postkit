// Silence detection and the arithmetic that turns it into cuts on the timeline.

const ffmpeg = require("./ffmpeg");

/** Parses ffmpeg silencedetect output into [{start, end}] in seconds (relative to the analysed audio). */
function parseSilences(stderr, mediaDuration) {
  const out = [];
  let open = null;
  for (const line of stderr.split(/\r?\n/)) {
    const s = line.match(/silence_start:\s*(-?\d+(?:\.\d+)?)/);
    if (s) open = Math.max(0, parseFloat(s[1]));
    const e = line.match(/silence_end:\s*(\d+(?:\.\d+)?)/);
    if (e && open !== null) {
      out.push({ start: open, end: parseFloat(e[1]) });
      open = null;
    }
  }
  // Silence that runs to the end of the file has no silence_end line.
  if (open !== null && typeof mediaDuration === "number" && mediaDuration > open) out.push({ start: open, end: mediaDuration });
  return out;
}

/**
 * Detects silences in one clip's used portion of its source file.
 * Returns ranges in SEQUENCE seconds.
 */
async function detectInClip(bin, clip, { thresholdDb = -35, minSilence = 0.4 } = {}) {
  const used = clip.outPoint - clip.inPoint;
  const stderr = await ffmpeg.run(bin, [
    "-ss", clip.inPoint.toFixed(3),
    "-t", used.toFixed(3),
    "-i", clip.mediaPath,
    "-vn",
    "-af", `silencedetect=noise=${thresholdDb}dB:d=${minSilence}`,
    "-f", "null", "-",
  ]);
  return parseSilences(stderr, used).map((r) => ({ start: clip.start + r.start, end: clip.start + r.end }));
}

/**
 * Turns raw silences into the ranges to remove:
 * keeps `padding` seconds of air next to speech, drops anything shorter than
 * `minSilence` after padding, merges overlaps, clamps to [from, to], and snaps to frames.
 */
function planCuts(silences, { padding = 0.12, minSilence = 0.4, fps = 30, from = 0, to = Infinity } = {}) {
  const frame = 1 / fps;
  const snap = (t) => Math.round(t * fps) / fps;
  const ranges = silences
    .map((r) => ({ start: Math.max(from, r.start + padding), end: Math.min(to, r.end - padding) }))
    .filter((r) => r.end - r.start >= Math.max(minSilence - 2 * padding, frame))
    .sort((a, b) => a.start - b.start);

  const merged = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r.start <= last.end + frame) last.end = Math.max(last.end, r.end);
    else merged.push({ ...r });
  }
  return merged
    .map((r) => ({ start: snap(r.start), end: snap(r.end) }))
    .filter((r) => r.end - r.start >= frame);
}

function totalSeconds(ranges) {
  return ranges.reduce((s, r) => s + (r.end - r.start), 0);
}

module.exports = { parseSilences, detectInClip, planCuts, totalSeconds };
