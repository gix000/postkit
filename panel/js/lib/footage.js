// Reads raw footage on your computer: size, length and sound of each file, and how
// interesting each moment looks (sharp, well lit, moving but not shaking). Then picks
// the best moments to fill a beat grid for a montage.

const { spawn } = require("child_process");
const ffmpeg = require("./ffmpeg");

/** Duration, frame size (after rotation), frame rate and whether there's sound. */
async function probe(bin, file) {
  let err = "";
  try {
    err = await ffmpeg.run(bin, ["-i", file, "-t", "0.01", "-f", "null", "-"]);
  } catch (e) {
    err = String(e.message || "");
  }
  return parseProbe(err);
}

function parseProbe(text) {
  const d = text.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  const duration = d ? +d[1] * 3600 + +d[2] * 60 + +d[3] : 0;
  const v = text.match(/Stream #[^\n]*Video:[^\n]*?(\d{2,5})x(\d{2,5})[^\n]*/);
  let width = v ? +v[1] : 0, height = v ? +v[2] : 0;
  const f = v && v[0].match(/([\d.]+)\s*fps/);
  const rot = text.match(/rotation of (-?\d+(?:\.\d+)?) degrees/) || text.match(/rotate\s*:\s*(-?\d+)/);
  if (rot && Math.abs(Math.round(+rot[1])) % 180 === 90) [width, height] = [height, width];
  return { duration, width, height, fps: f ? +f[1] : 30, audio: /Stream #[^\n]*Audio:/.test(text) };
}

const AW = 48, AH = 27, RATE = 4; // analysis size and frames per second

/** Grey frames at 4 fps, 48×27 — enough to judge light, sharpness and motion. */
function decodeSmall(bin, file, duration) {
  return new Promise((resolve, reject) => {
    const args = ["-hide_banner", "-nostdin", "-loglevel", "error", "-i", file, "-an", "-vf", `fps=${RATE},scale=${AW}:${AH},format=gray`, "-f", "rawvideo", "-"];
    if (duration) args.splice(4, 0, "-t", String(Math.min(duration, 1800)));
    const child = spawn(bin, args, { windowsHide: true });
    const chunks = [];
    let e = "";
    child.stdout.on("data", (c) => chunks.push(c));
    child.stderr.on("data", (c) => (e += c));
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(e.trim().split("\n").pop() || "ffmpeg failed"))));
  });
}

/** Per-frame measures from small grey frames. */
function measure(buf) {
  const size = AW * AH;
  const n = Math.floor(buf.length / size);
  const bright = [], sharp = [], motion = [];
  for (let k = 0; k < n; k++) {
    const o = k * size;
    let sum = 0, lap = 0, diff = 0;
    for (let y = 1; y < AH - 1; y++) {
      for (let x = 1; x < AW - 1; x++) {
        const i = o + y * AW + x;
        const v = buf[i];
        sum += v;
        lap += Math.abs(4 * v - buf[i - 1] - buf[i + 1] - buf[i - AW] - buf[i + AW]);
        if (k > 0) diff += Math.abs(v - buf[i - size]);
      }
    }
    const inner = (AW - 2) * (AH - 2);
    bright.push(sum / inner / 255);
    sharp.push(lap / inner / 255);
    motion.push(k > 0 ? diff / inner / 255 : 0);
  }
  return { step: 1 / RATE, bright, sharp, motion };
}

/** Shot changes: frames whose difference jumps well above the neighbourhood. */
function shotCuts(motion, step) {
  const cuts = [];
  for (let i = 2; i < motion.length - 2; i++) {
    const local = (motion[i - 2] + motion[i - 1] + motion[i + 1] + motion[i + 2]) / 4;
    if (motion[i] > 0.12 && motion[i] > local * 3) cuts.push(i * step);
  }
  return cuts;
}

async function analyze(bin, file, info) {
  const buf = await decodeSmall(bin, file, info && info.duration);
  const m = measure(buf);
  m.cuts = shotCuts(m.motion, m.step);
  m.duration = (info && info.duration) || m.bright.length * m.step;
  return m;
}

/** How good a window [s, s+len) looks, 0–1 (higher is better). */
function windowScore(a, s, len) {
  const i0 = Math.max(0, Math.floor(s / a.step)), i1 = Math.min(a.bright.length, Math.ceil((s + len) / a.step));
  if (i1 <= i0) return 0;
  let score = 0;
  for (let i = i0; i < i1; i++) {
    const b = a.bright[i], sh = a.sharp[i], mo = a.motion[i];
    const light = b < 0.08 || b > 0.95 ? 0 : 1 - Math.abs(b - 0.48) * 1.4; // not black, not blown out
    const detail = Math.min(1, sh * 9);
    const move = mo < 0.004 ? 0.35 : mo > 0.16 ? 0.15 : Math.min(1, 0.45 + mo * 9); // some life, no whip pans
    score += 0.4 * light + 0.35 * detail + 0.25 * move;
  }
  score /= i1 - i0;
  // A window that spans a shot change looks like a glitch.
  if (a.cuts.some((c) => c > s + 0.05 && c < s + len - 0.05)) score *= 0.4;
  return Math.max(0, score);
}

/**
 * Cut points from the music: every `every` beats from the first beat, up to `length`.
 * Without beats, a steady grid for the pace. Returns slot lengths that add up to `length`.
 */
function slots(beats, { length, pace = "normal" } = {}) {
  const every = pace === "fast" ? 2 : pace === "calm" ? 8 : 4;
  const min = pace === "fast" ? 0.45 : pace === "calm" ? 1.6 : 0.9;
  const pts = [0];
  if (beats && beats.length > 4) {
    // Use the beat period to build an even grid that follows the music.
    const gaps = [];
    for (let i = 1; i < beats.length; i++) gaps.push(beats[i] - beats[i - 1]);
    gaps.sort((x, y) => x - y);
    let period = gaps[Math.floor(gaps.length / 2)];
    while (period * every < min) period *= 2;
    const start = beats[0] % (period * every);
    for (let t = start > 0.2 ? start : start + period * every; t < length - min * 0.8; t += period * every) {
      // Snap to the nearest real beat so cuts land on hits.
      const near = beats.reduce((b, x) => (Math.abs(x - t) < Math.abs(b - t) ? x : b), t);
      const at = Math.abs(near - t) < period * 0.5 ? near : t;
      if (at - pts[pts.length - 1] >= min) pts.push(at);
    }
  } else {
    const step = pace === "fast" ? 0.9 : pace === "calm" ? 3 : 1.7;
    for (let t = step; t < length - step * 0.6; t += step) pts.push(t);
  }
  pts.push(length);
  const out = [];
  for (let i = 1; i < pts.length; i++) out.push(+(pts[i] - pts[i - 1]).toFixed(3));
  return out;
}

/**
 * Picks the best moments to fill the slots. clips: [{path, duration, analysis}] in the
 * order they should play. Each clip gets slots in proportion to its length; its moments
 * stay in their original order.
 */
function pickMoments(clips, slotLens) {
  const usable = clips.filter((c) => c.duration > 0.5);
  if (!usable.length) return [];
  const total = usable.reduce((s, c) => s + c.duration, 0);
  // Slots follow how much good footage each clip has, and never more than it can fill
  // without repeating itself; when the footage is short, neighbouring slots merge.
  const good = usable.map((c) => (c.analysis ? goodSeconds(c.analysis) : c.duration) + 0.01);
  const mean = slotLens.reduce((x, y) => x + y, 0) / slotLens.length;
  const caps = usable.map((c) => Math.max(1, Math.floor((c.duration + 0.1) / (mean + 0.1))));
  let counts;
  counts = allocate(good, slotLens.length);
  // Move slots from clips over their capacity to clips with room.
  for (let guard = 0; guard < 1000; guard++) {
    const over = counts.findIndex((c, i) => c > caps[i]);
    if (over < 0) break;
    const room = counts.map((c, i) => ({ i, spare: caps[i] - c })).filter((x) => x.spare > 0).sort((x, y) => y.spare - x.spare)[0];
    if (!room) break;
    counts[over]--;
    counts[room.i]++;
  }
  const out = [];
  let slot = 0;
  usable.forEach((c, ci) => {
    const lens = slotLens.slice(slot, slot + counts[ci]);
    slot += counts[ci];
    for (const w of bestWindows(c, lens)) out.push({ path: c.path, clip: ci, srcIn: +w.start.toFixed(3), srcOut: +(w.start + w.len).toFixed(3), len: w.len, score: +w.score.toFixed(3) });
  });
  let at = 0;
  for (const o of out) { o.at = +at.toFixed(3); at += o.len; }
  return out;
}

/**
 * The best moments in one clip for a run of slots, in the order they happened and never
 * overlapping: a small dynamic programme over a quarter-second grid.
 */
function bestWindows(c, lens) {
  const GRID = 0.125, GAP = 0.1;
  const P = Math.max(1, Math.floor(c.duration / GRID) + 1);
  const score = (s, L) => (c.analysis ? windowScore(c.analysis, s, L) : 0.5);
  const need = lens.reduce((a, b) => a + b, 0) + GAP * (lens.length - 1);
  if (need > c.duration + 1e-6) {
    // Not enough footage: play it straight through, slot after slot.
    let t = 0;
    return lens.map((L) => { const start = Math.min(t, Math.max(0, c.duration - L)); t += L; return { start, len: L, score: score(start, L) }; });
  }
  let prev = null; // best total ending with the previous slot, by start index
  const back = [];
  for (let j = 0; j < lens.length; j++) {
    const L = lens[j];
    const cur = new Float64Array(P).fill(-Infinity);
    const from = new Int32Array(P).fill(-1);
    let bestPrev = -Infinity, bestPrevAt = -1, q = 0;
    for (let p = 0; p < P; p++) {
      const s = p * GRID;
      if (s + L > c.duration + 1e-6) break;
      if (j === 0) { cur[p] = score(s, L); continue; }
      // Previous slot must end GAP before this one starts.
      while (q < P && q * GRID + lens[j - 1] + GAP <= s + 1e-9) {
        if (prev[q] > bestPrev) { bestPrev = prev[q]; bestPrevAt = q; }
        q++;
      }
      if (bestPrevAt < 0) continue;
      cur[p] = bestPrev + score(s, L);
      from[p] = bestPrevAt;
    }
    back.push(from);
    prev = cur;
  }
  let end = 0;
  for (let p = 1; p < P; p++) if (prev[p] > prev[end]) end = p;
  if (!isFinite(prev[end])) {
    // Doesn't fit on the grid: play the clip straight through.
    let t = 0;
    return lens.map((L) => { const start = Math.min(t, Math.max(0, c.duration - L)); t += L + GAP; return { start, len: L, score: score(start, L) }; });
  }
  const starts = new Array(lens.length);
  for (let j = lens.length - 1; j >= 0; j--) { starts[j] = end; end = back[j][end]; }
  return lens.map((L, j) => ({ start: starts[j] * GRID, len: L, score: score(starts[j] * GRID, L) }));
}

/** Seconds of a clip that look good (scored in half-second steps). */
function goodSeconds(a) {
  let good = 0;
  for (let s = 0; s + 0.5 <= a.duration + 1e-6; s += 0.5) if (windowScore(a, s, 0.5) > 0.35) good += 0.5;
  return good;
}

/** Splits n slots across clips in proportion to their lengths (largest remainder); every clip gets one when it can. */
function allocate(durations, n) {
  const k = durations.length;
  const counts = new Array(k).fill(0);
  if (n < k) {
    // Not enough slots for every clip: the longest clips get one each.
    durations.map((d, i) => ({ d, i })).sort((x, y) => y.d - x.d).slice(0, n).forEach((x) => (counts[x.i] = 1));
    return counts;
  }
  counts.fill(1);
  const rest = n - k, total = durations.reduce((s, d) => s + d, 0);
  const exact = durations.map((d) => (d / total) * rest);
  exact.forEach((e, i) => (counts[i] += Math.floor(e)));
  let left = n - counts.reduce((s, c) => s + c, 0);
  exact.map((e, i) => ({ r: e - Math.floor(e), i })).sort((x, y) => y.r - x.r).forEach((x) => { if (left > 0) { counts[x.i]++; left--; } });
  return counts;
}

/** Scale (percent) that fills a frame of W×H with a source of w×h, cropping the rest. */
const fillScale = (w, h, W, H) => (w && h ? +(Math.max(W / w, H / h) * 100).toFixed(2) : 100);

const FORMATS = {
  original: null,
  vertical: { w: 1080, h: 1920, name: "Vertical 9:16" },
  square: { w: 1080, h: 1080, name: "Square 1:1" },
  horizontal: { w: 1920, h: 1080, name: "Horizontal 16:9" },
};

module.exports = { bestWindows, goodSeconds, allocate, probe, parseProbe, analyze, measure, shotCuts, windowScore, slots, pickMoments, fillScale, FORMATS };
