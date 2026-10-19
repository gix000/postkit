// 1.0 libraries: edit maths, motion engine, templates, captions, validation, audio, looks, rendering.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const edl = require("../js/lib/edl");
const motion = require("../js/lib/motion");
const voice = require("../js/lib/voice");
const looks = require("../js/lib/looks");
const render = require("../js/lib/render");
const engine = require("../js/gfx/engine");
const templates = require("../js/gfx/templates");
const caps = require("../js/gfx/captionstyles");
const validate = require("../js/gfx/validate");

test("edit map: cut words drop out, later words move earlier, the hook shifts everything", () => {
  const words = [{ word: "a", start: 0, end: 0.5 }, { word: "b", start: 1, end: 1.5 }, { word: "c", start: 3, end: 3.5 }, { word: "d", start: 5, end: 5.5 }];
  const removed = [{ start: 0.9, end: 2 }, { start: 4, end: 4.5 }];
  const m = edl.mapWords(words, removed, null);
  assert.deepEqual(m.map((w) => [w.word, +w.start.toFixed(2)]), [["a", 0], ["c", 1.9], ["d", 3.4]]);
  // Hook copies "c" (edited 1.9–2.4) to 0:00.
  const withHook = edl.mapWords(words, removed, { start: 1.9, end: 2.4 });
  assert.deepEqual(withHook.map((w) => [w.word, +w.start.toFixed(2)]), [["c", 0], ["a", 0.5], ["c", 2.4], ["d", 3.9]]);
  const segs = edl.mapSegments([{ start: 0.5, end: 3.6, text: "x" }], removed, null);
  assert.equal(+segs[0].start.toFixed(2), 0.5);
  assert.equal(+segs[0].end.toFixed(2), 2.5);
});

test("engine: keyframes, eases, colours and right-to-left word order", () => {
  assert.equal(engine.sample([[0, 0], [1, 10, "linear"]], 0.5), 5);
  assert.equal(engine.sample([[0, 0, "linear"], [1, 10]], 0.25), 2.5);
  assert.equal(engine.ease("outBack")(1), 1);
  assert.ok(engine.ease([0.34, 1.56, 0.64, 1])(0.5) > 1, "overshoot goes past 1");
  assert.equal(engine.mix("#000000", "#ffffff", 0.5), "rgba(128,128,128,1)");
  const order = engine.visualOrder([{ text: "شو" }, { text: "silence" }, { text: "mode" }, { text: "هلق" }], "rtl").map((w) => w.text);
  assert.deepEqual(order, ["هلق", "silence", "mode", "شو"]);
});

test("every template builds a valid scene, and the gallery has 90+", () => {
  const list = templates.list();
  assert.ok(list.length >= 90, `${list.length} templates`);
  for (const t of list) {
    const s = templates.build(t.id, {});
    assert.ok(s.duration > 0 && Array.isArray(s.layers) && s.layers.length, t.id);
    assert.doesNotThrow(() => validate.scene(s), t.id);
  }
  assert.ok(list.filter((t) => t.cat === "Liquid glass").length >= 15);
});

test("caption styles: words are grouped with their timings and offset to the first word", () => {
  const words = "one two three four five".split(" ").map((w, i) => ({ word: w, start: 10 + i * 0.3, end: 10.25 + i * 0.3 }));
  const g = caps.groupWords(words, { maxWords: 2 });
  assert.deepEqual(g.map((x) => x.words.map((w) => w.t).join(" ")), ["one two", "three four", "five"]);
  const { scene, offset } = caps.build(g, { style: "glass" });
  assert.ok(Math.abs(offset - 9.95) < 1e-9);
  assert.ok(scene.layers.some((l) => l.type === "glass"));
  assert.ok(scene.layers.every((l) => l.start >= 0));
  assert.equal(caps.list().length, 16);
});

test("validation drops unknown layers and files, clamps sizes, keeps keyframes intact", () => {
  const s = validate.scene({ duration: 50, layers: [{ type: "image", src: "/etc/passwd" }, { type: "text", text: "Hi", size: 500, keys: { opacity: [[0, 0], [0.5, 1]] } }] });
  assert.equal(s.duration, 12);
  assert.equal(s.layers.length, 1);
  assert.equal(s.layers[0].size, 80);
  assert.deepEqual(s.layers[0].keys.opacity, [[0, 0], [0.5, 1]]);
  assert.throws(() => validate.scene({ layers: [] }));
});

test("ducking, multicam, curves and tracking", async () => {
  const keys = motion.duckKeys([{ start: 2, end: 4 }], { under: -20, between: -8, ramp: 0.25, start: 0, end: 10 });
  assert.deepEqual(keys.map((k) => [k.time, k.db]), [[0, -8], [1.75, -8], [2, -20], [4, -20], [4.25, -8]]);
  const env = (vals) => [{ start: 0, step: 0.1, values: vals }];
  const a = [], b = [];
  for (let i = 0; i < 80; i++) { a.push(i < 40 ? 100 : 3); b.push(i < 40 ? 3 : 100); }
  assert.deepEqual(motion.multicamPlan([env(a), env(b)], { from: 0, to: 8 }), [{ start: 0, end: 4, cam: 0 }, { start: 4, end: 8, cam: 1 }]);
  const baked = motion.bake([{ time: 0, value: 0 }, { time: 1, value: 10 }], "easeOut", { fps: 10 });
  assert.equal(baked.length, 11);
  assert.ok(baked[3].value > 5, "ease out is ahead early");
  const W = 120, H = 80;
  async function* frames() {
    for (let i = 0; i < 12; i++) {
      const g = new Float32Array(W * H);
      for (let k = 0; k < g.length; k++) g[k] = (k * 7919) % 31;
      for (let y = 20; y < 36; y++) for (let x = 10 + i * 4; x < 26 + i * 4; x++) g[y * W + x] = 240;
      yield g;
    }
  }
  const pts = await motion.track(frames(), W, H, { x: 8, y: 18, w: 20, h: 20 });
  assert.equal(Math.round(pts[11].x - pts[0].x), 44);
});

test("voice chain ends at the platform loudness; looks have previews", () => {
  const c = voice.chain("clear", { noise: -40 }, "podcast");
  assert.match(c[c.length - 1], /^loudnorm=I=-16/);
  assert.ok(c.some((f) => f.startsWith("afftdn=nr=14")), "noisy recordings get stronger noise reduction");
  assert.ok(voice.findings({ lufs: -25, noise: -40, peak: -0.2, lra: 14 }).length === 4);
  for (const l of looks.list()) assert.ok(looks.previewFilter(l.id).length > 5, l.id);
});

const hasFfmpeg = (() => { try { execFileSync("ffmpeg", ["-version"], { stdio: "ignore" }); return true; } catch (e) { return false; } })();
test("renders frames to ProRes 4444 with alpha, and reads footage for glass", { skip: !hasFfmpeg }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pk-r-"));
  const out = path.join(dir, "o.mov");
  const W = 64, H = 112;
  const buf = new Uint8ClampedArray(W * H * 4);
  await render.encode("ffmpeg", { width: W, height: H, fps: 25, frames: 10, out, drawFrame: (i) => { buf.fill(0); for (let k = 0; k < 200; k++) { buf[k * 4] = 255; buf[k * 4 + 3] = 255; } return buf; } });
  const probe = execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_name,pix_fmt,nb_frames", "-of", "csv=p=0", out]).toString().trim();
  assert.match(probe, /^prores,yuva444p/);
  assert.match(probe, /,10$/);
  const src = path.join(dir, "src.mp4");
  execFileSync("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "testsrc2=s=160x284:d=2:r=25", "-pix_fmt", "yuv420p", src]);
  const bd = new render.Backdrop("ffmpeg", [{ seqStart: 1, seqEnd: 2, mediaPath: src, inPoint: 0.5 }], { width: 16, height: 28, fps: 25 });
  assert.equal(await bd.frameAt(0.5), null, "nothing under the graphic before the clip");
  const f = await bd.frameAt(1.2);
  assert.equal(f.length, 16 * 28 * 4);
  bd.close();
  fs.rmSync(dir, { recursive: true, force: true });
});
