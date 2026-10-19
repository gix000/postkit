// 1.0 host functions against a simulated Premiere: placement, looks, hook, audio, multicam, keys.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SRC = fs.readFileSync(path.join(__dirname, "../jsx/host.jsx"), "utf8");
const BIN = 2;
const FPS = 25;

class Time {
  constructor() { this.seconds = 0; }
  getFormatted() { return String(this.seconds); }
}
const T = (s) => { const t = new Time(); t.seconds = s; return t; };

function param(displayName, value) {
  return {
    displayName, value, keys: [], tv: false,
    setTimeVarying(v) { this.tv = v; if (!v) this.keys = []; },
    isTimeVarying() { return this.tv; },
    setValue(v) { this.value = v; },
    addKey(t) { if (!this.keys.some((k) => Math.abs(k.t - t) < 1e-9)) this.keys.push({ t }); this.keys.sort((a, b) => a.t - b.t); },
    setValueAtKey(t, v) { this.keys.find((k) => Math.abs(k.t - t) < 1e-9).v = v; },
    getKeys() { return this.keys.map((k) => T(k.t)); },
    getValueAtKey(t) { return this.keys.find((k) => Math.abs(k.t - t.seconds) < 1e-9).v; },
    removeKeyRange(a, b) { this.keys = this.keys.filter((k) => k.t < a || k.t > b); },
  };
}
const list = (arr) => Object.assign(arr, { numItems: arr.length });

function projectItem(file, id) {
  return { name: path.basename(file), nodeId: id || file, type: 1, getMediaPath: () => file, ins: [], setInPoint(s, m) { this.ins.push(["in", s, m]); }, setOutPoint(s, m) { this.ins.push(["out", s, m]); }, clearInPoint() { this.ins.push(["clear"]); }, clearOutPoint() {} };
}

function makeClip(track, spec) {
  const comps = [];
  if (track.type === "video") {
    comps.push({ matchName: "AE.ADBE Motion", displayName: "Motion", properties: list([param("Position", [0.5, 0.5]), param("Scale", 100), param("Scale Width", 100), param("Uniform Scale", true), param("Rotation", 0)]) });
    comps.push({ matchName: "AE.ADBE Opacity", displayName: "Opacity", properties: list([param("Opacity", 100)]) });
  } else {
    comps.push({ matchName: "Audio Levels", displayName: "Volume", properties: list([param("Bypass", false), param("Level", 0.1778)]) });
  }
  return {
    name: spec.name || "clip", mediaType: track.type === "video" ? "Video" : "Audio",
    start: T(spec.start), end: T(spec.end), inPoint: T(spec.inPoint || 0),
    projectItem: spec.item || projectItem(spec.media || "/media/cam.mov"),
    components: list(comps), disabled: false, selected: !!spec.selected,
  };
}

function makePremiere({ video = [[]], audio = [[]], root } = {}) {
  const seq = { name: "Seq", sequenceID: "1", inserted: [] };
  const mkTrack = (type, specs) => {
    const tr = { type, items: [] };
    tr.items = specs.map((s) => makeClip(tr, s));
    Object.defineProperty(tr, "clips", { get() { return list(tr.items.slice().sort((a, b) => a.start.seconds - b.start.seconds)); } });
    tr.overwriteClip = (item, at) => {
      const s = typeof at === "number" ? at : at.seconds;
      const dur = item.dur || 2;
      tr.items = tr.items.filter((c) => !(c.start.seconds < s + dur && c.end.seconds > s));
      tr.items.push(makeClip(tr, { start: s, end: s + dur, item }));
    };
    tr.razor = (tc) => {
      const at = parseFloat(tc);
      const c = tr.items.find((x) => x.start.seconds < at - 1e-9 && x.end.seconds > at + 1e-9);
      if (!c) return;
      const right = makeClip(tr, { start: at, end: c.end.seconds, inPoint: c.inPoint.seconds + (at - c.start.seconds), item: c.projectItem });
      c.end = T(at);
      tr.items.push(right);
    };
    tr.setMute = (v) => { tr.muted = v; };
    return tr;
  };
  let v = video.map((s) => mkTrack("video", s));
  let a = audio.map((s) => mkTrack("audio", s));
  const sync = () => {
    seq.videoTracks = Object.assign(v.slice(), { numTracks: v.length });
    seq.audioTracks = Object.assign(a.slice(), { numTracks: a.length });
  };
  sync();
  seq.getSettings = () => ({ videoFrameRate: T(1 / FPS), videoDisplayFormat: 0 });
  seq.getSelection = () => [...v, ...a].flatMap((t) => t.items).filter((c) => c.selected);
  seq.insertClip = (item, at, vi, ai) => {
    seq.inserted.push({ item: item.name, at: at.seconds, vi, ai, ins: item.ins.slice() });
  };

  const fx = { name: "Lumetri Color" };
  const qeTrack = (tr) => ({
    get numItems() { return tr.clips.length; },
    getItemAt(i) {
      const c = tr.clips[i];
      return { type: "Clip", name: c.name, addVideoEffect(e) { c.components.push({ displayName: e.name, matchName: "AE.ADBE Lumetri", properties: list([param("Temperature", 0), param("Exposure", 0), param("Contrast", 0), param("Saturation", 100), param("Saturation", 100), param("Vibrance", 0)]) }); c.components.numItems = c.components.length; } };
    },
    razor: (tc) => tr.razor(tc),
  });
  const qeSeq = {
    getVideoTrackAt: (i) => qeTrack(v[i]),
    getAudioTrackAt: (i) => qeTrack(a[i]),
    addTracks(nv, afterV, na) { for (let i = 0; i < nv; i++) v.push(mkTrack("video", [])); for (let i = 0; i < (na || 0); i++) a.push(mkTrack("audio", [])); sync(); },
  };

  const rootBin = root || bin("root");
  const project = {
    activeSequence: seq, rootItem: rootBin,
    getInsertionBin() { return rootBin; },
    importFiles(paths, _a, target) { const it = projectItem(paths[0]); it.dur = 3; target.items.push(it); return true; },
  };
  const ctx = vm.createContext({
    app: { project, enableQE() {} },
    qe: { project: { getActiveSequence: () => qeSeq, getVideoEffectByName: (n) => (n === "Lumetri Color" ? fx : null) } },
    Time, ProjectItemType: { BIN },
  });
  vm.runInContext(SRC, ctx);
  return { ctx, seq, get v() { return v; }, get a() { return a; }, root: rootBin };
}
function bin(name, children = []) {
  const b = { name, type: BIN, items: children, get children() { return list(b.items.slice()); }, createBin(n) { const nb = bin(n); b.items.push(nb); return nb; } };
  return b;
}
const call = (P, fn, ...args) => {
  const r = JSON.parse(P.ctx[fn](...args));
  assert.equal(r.ok, true, r.error);
  return r;
};

test("places a graphic above every busy track, adding a track when none is free", () => {
  const P = makePremiere({ video: [[{ start: 0, end: 10 }], [{ start: 2, end: 4 }]], audio: [[{ start: 0, end: 10 }]] });
  const r = call(P, "pk_place", JSON.stringify([{ path: "/tmp/title.mov", start: 3, dur: 2, type: "video" }]));
  assert.equal(r.placed[0].track, 2); // V1 and V2 are busy at 3s → new V3
  assert.equal(P.v.length, 3);
  assert.equal(P.v[2].clips[0].start.seconds, 3);
  // Imported into PostKit / Graphics, once.
  const pk = P.root.items.find((b) => b.name === "PostKit");
  assert.ok(pk.items.find((b) => b.name === "Graphics").items.some((i) => i.getMediaPath() === "/tmp/title.mov"));
  call(P, "pk_place", JSON.stringify([{ path: "/tmp/title.mov", start: 6, dur: 2, type: "video" }]));
  assert.equal(P.v.length, 3, "V2 is free at 6s but graphics still go on top of V1 only when V2 is free → V2");
});

test("places sounds on the first free audio track and sets their level in dB", () => {
  const P = makePremiere({ video: [[]], audio: [[{ start: 0, end: 10 }], []] });
  const r = call(P, "pk_place", JSON.stringify([{ path: "/sfx/pop.wav", start: 1, dur: 0.5, type: "audio", gainDb: -6, from: 1 }, { path: "/sfx/pop.wav", start: 1.2, dur: 0.5, type: "audio", from: 1 }]));
  assert.deepEqual(r.placed.map((p) => p.track), [1, 2]); // the second overlaps the first → new track
  const lvl = P.a[1].clips[0].components[0].properties[1].value;
  assert.ok(Math.abs(lvl - Math.pow(10, (-6 - 15) / 20)) < 1e-9);
});

test("applies a Lumetri look to every camera clip, adding the effect once", () => {
  const P = makePremiere({ video: [[{ start: 0, end: 3 }, { start: 3, end: 6 }]] });
  call(P, "pk_look", JSON.stringify({ Exposure: 0.3, Contrast: 12, Saturation: 115, Vibrance: 10 }), 0);
  call(P, "pk_look", JSON.stringify({ Exposure: 0.1 }), 0);
  for (const c of P.v[0].clips) {
    const l = c.components.filter((x) => x.displayName === "Lumetri Color");
    assert.equal(l.length, 1);
    const props = l[0].properties;
    assert.equal(props[1].value, 0.1);
    assert.equal(props[2].value, 12);
    assert.equal(props[3].value, 115); // Basic Saturation…
    assert.equal(props[4].value, 100); // …not the Creative one
  }
});

test("inserts the hook from the clip's source range at 0:00 and clears the in/out after", () => {
  const P = makePremiere({ video: [[{ start: 0, end: 20, inPoint: 5 }]], audio: [[{ start: 0, end: 20, inPoint: 5 }]] });
  const r = call(P, "pk_hook", 8, 11, 0, 0);
  assert.equal(r.seconds, 3);
  const ins = P.seq.inserted[0];
  assert.equal(ins.at, 0);
  assert.deepEqual(ins.ins.slice(0, 2), [["in", 13, 4], ["out", 16, 4]]);
});

test("writes ducking keyframes in each clip's media time", () => {
  const P = makePremiere({ audio: [[]], video: [[]] });
  P.a[0].items.push(makeClip(P.a[0], { start: 10, end: 20, inPoint: 2 }));
  const r = call(P, "pk_volumeKeys", 0, JSON.stringify([{ time: 9, db: -20 }, { time: 11, db: -20 }, { time: 12, db: -8 }]));
  assert.equal(r.keys, 2);
  const keys = P.a[0].clips[0].components[0].properties[1].keys;
  assert.deepEqual(keys.map((k) => k.t), [3, 4]);
});

test("multicam disables the cameras above the one that should show", () => {
  const P = makePremiere({ video: [[{ start: 0, end: 10 }], [{ start: 0, end: 10 }]] });
  call(P, "pk_multicam", JSON.stringify([0, 1]), JSON.stringify([{ start: 0, end: 4, cam: 1 }, { start: 4, end: 7, cam: 0 }, { start: 7, end: 10, cam: 1 }]));
  const top = P.v[1].clips.map((c) => [c.start.seconds, c.end.seconds, c.disabled]);
  assert.deepEqual(top, [[0, 4, false], [4, 7, true], [7, 10, false]]);
  assert.ok(P.v[0].clips.every((c) => !c.disabled));
});

test("reads and replaces keyframes on the selected clip", () => {
  const P = makePremiere({ video: [[{ start: 10, end: 14, inPoint: 2, selected: true }]] });
  call(P, "pk_setKeys", "scale", JSON.stringify([{ time: 10, value: 100 }, { time: 11, value: 120 }]));
  const r = call(P, "pk_selectedKeys");
  assert.deepEqual(r.params.scale, [{ time: 10, value: 100 }, { time: 11, value: 120 }]);
  call(P, "pk_setKeys", "scale", JSON.stringify([{ time: 10, value: 100 }, { time: 10.5, value: 110 }, { time: 11, value: 120 }]));
  assert.equal(call(P, "pk_selectedKeys").params.scale.length, 3);
});

