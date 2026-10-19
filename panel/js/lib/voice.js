// Studio voice, offline: measures the speech track, then cleans it with an ffmpeg
// chain (rumble cut, noise reduction, de-essing, compression, presence, loudness).
// The result is a new audio file placed on its own track; the original stays.

const ffmpeg = require("./ffmpeg");
const fs = require("fs");
const os = require("os");
const path = require("path");

/** Platform loudness targets (integrated LUFS, true peak). */
const TARGETS = {
  social: { name: "TikTok, Reels, Shorts", lufs: -14, tp: -1 },
  youtube: { name: "YouTube", lufs: -14, tp: -1 },
  podcast: { name: "Podcast", lufs: -16, tp: -1.5 },
  broadcast: { name: "Broadcast (EBU R128)", lufs: -23, tp: -1 },
};

/** Voice presets. Each returns the filter chain before loudness normalisation. */
const PRESETS = {
  clean: { name: "Clean", note: "Removes hum and hiss, evens the level", chain: (a) => [`highpass=f=80`, `afftdn=nr=${a.noise ? 14 : 8}:nf=${a.noise ? -38 : -45}:tn=1`, `deesser=i=0.35`, `acompressor=threshold=-20dB:ratio=3:attack=8:release=120:makeup=3`, `equalizer=f=3200:t=q:w=1.2:g=2`] },
  warm: { name: "Warm", note: "Fuller low end, softer top", chain: (a) => [`highpass=f=70`, `afftdn=nr=${a.noise ? 12 : 6}:nf=-42:tn=1`, `equalizer=f=160:t=q:w=1:g=2.5`, `equalizer=f=6500:t=q:w=1.5:g=-1.5`, `deesser=i=0.4`, `acompressor=threshold=-22dB:ratio=2.5:attack=12:release=160:makeup=3`] },
  clear: { name: "Clear", note: "Cuts mud, brings words forward", chain: (a) => [`highpass=f=100`, `afftdn=nr=${a.noise ? 14 : 8}:nf=-40:tn=1`, `equalizer=f=280:t=q:w=1:g=-3`, `equalizer=f=3800:t=q:w=1:g=3.5`, `deesser=i=0.5`, `acompressor=threshold=-20dB:ratio=3.5:attack=6:release=100:makeup=3.5`] },
  radio: { name: "Radio", note: "Dense, close, punchy", chain: (a) => [`highpass=f=90`, `afftdn=nr=${a.noise ? 16 : 10}:nf=-38:tn=1`, `equalizer=f=120:t=q:w=1:g=3`, `equalizer=f=350:t=q:w=1:g=-3`, `equalizer=f=4500:t=q:w=1:g=3`, `deesser=i=0.5`, `acompressor=threshold=-26dB:ratio=5:attack=4:release=80:makeup=6`, `alimiter=limit=0.9`] },
  denoise: { name: "Noise only", note: "Just removes background noise", chain: (a) => [`highpass=f=60`, `afftdn=nr=${a.noise ? 20 : 12}:nf=-36:tn=1`] },
};

/**
 * Renders the speech track to one file in timeline order (gaps become silence),
 * decoding each source file once. Returns {file, start} — place `file` at `start`.
 * clips: [{mediaPath, start, end, inPoint}] sequence seconds.
 */
async function mixdown(bin, clips, out, { rate = 48000, extraFilters = [] } = {}) {
  const list = clips.filter((c) => c.end > c.start).sort((a, b) => a.start - b.start);
  if (!list.length) throw new Error("There's no audio on the speech track.");
  const files = [...new Set(list.map((c) => c.mediaPath))];
  const uses = files.map((f) => list.filter((c) => c.mediaPath === f).length);
  const args = [];
  files.forEach((f) => args.push("-i", f));
  const parts = [];
  files.forEach((f, i) => parts.push(`[${i}:a:0]aresample=${rate},aformat=channel_layouts=mono,asplit=${uses[i]}${Array.from({ length: uses[i] }, (_, k) => `[s${i}_${k}]`).join("")}`));
  const counters = files.map(() => 0);
  const order = [];
  let cursor = list[0].start;
  let gapN = 0;
  list.forEach((c, n) => {
    const gap = c.start - cursor;
    if (gap > 0.0005) {
      parts.push(`anullsrc=r=${rate}:cl=mono,atrim=duration=${gap.toFixed(4)}[g${gapN}]`);
      order.push(`[g${gapN++}]`);
    }
    const fi = files.indexOf(c.mediaPath);
    const k = counters[fi]++;
    const dur = c.end - c.start;
    parts.push(`[s${fi}_${k}]atrim=start=${c.inPoint.toFixed(4)}:duration=${dur.toFixed(4)},asetpts=PTS-STARTPTS[p${n}]`);
    order.push(`[p${n}]`);
    cursor = Math.max(cursor, c.end);
  });
  let graph = parts.join(";") + `;${order.join("")}concat=n=${order.length}:v=0:a=1`;
  if (extraFilters.length) graph += "," + extraFilters.join(",");
  graph += "[out]";
  args.push("-filter_complex", graph, "-map", "[out]", "-ar", String(rate), "-c:a", "pcm_s16le", "-y", out);
  await ffmpeg.run(bin, args);
  return { file: out, start: list[0].start };
}

/** Loudness, peak and noise floor of a file. */
async function analyze(bin, file) {
  const err = await ffmpeg.run(bin, ["-i", file, "-af", "ebur128=peak=true,astats=measure_overall=Noise_floor+RMS_level:measure_perchannel=0", "-f", "null", "-"]);
  const num = (re) => {
    const all = [...err.matchAll(re)];
    return all.length ? parseFloat(all[all.length - 1][1]) : null;
  };
  const lufs = num(/I:\s*(-?\d+(?:\.\d+)?)\s*LUFS/g);
  const peak = num(/Peak:\s*(-?\d+(?:\.\d+)?)\s*dBFS/g);
  const noise = num(/Noise floor dB:\s*(-?\d+(?:\.\d+)?)/g);
  const lra = num(/LRA:\s*(-?\d+(?:\.\d+)?)\s*LU/g);
  return { lufs, peak, noise, lra };
}

/** Plain-language findings from an analysis. */
function findings(a, target = TARGETS.social) {
  const out = [];
  if (a.lufs !== null) {
    const d = a.lufs - target.lufs;
    if (Math.abs(d) <= 1) out.push(`Loudness is right for ${target.name} (${a.lufs.toFixed(1)} LUFS).`);
    else out.push(`${d < 0 ? "Too quiet" : "Too loud"} for ${target.name}: ${a.lufs.toFixed(1)} LUFS, target ${target.lufs}.`);
  }
  if (a.noise !== null) {
    if (a.noise > -50) out.push(`Noticeable background noise (floor ${a.noise.toFixed(0)} dB).`);
    else out.push(`Background is quiet (floor ${a.noise.toFixed(0)} dB).`);
  }
  if (a.peak !== null && a.peak > -0.5) out.push(`Peaks hit ${a.peak.toFixed(1)} dBFS — some words may distort.`);
  if (a.lra !== null && a.lra > 12) out.push(`Level jumps around a lot (range ${a.lra.toFixed(0)} LU); compression will even it out.`);
  return out;
}

/** The full chain: preset + loudness normalisation to the target. */
function chain(presetId, analysis, targetId = "social") {
  const p = PRESETS[presetId] || PRESETS.clean;
  const t = TARGETS[targetId] || TARGETS.social;
  const noisy = analysis && analysis.noise !== null && analysis.noise > -50;
  return [...p.chain({ noise: noisy }), `loudnorm=I=${t.lufs}:TP=${t.tp}:LRA=11`];
}

/** Processes the speech track to a new file next to the project's other PostKit files. */
async function process(bin, clips, { preset = "clean", target = "social", dir, analysis } = {}) {
  const outDir = dir || path.join(os.homedir(), "Documents", "PostKit", "Voice");
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const out = path.join(outDir, `Voice ${PRESETS[preset] ? PRESETS[preset].name : "Clean"} ${stamp}.wav`);
  return mixdown(bin, clips, out, { extraFilters: chain(preset, analysis, target) });
}

module.exports = { mixdown, analyze, findings, chain, process, PRESETS, TARGETS };
