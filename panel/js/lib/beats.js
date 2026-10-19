// Finds beats in a music file: decode to mono PCM with ffmpeg, build an energy
// envelope, and pick onsets that rise clearly above the local average.

const { spawn } = require("child_process");

const RATE = 11025;
const HOP = 256; // ~23 ms per envelope step

/** Decodes [start, start+duration] of a file to 16-bit mono PCM samples. */
function decode(bin, file, { start = 0, duration } = {}) {
  return new Promise((resolve, reject) => {
    const args = ["-hide_banner", "-nostdin", "-ss", String(start)];
    if (duration) args.push("-t", String(duration));
    args.push("-i", file, "-vn", "-ac", "1", "-ar", String(RATE), "-f", "s16le", "-");
    const child = spawn(bin, args, { windowsHide: true });
    const chunks = [];
    let err = "";
    child.stdout.on("data", (c) => chunks.push(c));
    child.stderr.on("data", (c) => (err += c));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) return reject(new Error(err.trim().split("\n").pop() || "ffmpeg failed"));
      const buf = Buffer.concat(chunks);
      resolve(new Int16Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 2)));
    });
  });
}

/** Onset times in seconds. sensitivity 0.5–2 (higher finds more beats). */
function detect(samples, { sensitivity = 1, minGap = 0.25 } = {}) {
  const frames = Math.floor(samples.length / HOP);
  const env = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    let sum = 0;
    for (let i = f * HOP; i < (f + 1) * HOP; i++) sum += samples[i] * samples[i];
    env[f] = Math.sqrt(sum / HOP);
  }
  // Positive energy change (spectral-flux-like on the envelope).
  const flux = new Float32Array(frames);
  for (let f = 1; f < frames; f++) flux[f] = Math.max(0, env[f] - env[f - 1]);

  const win = Math.round((0.5 * RATE) / HOP); // half-second neighbourhood
  const gap = Math.round((minGap * RATE) / HOP);
  const k = 1.5 / sensitivity;
  const out = [];
  let last = -Infinity;
  for (let f = 1; f < frames - 1; f++) {
    let mean = 0, n = 0;
    for (let j = Math.max(0, f - win); j <= Math.min(frames - 1, f + win); j++) { mean += flux[j]; n++; }
    mean /= n;
    let sd = 0;
    for (let j = Math.max(0, f - win); j <= Math.min(frames - 1, f + win); j++) sd += (flux[j] - mean) ** 2;
    sd = Math.sqrt(sd / n);
    const peak = flux[f] >= flux[f - 1] && flux[f] >= flux[f + 1];
    if (peak && flux[f] > mean + k * sd && flux[f] > 0 && f - last >= gap) {
      out.push((f * HOP) / RATE);
      last = f;
    }
  }
  return out;
}

/** Beat markers for one music clip, in sequence seconds. */
async function forClip(bin, clip, opts) {
  const samples = await decode(bin, clip.mediaPath, { start: clip.inPoint, duration: clip.outPoint - clip.inPoint });
  return detect(samples, opts).map((t) => clip.start + t);
}

module.exports = { decode, detect, forClip, RATE };
