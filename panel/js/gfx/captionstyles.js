/* Animated caption styles. Each style turns word-timed caption groups into a scene
 * that is rendered to a transparent video and placed over the sequence.
 */
(function (root, factory) {
  // Premiere's panel defines `module` when Node is on, so set the page global as well.
  const lib = factory();
  if (root) root.PKCaptions = lib;
  if (typeof module === "object" && module.exports) module.exports = lib;
})(typeof window !== "undefined" ? window : typeof self !== "undefined" ? self : null, function () {
  "use strict";

  const STROKE = { color: "#000", width: 0.85 };
  const SHADOW = { color: "rgba(0,0,0,0.5)", blur: 2, y: 0.5 };

  // words: default words per caption; base: the text layer; group: extra layers behind each caption.
  const STYLES = {
    hormozi: { name: "Bold yellow", words: 3, base: (a) => ({ font: "Montserrat", weight: 900, size: 8.2, upper: true, stroke: STROKE, shadow: SHADOW, active: { color: a || "#ffd60a", scale: 1.12 }, in: { type: "pop", dur: 0.14, amount: 0.4 } }) },
    beast: { name: "Loud", words: 2, base: (a) => ({ font: "Bangers", weight: 400, size: 11, stroke: { color: "#000", width: 0.7 }, extrude: { color: "#000", depth: 0.9, angle: 160 }, active: { color: a || "#38e54d", scale: 1.18 }, in: { type: "pop", dur: 0.16, amount: 0.5 } }) },
    karaoke: { name: "Karaoke", words: 4, base: (a) => ({ font: "Poppins", weight: 800, size: 7, shadow: SHADOW, future: { color: "rgba(255,255,255,0.45)" }, active: { color: a || "#ffd60a" } }) },
    pop: { name: "Word pop", words: 3, base: (a) => ({ font: "Montserrat", weight: 900, size: 8.5, upper: true, stroke: STROKE, shadow: SHADOW, unit: { type: "pop", onWord: true, dur: 0.22, ease: "outBack" }, future: { hide: true }, active: { color: a || "#ffffff" } }) },
    boxed: { name: "Highlight box", words: 3, base: (a) => ({ font: "Inter", weight: 900, size: 7.4, shadow: SHADOW, active: { color: "#111", box: { fill: a || "#ffd60a", pad: 0.16, radius: 0.18 } } }) },
    minimal: { name: "Minimal", words: 5, base: () => ({ font: "Inter", weight: 700, size: 5.6, shadow: { color: "rgba(0,0,0,0.55)", blur: 2.5, y: 0.3 }, in: { type: "fade", dur: 0.12 } }) },
    glass: { name: "Liquid glass", words: 4, glass: true, base: (a) => ({ font: "Inter", weight: 800, size: 5.8, shadow: { color: "rgba(0,0,0,0.35)", blur: 1.2, y: 0.2 }, active: { color: a || "#ffffff" }, future: { color: "rgba(255,255,255,0.7)" } }), group: (g, size) => [{ type: "glass", w: Math.min(92, estimateWidth(g, size) + 9), h: size * 1.9, radius: size * 0.95, in: { type: "pop", dur: 0.2, amount: 0.3 } }] },
    neon: { name: "Neon", words: 3, base: (a) => ({ font: "Poppins", weight: 800, size: 7.6, color: "#fff", glow: { color: a || "#ff2bd6", blur: 2.4, strength: 2 }, active: { scale: 1.1 } }) },
    typewriter: { name: "Typewriter", words: 5, base: () => ({ font: "JetBrains Mono", weight: 700, size: 5.4, box: { fill: "rgba(0,0,0,0.75)", padX: 0.5, padY: 0.3, radius: 0.15, mode: "line" }, future: { hide: true } }) },
    oneword: { name: "One word", words: 1, base: (a) => ({ font: "Anton", weight: 400, size: 15, upper: true, stroke: { color: "#000", width: 0.6 }, shadow: SHADOW, in: { type: "pop", dur: 0.12, amount: 0.5, ease: "outBack" }, active: { color: a || "#ffffff" } }) },
    bubble: { name: "Bubble", words: 4, base: () => ({ font: "Poppins", weight: 800, size: 6.2, color: "#111", box: { fill: "#ffffff", padX: 0.45, padY: 0.18, radius: 0.35, mode: "line" }, in: { type: "pop", dur: 0.16, amount: 0.3 } }) },
    gradient: { name: "Gradient", words: 3, base: () => ({ font: "Montserrat", weight: 900, size: 8.4, upper: true, fill: { type: "linear", angle: 90, stops: [[0, "#ffb347"], [1, "#ff3d77"]] }, stroke: { color: "#1a0010", width: 0.5 }, active: { scale: 1.12 } }) },
    outline: { name: "Outline", words: 3, base: (a) => ({ font: "Anton", weight: 400, size: 10, upper: true, color: "rgba(255,255,255,0.08)", stroke: { color: "#ffffff", width: 0.35 }, active: { color: a || "#ffd60a", stroke: { color: a || "#ffd60a", width: 0.35 } } }) },
    hamra: { name: "Hamra (Arabic bold)", words: 3, arabic: true, base: (a) => ({ font: "Lalezar", weight: 400, size: 9.5, stroke: { color: "#000", width: 0.6 }, shadow: SHADOW, active: { color: a || "#ffd60a", scale: 1.1 } }) },
    gemmayzeh: { name: "Gemmayzeh (Arabic highlight)", words: 3, arabic: true, base: (a) => ({ font: "Cairo", weight: 900, size: 7.6, shadow: SHADOW, active: { color: "#111", box: { fill: a || "#ffd60a", pad: 0.14, radius: 0.2 } } }) },
    studio: { name: "Studio", words: 6, base: () => ({ font: "Tajawal", weight: 500, size: 5, color: "#ffffff", shadow: { color: "rgba(0,0,0,0.6)", blur: 2, y: 0.2 }, in: { type: "fade", dur: 0.15 } }) },
  };

  function estimateWidth(g, size) {
    const chars = g.words.reduce((n, w) => n + String(w.t).length + 1, 0);
    return chars * size * 0.56;
  }

  /**
   * Groups word timings into short captions, keeping each word's timing.
   * words: [{word, start, end}] → [{start, end, words: [{t, s, e}]}]
   */
  function groupWords(words, { maxWords = 3, maxGap = 0.6, maxChars = 24 } = {}) {
    const clean = words
      .map((w) => ({ t: String(w.word || w.t || "").trim(), s: +(w.start !== undefined ? w.start : w.s), e: +(w.end !== undefined ? w.end : w.e) }))
      .filter((w) => w.t && w.e > w.s)
      .sort((a, b) => a.s - b.s);
    const groups = [];
    let cur = null;
    for (const w of clean) {
      const len = cur ? cur.words.reduce((n, x) => n + x.t.length + 1, 0) + w.t.length : w.t.length;
      const last = cur && cur.words[cur.words.length - 1];
      const startNew = !cur || cur.words.length >= maxWords || w.s - cur.end > maxGap || len > maxChars || (last && /[.!?؟،,]$/.test(last.t));
      if (startNew) {
        if (cur) groups.push(cur);
        cur = { start: w.s, end: w.e, words: [w] };
      } else {
        cur.words.push(w);
        cur.end = w.e;
      }
    }
    if (cur) groups.push(cur);
    for (let i = 0; i < groups.length - 1; i++) {
      if (groups[i + 1].start - groups[i].end < 0.3) groups[i].end = groups[i + 1].start;
    }
    return groups;
  }

  /**
   * Builds the caption scene. Times in the scene start at `offset` (the first caption),
   * so the rendered clip goes on the timeline at that time.
   * opts: { style, accent, y, size (scale factor), maxWidth, upper }
   */
  function build(groups, opts = {}) {
    const style = STYLES[opts.style] || STYLES.hormozi;
    if (!groups.length) return { scene: { duration: 1, layers: [] }, offset: 0 };
    const offset = Math.max(0, groups[0].start - 0.05);
    const y = opts.y === undefined ? 0.66 : opts.y;
    const k = opts.size || 1;
    const base = style.base(opts.accent);
    const size = base.size * k;
    const layers = [];
    for (const g of groups) {
      const start = g.start - offset;
      const end = g.end - offset;
      const words = g.words.map((w) => ({ t: w.t, s: w.s - offset, e: w.e - offset }));
      if (style.group) {
        for (const extra of style.group(g, size)) layers.push({ ...extra, y, start, end });
      }
      const layer = { type: "text", ...base, size, y, start, end, words, maxWidth: opts.maxWidth || 82, lineHeight: 1.08 };
      if (opts.upper === false) layer.upper = false;
      if (opts.font) layer.font = opts.font;
      layers.push(layer);
    }
    const duration = groups[groups.length - 1].end - offset + 0.05;
    return { scene: { duration, layers }, offset };
  }

  function list() {
    return Object.entries(STYLES).map(([id, s]) => ({ id, name: s.name, words: s.words, glass: !!s.glass, arabic: !!s.arabic }));
  }

  return { build, groupWords, list, STYLES };
});
