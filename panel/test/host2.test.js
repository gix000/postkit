// Batch 2 host functions against a simulated Premiere project.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SRC = fs.readFileSync(path.join(__dirname, "../jsx/host.jsx"), "utf8");
const BIN = 2;

function item(name, opts = {}) {
  return { name, nodeId: opts.id || name, type: 1, getMediaPath: () => opts.path || "", isSequence: () => !!opts.seq, moveBin(bin) { this._movedTo = bin.name; } };
}
function bin(name, children = []) {
  const b = {
    name, type: BIN, nodeId: "bin-" + name, items: children,
    get children() { const a = b.items.slice(); a.numItems = a.length; return a; },
    createBin(n) { const nb = bin(n); b.items.push(nb); return nb; },
  };
  return b;
}
function param(displayName) {
  return { displayName, keys: [], tv: false, setTimeVarying(v) { this.tv = v; }, addKey(t) { this.keys.push({ t }); }, setValueAtKey(t, v) { this.keys.find((k) => k.t === t).v = v; } };
}
function clip(mediaType, start, end, inPoint) {
  const motion = { matchName: "AE.ADBE Motion", properties: Object.assign([param("Position"), param("Scale"), param("Scale Width"), param("Uniform Scale"), param("Rotation")], { numItems: 5 }) };
  const opacity = { matchName: "AE.ADBE Opacity", properties: Object.assign([param("Opacity")], { numItems: 1 }) };
  return { mediaType, name: "c", start: { seconds: start }, end: { seconds: end }, inPoint: { seconds: inPoint }, components: Object.assign([motion, opacity], { numItems: 2 }), motion, opacity };
}

function load({ root, selection = [], playhead = 0 } = {}) {
  const markers = [];
  const placed = [];
  const track = { overwriteClip(it, at) { placed.push({ name: it.name, at: at.seconds }); } };
  const seq = {
    markers: { createMarker(t) { const m = { time: t, setColorByIndex(i) { this.color = i; } }; markers.push(m); return m; } },
    getSelection: () => selection,
    getPlayerPosition: () => ({ seconds: playhead }),
    setPlayerPosition(ticks) { this.pos = ticks; },
    videoTracks: Object.assign([track], { numTracks: 1 }),
    audioTracks: Object.assign([track], { numTracks: 1 }),
  };
  const project = {
    activeSequence: seq,
    rootItem: root || bin("root"),
    getInsertionBin() { return this.rootItem; },
    importFiles(paths) { this.rootItem.items.push(item(path.basename(paths[0]), { path: paths[0] })); return true; },
  };
  const ctx = vm.createContext({ app: { project, enableQE() {} }, ProjectItemType: { BIN }, File: function () { this.exists = true; } });
  vm.runInContext(SRC, ctx);
  return { ctx, seq, markers, placed, project };
}
const call = (ctx, fn, ...args) => JSON.parse(ctx[fn](...args));

test("adds named, coloured markers and moves the playhead", () => {
  const P = load();
  const r = call(P.ctx, "pk_markers", JSON.stringify([{ time: 1.5, name: "Intro", color: 3 }, { time: 9, name: "Beat" }]));
  assert.equal(r.ok, true, r.error);
  assert.deepEqual(P.markers.map((m) => [m.time, m.name, m.color]), [[1.5, "Intro", 3], [9, "Beat", undefined]]);
  call(P.ctx, "pk_seek", 2);
  assert.equal(P.seq.pos, String(2 * 254016000000));
});

test("lists project items with their bins and files loose ones into type bins", () => {
  const root = bin("root", [item("A.mov", { path: "/A.mov" }), item("Seq", { seq: true }), bin("Brand", [item("logo.png", { path: "/logo.png" })])]);
  const P = load({ root });
  const list = call(P.ctx, "pk_projectItems");
  assert.equal(list.ok, true, list.error);
  assert.deepEqual(list.items.map((i) => [i.name, i.bin, i.isSequence]), [["A.mov", "", false], ["Seq", "", true], ["logo.png", "Brand", false]]);
  const r = call(P.ctx, "pk_cleanup", JSON.stringify([{ nodeId: "A.mov", to: "Video" }, { nodeId: "Seq", to: "Sequences" }]));
  assert.equal(r.moved, 2);
  assert.equal(root.items[0]._movedTo, "Video");
  assert.ok(root.items.some((b) => b.type === BIN && b.name === "Sequences"));
});

test("applies preset keyframes to selected video clips in media time, ignoring audio", () => {
  const v = clip("Video", 10, 14, 3); // clip at 10s on the timeline uses source from 3s
  const a = clip("Audio", 10, 14, 3);
  const P = load({ selection: [a, v] });
  const sel = call(P.ctx, "pk_selectedClips");
  assert.deepEqual(sel.clips, [{ name: "c", start: 10, end: 14 }]);
  const plan = { scale: [{ time: 10, value: 70 }, { time: 10.4, value: 100 }], position: [{ time: 10, value: [0.5, 0.7] }], opacity: [{ time: 13.6, value: 100 }, { time: 14, value: 0 }] };
  const r = call(P.ctx, "pk_applyKeys", JSON.stringify([plan]));
  assert.equal(r.ok, true, r.error);
  assert.equal(r.keys, 5);
  const scale = v.motion.properties[1];
  assert.equal(scale.tv, true);
  assert.deepEqual(scale.keys.map((k) => [+k.t.toFixed(3), k.v]), [[3, 70], [3.4, 100]]); // media time
  assert.deepEqual(Array.from(v.motion.properties[0].keys[0].v), [0.5, 0.7]);
  assert.equal(v.opacity.properties[0].keys.length, 2);
  assert.equal(a.motion.properties[1].keys.length, 0);
});

test("imports a library file once and drops it at the playhead", () => {
  const P = load({ playhead: 12.5 });
  const r1 = call(P.ctx, "pk_insertFile", "/lib/whoosh.wav", "audio", 0);
  const r2 = call(P.ctx, "pk_insertFile", "/lib/whoosh.wav", "audio", 0);
  assert.equal(r1.ok && r2.ok, true, r1.error || r2.error);
  assert.equal(P.project.rootItem.items.length, 1); // reused, not imported twice
  assert.deepEqual(P.placed, [{ name: "whoosh.wav", at: 12.5 }, { name: "whoosh.wav", at: 12.5 }]);
});
