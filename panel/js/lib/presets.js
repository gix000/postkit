// Motion presets as keyframe plans. Times are seconds from the clip's start
// ("in" presets) or before its end ("out" presets). Values follow Premiere's
// Motion and Opacity effects: Scale in %, Position normalised 0–1, Rotation in degrees.

const STRENGTH = { subtle: 0.5, medium: 1, strong: 1.6 };

const PRESETS = {
  "pop-in": { name: "Pop in", at: "in", dur: 0.35, keys: (s) => ({ scale: [[0, 100 - 30 * s], [0.6, 100 + 6 * s], [1, 100]], opacity: [[0, 0], [0.4, 100]] }) },
  "zoom-in": { name: "Slow zoom in", at: "whole", keys: (s) => ({ scale: [[0, 100], [1, 100 + 10 * s]] }) },
  "zoom-out": { name: "Slow zoom out", at: "whole", keys: (s) => ({ scale: [[0, 100 + 10 * s], [1, 100]] }) },
  "punch": { name: "Punch in", at: "in", dur: 0.12, keys: (s) => ({ scale: [[0, 100], [1, 100 + 15 * s]] }) },
  "slide-up": { name: "Slide up", at: "in", dur: 0.4, keys: (s) => ({ position: [[0, [0.5, 0.5 + 0.25 * s]], [1, [0.5, 0.5]]], opacity: [[0, 0], [0.5, 100]] }) },
  "slide-left": { name: "Slide in from right", at: "in", dur: 0.4, keys: (s) => ({ position: [[0, [0.5 + 0.4 * s, 0.5]], [1, [0.5, 0.5]]] }) },
  "spin-in": { name: "Spin in", at: "in", dur: 0.45, keys: (s) => ({ rotation: [[0, -25 * s], [1, 0]], scale: [[0, 100 - 25 * s], [1, 100]], opacity: [[0, 0], [0.5, 100]] }) },
  "shake": { name: "Shake", at: "in", dur: 0.4, keys: (s) => ({ position: [[0, [0.5, 0.5]], [0.2, [0.5 + 0.012 * s, 0.5 - 0.008 * s]], [0.4, [0.5 - 0.012 * s, 0.5 + 0.006 * s]], [0.6, [0.5 + 0.008 * s, 0.5 + 0.008 * s]], [0.8, [0.5 - 0.006 * s, 0.5 - 0.004 * s]], [1, [0.5, 0.5]]] }) },
  "fade-in": { name: "Fade in", at: "in", dur: 0.4, keys: () => ({ opacity: [[0, 0], [1, 100]] }) },
  "fade-out": { name: "Fade out", at: "out", dur: 0.4, keys: () => ({ opacity: [[0, 100], [1, 0]] }) },
  "drop-out": { name: "Drop out", at: "out", dur: 0.35, keys: (s) => ({ position: [[0, [0.5, 0.5]], [1, [0.5, 0.5 + 0.3 * s]]], opacity: [[0, 100], [1, 0]] }) },
  "slam": { name: "Slam in", at: "in", dur: 0.3, keys: (s) => ({ scale: [[0, 100 + 60 * s], [0.55, 100 - 3 * s], [0.75, 100 + 2 * s], [1, 100]], position: [[0.55, [0.5, 0.5]], [0.65, [0.5 + 0.01 * s, 0.5 - 0.01 * s]], [0.8, [0.5 - 0.008 * s, 0.5 + 0.006 * s]], [1, [0.5, 0.5]]] }) },
  "bounce-in": { name: "Bounce in", at: "in", dur: 0.55, keys: (s) => ({ scale: [[0, 40], [0.45, 100 + 12 * s], [0.7, 100 - 6 * s], [0.85, 100 + 3 * s], [1, 100]], opacity: [[0, 0], [0.2, 100]] }) },
  "drop-in": { name: "Drop in", at: "in", dur: 0.5, keys: (s) => ({ position: [[0, [0.5, 0.5 - 0.5 * s]], [0.65, [0.5, 0.5 + 0.02 * s]], [0.82, [0.5, 0.5 - 0.01 * s]], [1, [0.5, 0.5]]] }) },
  "rise": { name: "Rise", at: "in", dur: 0.5, keys: (s) => ({ position: [[0, [0.5, 0.5 + 0.08 * s]], [1, [0.5, 0.5]]], opacity: [[0, 0], [0.7, 100]] }) },
  "whip-left": { name: "Whip from left", at: "in", dur: 0.25, keys: (s) => ({ position: [[0, [0.5 - 0.9 * s, 0.5]], [1, [0.5, 0.5]]] }) },
  "whip-right": { name: "Whip from right", at: "in", dur: 0.25, keys: (s) => ({ position: [[0, [0.5 + 0.9 * s, 0.5]], [1, [0.5, 0.5]]] }) },
  "whip-up": { name: "Whip from below", at: "in", dur: 0.25, keys: (s) => ({ position: [[0, [0.5, 0.5 + 0.9 * s]], [1, [0.5, 0.5]]] }) },
  "tilt-in": { name: "Tilt in", at: "in", dur: 0.45, keys: (s) => ({ rotation: [[0, 12 * s], [1, 0]], scale: [[0, 100 + 12 * s], [1, 100]] }) },
  "punch-out": { name: "Punch out", at: "in", dur: 0.12, keys: (s) => ({ scale: [[0, 100 + 15 * s], [1, 100]] }) },
  "flash-zoom": { name: "Flash zoom", at: "in", dur: 0.25, keys: (s) => ({ scale: [[0, 100 + 40 * s], [1, 100]], opacity: [[0, 30], [1, 100]] }) },
  "pulse": { name: "Pulse", at: "whole", keys: (s) => ({ scale: [[0, 100], [0.08, 100 + 6 * s], [0.16, 100], [0.5, 100], [0.58, 100 + 6 * s], [0.66, 100]] }) },
  "wobble": { name: "Wobble", at: "in", dur: 0.6, keys: (s) => ({ rotation: [[0, 0], [0.2, 4 * s], [0.4, -3 * s], [0.6, 2 * s], [0.8, -1 * s], [1, 0]] }) },
  "pan-left": { name: "Pan left", at: "whole", keys: (s) => ({ scale: [[0, 100 + 8 * s], [1, 100 + 8 * s]], position: [[0, [0.5 + 0.03 * s, 0.5]], [1, [0.5 - 0.03 * s, 0.5]]] }) },
  "pan-right": { name: "Pan right", at: "whole", keys: (s) => ({ scale: [[0, 100 + 8 * s], [1, 100 + 8 * s]], position: [[0, [0.5 - 0.03 * s, 0.5]], [1, [0.5 + 0.03 * s, 0.5]]] }) },
  "float": { name: "Float", at: "whole", keys: (s) => ({ position: [[0, [0.5, 0.5]], [0.25, [0.5, 0.5 - 0.01 * s]], [0.5, [0.5, 0.5]], [0.75, [0.5, 0.5 + 0.01 * s]], [1, [0.5, 0.5]]] }) },
  "shrink-out": { name: "Shrink out", at: "out", dur: 0.35, keys: (s) => ({ scale: [[0, 100], [1, Math.max(5, 100 - 80 * s)]], opacity: [[0.5, 100], [1, 0]] }) },
  "spin-out": { name: "Spin out", at: "out", dur: 0.4, keys: (s) => ({ rotation: [[0, 0], [1, 30 * s]], scale: [[0, 100], [1, 100 - 30 * s]], opacity: [[0.4, 100], [1, 0]] }) },
  "whip-out": { name: "Whip out left", at: "out", dur: 0.22, keys: (s) => ({ position: [[0, [0.5, 0.5]], [1, [0.5 - 0.9 * s, 0.5]]] }) },
};

/**
 * Turns a preset into absolute keyframes for one clip, in sequence seconds.
 * @returns {param: [{time, value}]} with param in scale | position | rotation | opacity
 */
function plan(id, clip, { strength = "medium", fps = 30 } = {}) {
  const p = PRESETS[id];
  if (!p) throw new Error("Unknown preset.");
  const s = STRENGTH[strength] || 1;
  const len = clip.end - clip.start;
  let from, dur;
  if (p.at === "whole") { from = clip.start; dur = len; }
  else if (p.at === "out") { dur = Math.min(p.dur, len); from = clip.end - dur; }
  else { dur = Math.min(p.dur, len); from = clip.start; }
  const snap = (t) => Math.min(clip.end - 1 / fps, Math.max(clip.start, Math.round(t * fps) / fps));
  const out = {};
  const keys = p.keys(s);
  for (const param of Object.keys(keys)) {
    const seen = new Set();
    out[param] = keys[param]
      .map(([u, value]) => ({ time: snap(from + u * dur), value }))
      .filter((k) => (seen.has(k.time) ? false : seen.add(k.time)));
  }
  return out;
}

function list() {
  return Object.entries(PRESETS).map(([id, p]) => ({ id, name: p.name }));
}

module.exports = { plan, list, PRESETS };
