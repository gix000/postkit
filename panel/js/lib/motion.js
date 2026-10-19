// Offline helpers for audio ducking, multicam switching, curves and tracking.

const beats = require("./beats");

// ── ducking ────────────────────────────────────────────────
/**
 * Volume keys for a music track: lower under speech, back up in the pauses.
 * speech: [{start, end}] when someone talks (sequence seconds). Returns [{time, db}].
 */
function duckKeys(speech, { under = -20, between = -8, ramp = 0.25, minGap = 0.8, start = 0, end = Infinity } = {}) {
  const runs = [];
  for (const s of speech.slice().sort((a, b) => a.start - b.start)) {
    const last = runs[runs.length - 1];
    if (last && s.start - last.end < minGap) last.end = Math.max(last.end, s.end);
    else runs.push({ start: s.start, end: s.end });
  }
  const keys = [{ time: start, db: runs.length && runs[0].start - ramp <= start ? under : between }];
  for (const r of runs) {
    const a = Math.max(start, r.start - ramp), b = Math.min(end, r.end + ramp);
    if (a > keys[keys.length - 1].time + 0.01) keys.push({ time: a, db: between });
    keys.push({ time: Math.max(a, r.start), db: under });
    keys.push({ time: Math.min(b, r.end), db: under });
    if (b < end) keys.push({ time: b, db: between });
  }
  const seen = new Set();
  return keys.filter((k) => k.time >= start && k.time <= end && !seen.has(k.time.toFixed(3)) && seen.add(k.time.toFixed(3)));
}

/** Speech runs from silences inside the clips of the speech track. */
function speechFromSilences(clips, silences) {
  const out = [];
  for (const c of clips) {
    let t = c.start;
    for (const s of silences.filter((x) => x.start >= c.start - 1e-6 && x.end <= c.end + 1e-6).sort((a, b) => a.start - b.start)) {
      if (s.start > t) out.push({ start: t, end: s.start });
      t = Math.max(t, s.end);
    }
    if (c.end > t) out.push({ start: t, end: c.end });
  }
  return out;
}

// ── multicam ───────────────────────────────────────────────
/** Loudness envelope of a clip's audio: one RMS value per `step` seconds of the sequence. */
async function envelope(bin, clip, step = 0.1) {
  const samples = await beats.decode(bin, clip.mediaPath, { start: clip.inPoint, duration: clip.end - clip.start });
  const per = Math.round(beats.RATE * step);
  const out = [];
  for (let i = 0; i + per <= samples.length; i += per) {
    let sum = 0;
    for (let j = i; j < i + per; j++) sum += samples[j] * samples[j];
    out.push(Math.sqrt(sum / per));
  }
  return { start: clip.start, step, values: out };
}

/**
 * Who is speaking when, from each camera's own microphone. envs[k] is the list of
 * envelopes for camera k. Returns [{start, end, cam}] with no shot shorter than minShot,
 * plus the occasional wide shot (cam `wide`) when nobody dominates.
 */
function multicamPlan(envs, { from, to, step = 0.1, minShot = 1.6, margin = 1.4, wide = null } = {}) {
  const n = Math.round((to - from) / step);
  const level = (k, t) => {
    for (const e of envs[k]) {
      const i = Math.floor((t - e.start) / e.step);
      if (i >= 0 && i < e.values.length) return e.values[i];
    }
    return 0;
  };
  // Smooth over half a second so breaths don't trigger cuts.
  const win = Math.max(1, Math.round(0.5 / step));
  const choice = [];
  for (let i = 0; i < n; i++) {
    const t = from + i * step;
    const scores = envs.map((_, k) => {
      let s = 0;
      for (let j = -win; j <= win; j++) s += level(k, t + j * step);
      return s;
    });
    let best = 0;
    for (let k = 1; k < scores.length; k++) if (scores[k] > scores[best]) best = k;
    const second = Math.max(...scores.filter((_, k) => k !== best), 0);
    const clear = scores[best] > second * margin;
    choice.push(clear ? best : wide !== null ? wide : best);
  }
  // Runs, then remove shots shorter than minShot by merging into the previous one.
  const runs = [];
  choice.forEach((c, i) => {
    const t = from + i * step;
    const last = runs[runs.length - 1];
    if (last && last.cam === c) last.end = t + step;
    else runs.push({ start: t, end: t + step, cam: c });
  });
  const merged = [];
  for (const r of runs) {
    const last = merged[merged.length - 1];
    if (last && (r.end - r.start < minShot || last.cam === r.cam)) last.end = r.end;
    else merged.push({ ...r });
  }
  if (merged.length > 1 && merged[0].end - merged[0].start < minShot) {
    merged[1].start = merged[0].start;
    merged.shift();
  }
  if (merged.length) merged[merged.length - 1].end = to;
  return merged.map((r) => ({ start: +r.start.toFixed(3), end: +r.end.toFixed(3), cam: r.cam }));
}

// ── curves ─────────────────────────────────────────────────
const CURVES = {
  easeInOut: [0.65, 0, 0.35, 1],
  easeOut: [0.16, 1, 0.3, 1],
  easeIn: [0.7, 0, 0.84, 0],
  smooth: [0.4, 0, 0.2, 1],
  snap: [0.9, 0, 0.1, 1],
  overshoot: [0.34, 1.56, 0.64, 1],
  anticipate: [0.36, -0.4, 0.6, 1],
  linear: [0, 0, 1, 1],
};

function bezierY(x1, y1, x2, y2) {
  const ax = 3 * x1 - 3 * x2 + 1, bx = 3 * x2 - 6 * x1, cx = 3 * x1;
  const ay = 3 * y1 - 3 * y2 + 1, by = 3 * y2 - 6 * y1, cy = 3 * y1;
  return (p) => {
    let lo = 0, hi = 1, s = p;
    for (let i = 0; i < 30; i++) {
      const x = ((ax * s + bx) * s + cx) * s;
      if (Math.abs(x - p) < 1e-6) break;
      if (x < p) lo = s; else hi = s;
      s = (lo + hi) / 2;
    }
    return ((ay * s + by) * s + cy) * s;
  };
}

/**
 * Bakes a curve between every pair of keyframes into dense keys (Premiere's scripting
 * can't set bezier handles, so the shape is written as keys every `every` frames).
 */
function bake(keys, curve, { fps = 30, every = 1 } = {}) {
  const c = Array.isArray(curve) ? curve : CURVES[curve] || CURVES.easeInOut;
  const f = bezierY(c[0], c[1], c[2], c[3]);
  const out = [];
  const lerp = (a, b, p) => (Array.isArray(a) ? a.map((v, i) => v + (b[i] - v) * p) : a + (b - a) * p);
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    const frames = Math.max(1, Math.round((b.time - a.time) * fps));
    for (let k = 0; k < frames; k += every) {
      const p = k / frames;
      out.push({ time: +(a.time + (b.time - a.time) * p).toFixed(5), value: lerp(a.value, b.value, f(p)) });
    }
  }
  out.push({ time: keys[keys.length - 1].time, value: keys[keys.length - 1].value });
  return out;
}

// ── tracking ───────────────────────────────────────────────
/** Grey image from RGBA. */
function grey(rgba, w, h) {
  const g = new Float32Array(w * h);
  for (let i = 0, j = 0; i < g.length; i++, j += 4) g[i] = 0.299 * rgba[j] + 0.587 * rgba[j + 1] + 0.114 * rgba[j + 2];
  return g;
}

/** Normalised cross-correlation of template T (tw×th) at (x, y) in image I (iw wide). */
function ncc(I, iw, T, tw, th, tMean, tNorm, x, y) {
  let sum = 0, sumI = 0, sumI2 = 0;
  for (let j = 0; j < th; j++) {
    const row = (y + j) * iw + x;
    const trow = j * tw;
    for (let i = 0; i < tw; i++) {
      const v = I[row + i];
      sum += v * T[trow + i];
      sumI += v;
      sumI2 += v * v;
    }
  }
  const n = tw * th;
  const varI = sumI2 - (sumI * sumI) / n;
  if (varI <= 1e-6 || tNorm <= 1e-6) return 0;
  return (sum - tMean * sumI) / Math.sqrt(varI * tNorm);
}

/**
 * Follows a box through frames. frames: async iterator of grey Float32Array (w×h).
 * box: {x, y, w, h} in pixels on the first frame. Returns centres per frame (pixels)
 * and a confidence 0–1. The template updates slowly so it copes with turning objects.
 */
async function track(frames, w, h, box, { search = 24, update = 0.15 } = {}) {
  const bw = Math.max(8, Math.round(box.w)), bh = Math.max(8, Math.round(box.h));
  let bx = Math.round(box.x), by = Math.round(box.y);
  let raw = null, T = null, tNorm = 0;
  const out = [];
  const setTemplate = (I, x, y, mixAmount) => {
    const next = new Float32Array(bw * bh);
    for (let j = 0; j < bh; j++) for (let i = 0; i < bw; i++) next[j * bw + i] = I[(y + j) * w + x + i];
    if (raw && mixAmount < 1) for (let k = 0; k < next.length; k++) next[k] = raw[k] * (1 - mixAmount) + next[k] * mixAmount;
    raw = next;
    let mean = 0;
    for (const v of raw) mean += v;
    mean /= raw.length;
    T = new Float32Array(raw.length); // zero-mean copy for the correlation
    tNorm = 0;
    for (let k = 0; k < raw.length; k++) { T[k] = raw[k] - mean; tNorm += T[k] * T[k]; }
  };
  let first = true;
  for await (const I of frames) {
    if (first) {
      setTemplate(I, bx, by, 1);
      out.push({ x: bx + bw / 2, y: by + bh / 2, score: 1 });
      first = false;
      continue;
    }
    let best = -2, best2 = { x: bx, y: by };
    // Coarse search every 2 px, then refine around the best.
    for (let dy = -search; dy <= search; dy += 2) {
      for (let dx = -search; dx <= search; dx += 2) {
        const x = bx + dx, y = by + dy;
        if (x < 0 || y < 0 || x + bw > w || y + bh > h) continue;
        const s = ncc(I, w, T, bw, bh, 0, tNorm, x, y);
        if (s > best) { best = s; best2 = { x, y }; }
      }
    }
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = best2.x + dx, y = best2.y + dy;
      if (x < 0 || y < 0 || x + bw > w || y + bh > h) continue;
      const s = ncc(I, w, T, bw, bh, 0, tNorm, x, y);
      if (s > best) { best = s; best2 = { x, y }; }
    }
    bx = best2.x;
    by = best2.y;
    if (best > 0.6) setTemplate(I, bx, by, update);
    out.push({ x: bx + bw / 2, y: by + bh / 2, score: Math.max(0, best) });
  }
  return out;
}

/** Smooths a track a little (moving average over `k` frames) to remove jitter. */
function smooth(points, k = 2) {
  return points.map((p, i) => {
    let sx = 0, sy = 0, n = 0;
    for (let j = Math.max(0, i - k); j <= Math.min(points.length - 1, i + k); j++) { sx += points[j].x; sy += points[j].y; n++; }
    return { ...p, x: sx / n, y: sy / n };
  });
}

module.exports = { duckKeys, speechFromSilences, envelope, multicamPlan, CURVES, bezierY, bake, grey, track, smooth };
