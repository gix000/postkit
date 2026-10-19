const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const beats = require("../js/lib/beats");
const chapters = require("../js/lib/chapters");
const presets = require("../js/lib/presets");
const cleanup = require("../js/lib/cleanup");
const library = require("../js/lib/library");
const safezones = require("../js/lib/safezones");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pk-b2-"));

test("finds beats in a 120 BPM click track, in sequence time", async () => {
  const file = path.join(tmp, "clicks.wav");
  // A short 880 Hz burst every 0.5 s over a quiet pad, 8 seconds.
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i",
    "aevalsrc='0.05*sin(2*PI*110*t)+if(lt(mod(t\\,0.5)\\,0.04)\\,0.8*sin(2*PI*880*t)\\,0)':s=44100:d=8", "-y", file]);
  // Clip uses source 1s–7s and sits at 20s on the timeline.
  const found = await beats.forClip("ffmpeg", { mediaPath: file, inPoint: 1, outPoint: 7, start: 20 }, { sensitivity: 1 });
  assert.ok(found.length >= 10 && found.length <= 13, `found ${found.length} beats`);
  for (const t of found) {
    const phase = (t - 20 + 1) % 0.5; // source time modulo the beat
    assert.ok(phase < 0.06 || phase > 0.47, `beat at ${t.toFixed(3)} is off the grid`);
  }
});

const words = [
  { word: "Today", start: 0, end: 0.3 }, { word: "we", start: 0.3, end: 0.4 }, { word: "edit", start: 0.4, end: 0.7 },
  { word: "the", start: 0.7, end: 0.8 }, { word: "Reel.", start: 0.8, end: 1.2 },
  { word: "هيدا", start: 2, end: 2.4 }, { word: "الـreel", start: 2.4, end: 2.9 }, { word: "حلو", start: 2.9, end: 3.2 },
];

test("search finds words and phrases, ignoring case, punctuation and Arabic diacritics", () => {
  assert.deepEqual(search("reel").map((h) => h.time), [0.8]);
  assert.equal(search("the reel")[0].time, 0.7);
  assert.equal(search("هيدا")[0].time, 2);
  assert.equal(chapters.search(words, "حُلو")[0].time, 2.9); // diacritic in the query
  function search(q) { return chapters.search(words, q); }
});

test("chapters start at 0:00, split at the longest pauses and format for YouTube", () => {
  const segs = [];
  for (let i = 0; i < 30; i++) segs.push({ text: `Sentence number ${i} about topic ${Math.floor(i / 10)}.`, start: i * 10, end: i * 10 + 8 });
  segs[10].start += 3; segs[20].start += 3; // longer pauses before topic changes
  const list = chapters.chapters(segs, { minLength: 45 });
  assert.equal(list[0].time, 0);
  assert.ok(list.some((c) => c.time === segs[10].start) && list.some((c) => c.time === segs[20].start));
  for (let i = 1; i < list.length; i++) assert.ok(list[i].time - list[i - 1].time >= 45);
  assert.match(chapters.toYouTube(list), /^0:00 Sentence number 0 about topic 0\n/);
  assert.equal(chapters.stamp(3725), "1:02:05");
});

test("motion presets land inside the clip, scaled by strength", () => {
  const clip = { start: 10, end: 14 };
  const pop = presets.plan("pop-in", clip, { strength: "strong", fps: 25 });
  assert.equal(pop.scale[0].time, 10);
  assert.equal(pop.scale[0].value, 52); // 100 - 30 × 1.6
  assert.equal(pop.scale.at(-1).value, 100);
  const out = presets.plan("fade-out", clip, { fps: 25 });
  assert.ok(out.opacity[0].time >= 13.5 && out.opacity.at(-1).time < 14);
  const whole = presets.plan("zoom-in", clip, { strength: "subtle" });
  assert.equal(whole.scale.at(-1).value, 105);
  assert.equal(presets.list().length, 11);
});

test("project cleanup files only loose items, by type", () => {
  const moves = cleanup.plan([
    { nodeId: "1", name: "A001.mov", path: "/v/A001.mov", bin: "" },
    { nodeId: "2", name: "voice.wav", path: "/a/voice.wav", bin: "" },
    { nodeId: "3", name: "Reel 14", isSequence: true, bin: "" },
    { nodeId: "4", name: "logo.png", path: "/i/logo.png", bin: "Brand" }, // in the editor's own bin: leave
    { nodeId: "5", name: "Title", path: "", bin: "" },
    { nodeId: "6", name: "B.mov", path: "/v/B.mov", bin: "Video" }, // already filed
  ]);
  assert.deepEqual(moves.map((m) => [m.nodeId, m.to]), [["1", "Video"], ["2", "Audio"], ["3", "Sequences"], ["5", "Graphics"]]);
  assert.deepEqual(cleanup.summary(moves), ["1 → Video", "1 → Audio", "1 → Sequences", "1 → Graphics"]);
});

test("library scans folders and files items by folder name and type", () => {
  const root = path.join(tmp, "lib");
  for (const [p, body] of [["SFX/whoosh 1.wav", ""], ["Transitions/glitch.mov", ""], ["Light Leaks/leak.mp4", ""], ["misc/ding.mp3", ""], ["misc/notes.txt", ""], [".hidden/x.wav", ""]]) {
    fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true });
    fs.writeFileSync(path.join(root, p), body);
  }
  const items = library.scan([root]);
  const byName = Object.fromEntries(items.map((i) => [i.name, i.category]));
  assert.deepEqual(byName, { ding: "Sound effects", glitch: "Transitions", leak: "Overlays", "whoosh 1": "Sound effects" });
  assert.equal(library.filter(items, { query: "WHOO" }).length, 1);
  assert.equal(library.filter(items, { category: "Transitions" })[0].name, "glitch");
});

test("safe zones map onto vertical and horizontal frames", () => {
  const v = safezones.forFrame("tiktok", 1080, 1920);
  const side = v.find((a) => a.label.startsWith("Like"));
  assert.ok(Math.abs(side.x - 928.8) < 0.5 && Math.abs(side.w - 151.2) < 0.5);
  const h = safezones.forFrame("shorts", 1920, 1080); // 16:9 frame: the 9:16 box is centred
  const top = h.find((a) => a.label === "Top bar");
  assert.ok(Math.abs(top.x - (1920 - 607.5) / 2) < 0.5 && Math.abs(top.w - 607.5) < 0.5);
  assert.equal(safezones.platforms().length, 3);
});
