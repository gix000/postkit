// Run with: node --test panel/test
const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const silence = require("../js/lib/silence");
const audio = require("../js/lib/audio");
const captions = require("../js/lib/captions");
const zoom = require("../js/lib/zoom");
const licence = require("../js/lib/licence");

const near = (a, b, tol = 0.05) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);

// ── silencedetect parsing ────────────────────────────────
test("parses ffmpeg silencedetect output, including silence that runs to the end", () => {
  const out = `
[silencedetect @ 0x1] silence_start: 1.2
[silencedetect @ 0x1] silence_end: 2.5 | silence_duration: 1.3
[silencedetect @ 0x1] silence_start: 4.00
`;
  assert.deepEqual(silence.parseSilences(out, 5), [
    { start: 1.2, end: 2.5 },
    { start: 4, end: 5 },
  ]);
});

test("planCuts pads speech, drops short pauses, merges and snaps to frames", () => {
  const cuts = silence.planCuts(
    [
      { start: 1, end: 2 }, // kept, padded to 1.12–1.88
      { start: 3, end: 3.3 }, // too short after padding → dropped
      { start: 5, end: 6.2 }, // overlaps the next one after padding → merged
      { start: 6.0, end: 7 },
    ],
    { padding: 0.12, minSilence: 0.4, fps: 25 },
  );
  assert.equal(cuts.length, 2);
  near(cuts[0].start, 1.12, 0.04);
  near(cuts[0].end, 1.88, 0.04);
  near(cuts[1].start, 5.12, 0.04);
  near(cuts[1].end, 6.88, 0.04);
  cuts.forEach((c) => near(c.start * 25, Math.round(c.start * 25), 1e-6)); // on frame boundaries
});

// ── real ffmpeg on generated audio ───────────────────────
function makeTone(file, pattern) {
  // pattern: [["tone", seconds] | ["gap", seconds], ...]
  const parts = pattern.map(([kind, d], i) =>
    kind === "tone" ? `sine=frequency=440:duration=${d}[p${i}]` : `anullsrc=r=44100:cl=mono,atrim=0:${d}[p${i}]`,
  );
  const concat = pattern.map((_, i) => `[p${i}]`).join("") + `concat=n=${pattern.length}:v=0:a=1[out]`;
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-filter_complex", `${parts.join(";")};${concat}`, "-map", "[out]", "-ar", "44100", "-y", file]);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pk-test-"));
const wav = path.join(tmp, "talk.wav");
// speech 0–2, silence 2–3.5, speech 3.5–5, silence 5–5.8, speech 5.8–7
makeTone(wav, [["tone", 2], ["gap", 1.5], ["tone", 1.5], ["gap", 0.8], ["tone", 1.2]]);

test("detects silences in a clip and reports them in sequence time", async () => {
  // Clip uses the source from 1s to 7s and sits at 10s on the timeline.
  const clip = { mediaPath: wav, inPoint: 1, outPoint: 7, start: 10, end: 16 };
  const found = await silence.detectInClip("ffmpeg", clip, { thresholdDb: -35, minSilence: 0.4 });
  assert.equal(found.length, 2);
  near(found[0].start, 11); // source 2.0 → sequence 11
  near(found[0].end, 12.5);
  near(found[1].start, 14);
  near(found[1].end, 14.8);
});

test("extracts a joined speech track and maps its time back to the sequence", async () => {
  const clips = [
    { mediaPath: wav, inPoint: 3.5, outPoint: 5, start: 20, end: 21.5 },
    { mediaPath: wav, inPoint: 0, outPoint: 2, start: 0, end: 2 },
  ];
  const { file, map, dir } = await audio.extractSpeech("ffmpeg", clips);
  const dur = parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString());
  near(dur, 3.5, 0.08);
  assert.equal(map[0].seqStart, 0); // sorted by timeline position
  near(audio.toSequenceTime(map, 1), 1);
  near(audio.toSequenceTime(map, 2.5), 20.5); // second piece starts at 2s in the audio
  fs.rmSync(dir, { recursive: true, force: true });
});

// ── captions ─────────────────────────────────────────────
test("groups words into short captions and writes valid SRT", () => {
  const words = [
    { word: "هيدا", start: 0, end: 0.4 },
    { word: "الـ", start: 0.4, end: 0.6 },
    { word: "reel", start: 0.6, end: 1.0 },
    { word: "قصّيناه", start: 1.0, end: 1.6 },
    { word: "بدقيقة.", start: 1.6, end: 2.2 },
    { word: "Next", start: 4.0, end: 4.3 }, // long pause → new caption
  ];
  const caps = captions.group(words, { maxWords: 3 });
  assert.deepEqual(caps.map((c) => c.text), ["هيدا الـ reel", "قصّيناه بدقيقة.", "Next"]);
  const srt = captions.toSrt(caps);
  assert.match(srt, /^1\n00:00:00,000 --> 00:00:01,000\nهيدا الـ reel\n/);
  assert.equal(captions.srtTime(3661.5), "01:01:01,500");
});

// ── zoom ─────────────────────────────────────────────────
test("punch zoom alternates wide and tight with a clean one-frame cut", () => {
  const keys = zoom.plan([{ start: 0, end: 2 }, { start: 2, end: 4 }, { start: 4, end: 6 }], { style: "punch", amount: 10, fps: 25 });
  assert.deepEqual(keys, [
    { time: 0, value: 100 },
    { time: 1.96, value: 100 },
    { time: 2, value: 110 },
    { time: 3.96, value: 110 },
    { time: 4, value: 100 },
  ]);
});

test("push zoom ramps across each sentence and skips very short ones", () => {
  const keys = zoom.plan([{ start: 0, end: 3 }, { start: 3, end: 3.5 }], { style: "push", amount: 8, fps: 30 });
  assert.equal(keys.length, 2);
  assert.deepEqual(keys[0], { time: 0, value: 100 });
  assert.equal(keys[1].value, 108);
});

// ── licence tokens ───────────────────────────────────────
function sign(claims, privateKey) {
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const head = enc({ alg: "ES256" });
  const body = enc(claims);
  const sig = crypto.sign("sha256", Buffer.from(`${head}.${body}`), { key: privateKey, dsaEncoding: "ieee-p1363" });
  return `${head}.${body}.${sig.toString("base64url")}`;
}

test("accepts a valid licence token and rejects forged, expired or foreign ones", () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
  const pub = publicKey.export({ type: "spki", format: "pem" });
  const now = Date.now();
  const good = sign({ iss: "postkit", sub: "u1", dev: "d1", exp: Math.floor(now / 1000) + 3600 }, privateKey);
  assert.equal(licence.verifyToken(good, now, pub).sub, "u1");

  const expired = sign({ iss: "postkit", sub: "u1", dev: "d1", exp: Math.floor(now / 1000) - 1 }, privateKey);
  assert.equal(licence.verifyToken(expired, now, pub), null);

  const other = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" }).privateKey;
  assert.equal(licence.verifyToken(sign({ iss: "postkit", sub: "u1", exp: Math.floor(now / 1000) + 3600 }, other), now, pub), null);

  const [h, , s] = good.split(".");
  const tampered = `${h}.${Buffer.from(JSON.stringify({ iss: "postkit", sub: "attacker", exp: 9e9 })).toString("base64url")}.${s}`;
  assert.equal(licence.verifyToken(tampered, now, pub), null);
});

test("device id is stable and 64 hex characters", () => {
  assert.match(licence.deviceId(), /^[a-f0-9]{64}$/);
  assert.equal(licence.deviceId(), licence.deviceId());
});
