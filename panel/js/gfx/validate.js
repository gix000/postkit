/* Checks and cleans a scene that came from the AI before it is previewed or rendered:
 * known layer types only, numbers kept in sane ranges, no files, bounded size. */
(function (root, factory) {
  // Premiere's panel defines `module` when Node is on, so set the page global as well.
  const lib = factory();
  if (root) root.PKValidate = lib;
  if (typeof module === "object" && module.exports) module.exports = lib;
})(typeof window !== "undefined" ? window : typeof self !== "undefined" ? self : null, function () {
  "use strict";
  const TYPES = new Set(["text", "rect", "ellipse", "circle", "ring", "path", "glass", "particles", "group"]);
  const LIMITS = { size: [0.5, 80], w: [0, 400], h: [0, 400], radius: [0, 200], blur: [0, 20], frost: [0, 10], count: [0, 150], scale: [0, 40], opacity: [0, 1], depth: [0, 5], strength: [0, 5], speed: [0, 400], life: [0.05, 12], tracking: [-0.2, 1], lineHeight: [0.6, 3], maxWidth: [5, 200], width: [0, 30] };
  const MAX_LAYERS = 80;

  function num(v, k) {
    if (typeof v !== "number" || !isFinite(v)) return undefined;
    const r = LIMITS[k];
    return r ? Math.min(r[1], Math.max(r[0], v)) : Math.max(-1e4, Math.min(1e4, v));
  }

  function clean(v, k, depth) {
    if (depth > 8) return undefined;
    if (typeof v === "number") return num(v, k);
    if (typeof v === "string") return v.slice(0, k === "d" ? 4000 : 300);
    if (typeof v === "boolean") return v;
    if (Array.isArray(v)) return v.slice(0, 200).map((x) => clean(x, "", depth + 1)).filter((x) => x !== undefined); // keys, stops: no per-key limits
    if (v && typeof v === "object") {
      const out = {};
      for (const [kk, vv] of Object.entries(v)) {
        if (kk === "src" || kk === "__proto__" || kk === "constructor") continue; // no files from the AI
        const c = clean(vv, kk, depth + 1);
        if (c !== undefined) out[kk] = c;
      }
      return out;
    }
    return undefined;
  }

  let counted = 0;
  function layer(l, depth) {
    if (!l || typeof l !== "object" || !TYPES.has(l.type) || counted >= MAX_LAYERS) return null;
    counted++;
    const out = clean(l, "", 0);
    if (l.type === "group") out.layers = depth < 3 ? (l.layers || []).map((c) => layer(c, depth + 1)).filter(Boolean) : [];
    if (l.type === "text" && typeof out.text !== "string" && !out.count) out.text = String(l.text === undefined ? "" : l.text).slice(0, 300);
    return out;
  }

  function scene(s) {
    if (!s || typeof s !== "object") throw new Error("The AI didn't return a motion. Try describing it differently.");
    counted = 0;
    const duration = Math.min(12, Math.max(0.5, Number(s.duration) || 3));
    const layers = (Array.isArray(s.layers) ? s.layers : []).map((l) => layer(l, 0)).filter(Boolean);
    if (!layers.length) throw new Error("The AI's motion had nothing to show. Try again.");
    return { name: String(s.name || "AI motion").slice(0, 60), duration, layers };
  }

  return { scene };
});
