// Runs the real host.jsx against a small simulated Premiere timeline.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SRC = fs.readFileSync(path.join(__dirname, "../jsx/host.jsx"), "utf8");
const FPS = 25;

function makePremiere(trackSpecs) {
  class Time {
    constructor() { this.seconds = 0; }
    getFormatted() { return String(this.seconds); } // our fake razor parses seconds back
  }
  const t = (s) => { const x = new Time(); x.seconds = s; return x; };

  function makeClip(track, spec) {
    const clip = {
      name: spec.name || "clip",
      start: t(spec.start), end: t(spec.end), inPoint: t(spec.inPoint), outPoint: t(spec.inPoint + spec.end - spec.start),
      projectItem: { getMediaPath: () => spec.media || "/media/a.mov" },
      linkGroup: spec.link || null,
      selected: false,
      setSelected(v) { this.selected = v; },
      remove(ripple) {
        const i = track.items.indexOf(this);
        track.items.splice(i, 1);
        if (ripple) {
          const d = this.end.seconds - this.start.seconds;
          // Ripple shifts later clips on this track; on a LINKED clip Premiere also
          // slips the partner's source (the bug the panel avoids by unlinking).
          for (const c of track.items) if (c.start.seconds >= this.end.seconds - 1e-9) { c.start = t(c.start.seconds - d); c.end = t(c.end.seconds - d); }
          if (this.linkGroup) track.seq.slippedLinked = true;
        }
      },
      components: { numItems: 0 },
    };
    return clip;
  }

  function makeTrack(seq, specs) {
    const track = { seq, items: [] };
    track.items = specs.map((s) => makeClip(track, s));
    Object.defineProperty(track, "clips", {
      get() { const a = track.items.slice().sort((x, y) => x.start.seconds - y.start.seconds); a.numItems = a.length; return a; },
    });
    track.razor = (tc) => {
      const at = parseFloat(tc);
      const c = track.items.find((x) => x.start.seconds < at - 1e-9 && x.end.seconds > at + 1e-9);
      if (!c) return;
      const right = makeClip(track, { start: at, end: c.end.seconds, inPoint: c.inPoint.seconds + (at - c.start.seconds), link: c.linkGroup });
      c.end = t(at); c.outPoint = t(c.inPoint.seconds + (at - c.start.seconds));
      track.items.push(right);
    };
    return track;
  }

  const seq = { name: "Seq", sequenceID: "1", end: "0", slippedLinked: false };
  const v = trackSpecs.video.map((s) => makeTrack(seq, s));
  const a = trackSpecs.audio.map((s) => makeTrack(seq, s));
  seq.videoTracks = Object.assign(v.slice(), { numTracks: v.length });
  seq.audioTracks = Object.assign(a.slice(), { numTracks: a.length });
  seq.getSettings = () => ({ videoFrameRate: t(1 / FPS), videoDisplayFormat: 0, videoFrameWidth: 1080, videoFrameHeight: 1920 });
  const all = () => [...v, ...a].flatMap((tr) => tr.items);
  seq.getSelection = () => all().filter((c) => c.selected);
  seq.unlinkSelection = () => { for (const c of seq.getSelection()) c.linkGroup = null; };
  let linkId = 0;
  seq.linkSelection = () => { linkId++; for (const c of seq.getSelection()) c.linkGroup = "L" + linkId; };

  const qeSeq = { getAudioTrackAt: (i) => a[i], getVideoTrackAt: (i) => v[i] };
  const ctx = vm.createContext({
    app: { project: { activeSequence: seq }, enableQE() {}, version: "25.0" },
    qe: { project: { getActiveSequence: () => qeSeq } },
    Time,
    ProjectItemType: { BIN: 2 },
  });
  vm.runInContext(SRC, ctx);
  return { ctx, seq, v, a };
}

const snapshot = (track) =>
  track.clips.map((c) => [+c.start.seconds.toFixed(3), +c.end.seconds.toFixed(3), +c.inPoint.seconds.toFixed(3)]);

test("smart cut ripple-deletes the same ranges on audio and video and keeps them in sync", () => {
  const P = makePremiere({
    video: [[{ start: 0, end: 10, inPoint: 0, link: "L0" }]],
    audio: [[{ start: 0, end: 10, inPoint: 0, link: "L0" }]],
  });
  const res = JSON.parse(P.ctx.pk_cut(JSON.stringify([{ start: 2, end: 3 }, { start: 5, end: 6.5 }]), 0, 0));
  assert.equal(res.ok, true, res.error);
  assert.equal(res.cuts, 2);
  assert.equal(res.skipped, 0);
  assert.equal(res.removedSeconds, 2.5);
  const expected = [[0, 2, 0], [2, 4, 3], [4, 7.5, 6.5]];
  assert.deepEqual(snapshot(P.v[0]), expected);
  assert.deepEqual(snapshot(P.a[0]), expected); // same source in-points → in sync
  assert.equal(P.seq.slippedLinked, false, "clips must be unlinked before rippling");
  assert.equal(res.relinked, 3); // each pair linked back together
});

test("smart cut skips a range where the camera track has a gap, instead of desyncing", () => {
  const P = makePremiere({
    video: [[{ start: 0, end: 4, inPoint: 0 }, { start: 6, end: 10, inPoint: 6 }]],
    audio: [[{ start: 0, end: 10, inPoint: 0 }]],
  });
  const res = JSON.parse(P.ctx.pk_cut(JSON.stringify([{ start: 1, end: 2 }, { start: 4.5, end: 5.5 }]), 0, 0));
  assert.equal(res.ok, true, res.error);
  assert.equal(res.cuts, 1);
  assert.equal(res.skipped, 1);
});

test("audio-only cut works without a video track", () => {
  const P = makePremiere({ video: [[]], audio: [[{ start: 0, end: 6, inPoint: 1 }]] });
  const res = JSON.parse(P.ctx.pk_cut(JSON.stringify([{ start: 2, end: 3 }]), 0, -1));
  assert.equal(res.ok, true, res.error);
  assert.deepEqual(snapshot(P.a[0]), [[0, 2, 1], [2, 5, 4]]);
});

test("reads clips with their source ranges and returns valid JSON", () => {
  const P = makePremiere({ video: [[]], audio: [[{ start: 3, end: 5, inPoint: 10, media: '/Users/g/My "Reel".mov' }]] });
  const res = JSON.parse(P.ctx.pk_clips("audio", 0));
  assert.equal(res.ok, true, res.error);
  assert.deepEqual(res.clips[0], { name: "clip", mediaPath: '/Users/g/My "Reel".mov', start: 3, end: 5, inPoint: 10, outPoint: 12 });
});

test("errors come back as JSON, not exceptions", () => {
  const P = makePremiere({ video: [[]], audio: [[]] });
  P.ctx.app.project.activeSequence = null;
  assert.deepEqual(JSON.parse(P.ctx.pk_info()), { ok: false, error: "Open a sequence first." });
});
