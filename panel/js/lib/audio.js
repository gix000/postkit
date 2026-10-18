// Builds one compact audio file from the clips on the speech track, and maps
// times in that file back to sequence time (clips can have gaps between them).

const fs = require("fs");
const os = require("os");
const path = require("path");
const ffmpeg = require("./ffmpeg");

/** Ordered pieces: where each clip sits in the sequence and in the joined audio. */
function buildMap(clips) {
  let cursor = 0;
  return clips
    .slice()
    .sort((a, b) => a.start - b.start)
    .map((c) => {
      const dur = c.end - c.start;
      const piece = { seqStart: c.start, audioStart: cursor, dur, clip: c };
      cursor += dur;
      return piece;
    });
}

/** Converts a time in the joined audio to sequence seconds. */
function toSequenceTime(map, t) {
  for (const p of map) {
    if (t < p.audioStart + p.dur + 1e-6) return p.seqStart + Math.max(0, t - p.audioStart);
  }
  const last = map[map.length - 1];
  return last ? last.seqStart + last.dur : t;
}

/**
 * Writes a 16 kHz mono Opus file of the speech track (~0.2 MB a minute).
 * Opus stores its encoder delay, so decoders trim it and word timings stay exact (MP3 would shift them ~0.1 s).
 * Each clip contributes the part of its source that is used on the timeline.
 */
async function extractSpeech(bin, clips, { onProgress } = {}) {
  const map = buildMap(clips);
  if (!map.length) throw new Error("There's no audio on the selected track.");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "postkit-"));
  const out = path.join(dir, "speech.ogg");

  const args = [];
  map.forEach((p) => {
    const c = p.clip;
    // Speed changes aren't supported: use the timeline duration of the clip.
    args.push("-ss", c.inPoint.toFixed(3), "-t", p.dur.toFixed(3), "-i", c.mediaPath);
  });
  const inputs = map.map((_, i) => `[${i}:a:0]aresample=16000,aformat=channel_layouts=mono[a${i}]`).join(";");
  const concat = map.map((_, i) => `[a${i}]`).join("") + `concat=n=${map.length}:v=0:a=1[out]`;
  args.push("-filter_complex", `${inputs};${concat}`, "-map", "[out]", "-ac", "1", "-ar", "16000", "-c:a", "libopus", "-b:a", "24k", "-application", "voip", "-y", out);

  await ffmpeg.run(bin, args, { onProgress });
  return { file: out, map, dir };
}

module.exports = { buildMap, toSequenceTime, extractSpeech };
