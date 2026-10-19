// 1.1 host functions: sequence from files, reframe, montage assembly.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SRC = fs.readFileSync(path.join(__dirname, "../jsx/host.jsx"), "utf8");
class Time { constructor() { this.seconds = 0; } getFormatted() { return String(this.seconds); } }
const T = (s) => { const t = new Time(); t.seconds = s; return t; };
const list = (a) => Object.assign(a, { numItems: a.length });
const param = (displayName, value) => ({ displayName, value, setValue(v) { this.value = v; } });

function premiere() {
  const items = [];
  const projectItem = (file) => ({ name: path.basename(file), type: 1, nodeId: file, dur: 10, getMediaPath: () => file, ins: null, outs: null, setInPoint(s) { this.ins = s; }, setOutPoint(s) { this.outs = s; }, clearInPoint() { this.cleared = true; }, clearOutPoint() {} });
  const mkClip = (track, item, start, dur) => ({
    name: item.name, start: T(start), end: T(start + dur), inPoint: T(item.ins || 0), projectItem: item, removed: false,
    components: list(track.type === "video" ? [{ matchName: "AE.ADBE Motion", displayName: "Motion", properties: list([param("Position", [0.5, 0.5]), param("Scale", 100)]) }] : [{ displayName: "Volume", properties: list([param("Bypass"), param("Level", 0.17)]) }]),
    remove() { track.items.splice(track.items.indexOf(this), 1); },
  });
  const mkTrack = (type) => {
    const tr = { type, items: [] };
    Object.defineProperty(tr, "clips", { get: () => list(tr.items.slice().sort((a, b) => a.start.seconds - b.start.seconds)) });
    tr.overwriteClip = (item, at) => {
      const s = typeof at === "number" ? at : at.seconds;
      const dur = item.outs !== null && item.outs !== undefined ? item.outs - (item.ins || 0) : item.dur;
      tr.items.push(mkClip(tr, item, s, dur));
    };
    return tr;
  };
  const sequences = [];
  const bin = (name) => { const b = { name, type: 2, items: [], get children() { return list(b.items.slice()); }, createBin(n) { const c = bin(n); b.items.push(c); return c; } }; return b; };
  const root = bin("root");
  const project = {
    rootItem: root, activeSequence: null,
    getInsertionBin: () => root,
    importFiles(paths, a, bin) { const it = projectItem(paths[0]); bin.items.push(it); items.push(it); return true; },
    createNewSequenceFromClips(name, its) {
      const v = [mkTrack("video")], a = [mkTrack("audio")];
      let t = 0;
      for (const it of its) { v[0].items.push(mkClip(v[0], it, t, it.dur)); a[0].items.push(mkClip(a[0], it, t, it.dur)); t += it.dur; }
      const settings = { videoFrameWidth: 1920, videoFrameHeight: 1080, videoFrameRate: T(1 / 25), videoDisplayFormat: 0 };
      const seq = { name, sequenceID: "s" + sequences.length, videoTracks: Object.assign(v, { numTracks: 1 }), audioTracks: Object.assign(a, { numTracks: 1 }), getSettings: () => ({ ...settings }), setSettings(s) { Object.assign(settings, s); }, settings };
      sequences.push(seq);
      return seq;
    },
    openSequence(id) { project.activeSequence = sequences.find((s) => s.sequenceID === id); },
  };
  const ctx = vm.createContext({ app: { project, enableQE() {} }, Time, ProjectItemType: { BIN: 2 } });
  vm.runInContext(SRC, ctx);
  return { ctx, project, sequences };
}
const call = (P, fn, ...a) => { const r = JSON.parse(P.ctx[fn](...a)); assert.equal(r.ok, true, r.error); return r; };

test("makes a vertical sequence from files, in order, in the PostKit bin", () => {
  const P = premiere();
  const r = call(P, "pk_newSequence", "Trip — PostKit", JSON.stringify(["/v/a.mp4", "/v/b.mp4"]), 1080, 1920, false);
  assert.equal(r.resized, true);
  const seq = P.project.activeSequence;
  assert.equal(seq.name, "Trip — PostKit");
  assert.deepEqual([seq.settings.videoFrameWidth, seq.settings.videoFrameHeight], [1080, 1920]);
  assert.deepEqual(seq.videoTracks[0].clips.map((c) => [c.name, c.start.seconds]), [["a.mp4", 0], ["b.mp4", 10]]);
  const pk = P.project.rootItem.items.find((b) => b.name === "PostKit");
  assert.ok(pk.items.some((b) => b.name === "Footage" && b.items.length === 2));
  // Reframe: fill 9:16 with 16:9 footage.
  call(P, "pk_scaleClips", 0, JSON.stringify({ "/v/a.mp4": 177.78, "/v/b.mp4": 177.78 }));
  assert.ok(seq.videoTracks[0].clips.every((c) => c.components[0].properties[1].value === 177.78));
});

test("an empty montage sequence gets pieces laid end to end, scaled, with source in/out cleared", () => {
  const P = premiere();
  call(P, "pk_newSequence", "Trip — Montage", JSON.stringify(["/v/a.mp4"]), 1080, 1920, true);
  const seq = P.project.activeSequence;
  assert.equal(seq.videoTracks[0].clips.length, 0);
  assert.equal(seq.audioTracks[0].clips.length, 0);
  const r = call(P, "pk_assemble", JSON.stringify([{ path: "/v/a.mp4", srcIn: 2, srcOut: 3.5, at: 0, scale: 177.78 }, { path: "/v/b.mp4", srcIn: 0.5, srcOut: 1.5, at: 1.5, scale: 120 }]), 0, 0, false);
  assert.equal(r.placed, 2);
  assert.deepEqual(seq.videoTracks[0].clips.map((c) => [c.name, c.start.seconds, +c.end.seconds.toFixed(2), c.components[0].properties[1].value]), [["a.mp4", 0, 1.5, 177.78], ["b.mp4", 1.5, 2.5, 120]]);
  assert.equal(seq.audioTracks[0].clips.length, 0, "clip sound stays off unless asked");
  call(P, "pk_assemble", JSON.stringify([{ path: "/v/a.mp4", srcIn: 5, srcOut: 6, at: 2.5 }]), 0, 0, true);
  assert.equal(seq.audioTracks[0].clips.length, 1);
});
