/* PostKit motion engine — draws a scene description onto a 2D canvas at time t.
 *
 * Scene: { duration, layers: [Layer] }
 * Units: x, y are fractions of the frame (0–1). Sizes (w, h, size, radius, blur…)
 * are in "u": 1u = 1% of the frame's shorter side, so one scene works in 9:16 and 16:9.
 * Times are seconds from the start of the scene; key times are seconds from the layer's start.
 *
 * Runs in Premiere's panel (Chrome 88): no roundRect, no ctx.letterSpacing.
 * Works as a CommonJS module (panel, tests) and as a browser global (PKGfx).
 */
(function (root, factory) {
  // Premiere's panel defines `module` when Node is on, so set the page global as well.
  const lib = factory();
  if (root) root.PKGfx = lib;
  if (typeof module === "object" && module.exports) module.exports = lib;
})(typeof window !== "undefined" ? window : typeof self !== "undefined" ? self : null, function () {
  "use strict";

  // ── maths ────────────────────────────────────────────────
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, p) => a + (b - a) * p;

  const EASE = {
    linear: (p) => p,
    in: (p) => p * p * p,
    out: (p) => 1 - Math.pow(1 - p, 3),
    inOut: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
    outQuart: (p) => 1 - Math.pow(1 - p, 4),
    outExpo: (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p)),
    inExpo: (p) => (p <= 0 ? 0 : Math.pow(2, 10 * p - 10)),
    inOutExpo: (p) => (p <= 0 ? 0 : p >= 1 ? 1 : p < 0.5 ? Math.pow(2, 20 * p - 10) / 2 : (2 - Math.pow(2, -20 * p + 10)) / 2),
    outBack: (p) => {
      const c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
    },
    inBack: (p) => 2.70158 * p * p * p - 1.70158 * p * p,
    outElastic: (p) => (p <= 0 ? 0 : p >= 1 ? 1 : Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
    outBounce: (p) => {
      const n = 7.5625, d = 2.75;
      if (p < 1 / d) return n * p * p;
      if (p < 2 / d) return n * (p -= 1.5 / d) * p + 0.75;
      if (p < 2.5 / d) return n * (p -= 2.25 / d) * p + 0.9375;
      return n * (p -= 2.625 / d) * p + 0.984375;
    },
    spring: (p) => (p >= 1 ? 1 : 1 - Math.exp(-6 * p) * Math.cos(p * 4.5 * Math.PI) * (1 - p * 0.2)),
    hold: (p) => (p >= 1 ? 1 : 0),
  };
  /** Cubic-bezier easing like CSS, e.g. [0.2, 0.8, 0.2, 1]. */
  function bezier(x1, y1, x2, y2) {
    const ax = 3 * x1 - 3 * x2 + 1, bx = 3 * x2 - 6 * x1, cx = 3 * x1;
    const ay = 3 * y1 - 3 * y2 + 1, by = 3 * y2 - 6 * y1, cy = 3 * y1;
    const xAt = (s) => ((ax * s + bx) * s + cx) * s;
    const yAt = (s) => ((ay * s + by) * s + cy) * s;
    return (p) => {
      if (p <= 0) return 0;
      if (p >= 1) return 1;
      let lo = 0, hi = 1, s = p;
      for (let i = 0; i < 24; i++) {
        const x = xAt(s);
        if (Math.abs(x - p) < 1e-5) break;
        if (x < p) lo = s; else hi = s;
        s = (lo + hi) / 2;
      }
      return yAt(s);
    };
  }
  function ease(name) {
    if (typeof name === "function") return name;
    if (Array.isArray(name) && name.length === 4) return bezier(name[0], name[1], name[2], name[3]);
    return EASE[name] || EASE.inOut;
  }

  // ── colours ──────────────────────────────────────────────
  const NAMED = { white: "#ffffff", black: "#000000", transparent: "#00000000", red: "#ff3b30", yellow: "#ffd60a", green: "#34c759", blue: "#0a84ff" };
  function parseColor(c) {
    if (Array.isArray(c)) return c;
    let s = String(c || "#000").trim().toLowerCase();
    if (NAMED[s]) s = NAMED[s];
    let m;
    if ((m = s.match(/^#([0-9a-f]{3,8})$/))) {
      let h = m[1];
      if (h.length === 3 || h.length === 4) h = h.split("").map((x) => x + x).join("");
      const n = (i) => parseInt(h.slice(i, i + 2), 16);
      return [n(0), n(2), n(4), h.length === 8 ? n(6) / 255 : 1];
    }
    if ((m = s.match(/^rgba?\(([^)]+)\)$/))) {
      const p = m[1].split(/[ ,/]+/).filter(Boolean).map(parseFloat);
      return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
    }
    return [0, 0, 0, 1];
  }
  const rgba = (c) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${+clamp(c[3]).toFixed(4)})`;
  function withAlpha(c, a) {
    const p = parseColor(c);
    return rgba([p[0], p[1], p[2], p[3] * a]);
  }
  const isColor = (v) => typeof v === "string" && (/^#|^rgb/.test(v) || NAMED[v] !== undefined);

  function mix(a, b, p) {
    if (typeof a === "number" && typeof b === "number") return lerp(a, b, p);
    if (Array.isArray(a) && Array.isArray(b)) return a.map((x, i) => mix(x, b[i] === undefined ? x : b[i], p));
    if (isColor(a) && isColor(b)) {
      const x = parseColor(a), y = parseColor(b);
      return rgba(x.map((v, i) => lerp(v, y[i], p)));
    }
    return p < 1 ? a : b;
  }

  // ── keyframes ────────────────────────────────────────────
  /** keys: [[time, value, ease?], …] sorted by time. The ease belongs to the segment that starts at that key. */
  function sample(keys, t) {
    if (!Array.isArray(keys) || !keys.length) return undefined;
    if (!Array.isArray(keys[0])) return keys; // a constant written as a plain value
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) {
      const a = keys[i], b = keys[i + 1];
      if (t < b[0]) {
        const p = (t - a[0]) / Math.max(1e-6, b[0] - a[0]);
        return mix(a[1], b[1], ease(a[2] || "inOut")(p));
      }
    }
    return keys[keys.length - 1][1];
  }

  // ── seeded random (particles, glitch) ────────────────────
  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return () => {
      s ^= s << 13; s >>>= 0;
      s ^= s >>> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }
  const hash = (a, b) => (((a * 73856093) ^ (b * 19349663)) >>> 0) || 1;

  // ── entrance / exit moves ────────────────────────────────
  // Each takes p (0 = hidden, 1 = settled) and amount, and returns changes to the layer's state.
  const MOVES = {
    none: () => ({}),
    fade: (p) => ({ opacity: p }),
    slideUp: (p, a) => ({ dy: (1 - p) * 8 * a, opacity: clamp(p * 2) }),
    slideDown: (p, a) => ({ dy: -(1 - p) * 8 * a, opacity: clamp(p * 2) }),
    slideLeft: (p, a) => ({ dx: (1 - p) * 12 * a, opacity: clamp(p * 2) }),
    slideRight: (p, a) => ({ dx: -(1 - p) * 12 * a, opacity: clamp(p * 2) }),
    flyUp: (p, a) => ({ dy: (1 - p) * 60 * a }),
    flyLeft: (p, a) => ({ dx: (1 - p) * 90 * a }),
    flyRight: (p, a) => ({ dx: -(1 - p) * 90 * a }),
    pop: (p, a) => ({ scale: lerp(1 - 0.6 * a, 1, p), opacity: clamp(p * 3) }),
    zoomIn: (p, a) => ({ scale: lerp(1 + 0.8 * a, 1, p), opacity: p }),
    zoomOut: (p, a) => ({ scale: lerp(Math.max(0.05, 1 - 0.7 * a), 1, p), opacity: p }),
    blur: (p, a) => ({ blur: (1 - p) * 3 * a, opacity: p }),
    rise: (p, a) => ({ dy: (1 - p) * 5 * a, blur: (1 - p) * 1.5 * a, opacity: p }),
    spin: (p, a) => ({ rotation: (1 - p) * -180 * a, scale: lerp(0.3, 1, p), opacity: clamp(p * 2) }),
    swing: (p, a) => ({ rotation: (1 - p) * 25 * a, opacity: clamp(p * 2) }),
    drop: (p, a) => ({ dy: -(1 - p) * 30 * a, opacity: clamp(p * 4) }),
    stretch: (p, a) => ({ sx: lerp(1 + 0.6 * a, 1, p), sy: lerp(Math.max(0.1, 1 - 0.5 * a), 1, p), opacity: clamp(p * 2) }),
    flipX: (p) => ({ sx: Math.max(0.001, p) }),
    flipY: (p) => ({ sy: Math.max(0.001, p) }),
    wipeRight: (p) => ({ clip: { dir: "right", p } }),
    wipeLeft: (p) => ({ clip: { dir: "left", p } }),
    wipeUp: (p) => ({ clip: { dir: "up", p } }),
    wipeDown: (p) => ({ clip: { dir: "down", p } }),
    reveal: (p) => ({ clip: { dir: "center", p } }),
    skew: (p, a) => ({ skewX: (1 - p) * -20 * a, dx: (1 - p) * 10 * a, opacity: p }),
    glitch: (p, a, seed) => {
      if (p >= 1) return {};
      const r = rng(hash(seed, Math.floor(p * 18)))();
      return { dx: (r - 0.5) * 6 * a * (1 - p), opacity: p < 0.15 ? (r > 0.5 ? 1 : 0) : 1, rgbSplit: (1 - p) * 1.2 * a };
    },
    typewriter: (p) => ({ chars: p }),
  };

  function moveState(spec, p, seed) {
    if (!spec) return {};
    const type = typeof spec === "string" ? spec : spec.type;
    const fn = MOVES[type] || MOVES.fade;
    const amount = typeof spec === "object" && spec.amount !== undefined ? spec.amount : 1;
    return fn(p, amount, seed || 1);
  }
  const moveDur = (spec, d) => (spec && typeof spec === "object" && spec.dur !== undefined ? spec.dur : d);

  function combine(state, ch) {
    if (ch.opacity !== undefined) state.opacity *= ch.opacity;
    if (ch.scale !== undefined) state.scale *= ch.scale;
    if (ch.sx !== undefined) state.sx *= ch.sx;
    if (ch.sy !== undefined) state.sy *= ch.sy;
    if (ch.dx) state.dx += ch.dx;
    if (ch.dy) state.dy += ch.dy;
    if (ch.rotation) state.rotation += ch.rotation;
    if (ch.blur) state.blur += ch.blur;
    if (ch.skewX) state.skewX += ch.skewX;
    if (ch.rgbSplit) state.rgbSplit += ch.rgbSplit;
    if (ch.clip) state.clip = ch.clip;
    if (ch.chars !== undefined) state.chars = Math.min(state.chars, ch.chars);
    return state;
  }

  /** In and out progress of an entrance/exit, given a local time and a span. */
  function inOutProgress(spec, local, span, defDur, isOut) {
    const s = typeof spec === "object" ? spec : {};
    const dur = Math.max(1e-3, moveDur(spec, defDur));
    const delay = s.delay || 0;
    const p = isOut ? (span - local - delay) / dur : (local - delay) / dur;
    return ease(s.ease || (isOut ? "in" : "out"))(clamp(p));
  }

  // ── the evaluated state of a layer at time t ─────────────
  const PROPS = ["x", "y", "scale", "sx", "sy", "rotation", "opacity", "blur", "skewX", "w", "h", "radius", "size", "progress", "trim", "value", "color", "fill", "tint", "light", "glow", "hue"];

  function layerState(layer, t, scene, rel) {
    const start = layer.start || 0;
    const end = layer.end === undefined ? scene.duration : layer.end;
    const local = t - start;
    const span = end - start;
    const st = {
      x: layer.x === undefined ? (rel ? 0 : 0.5) : layer.x,
      y: layer.y === undefined ? (rel ? 0 : 0.5) : layer.y,
      scale: layer.scale === undefined ? 1 : layer.scale,
      sx: 1, sy: 1,
      rotation: layer.rotation || 0,
      opacity: layer.opacity === undefined ? 1 : layer.opacity,
      blur: layer.blur || 0,
      skewX: layer.skewX || 0,
      dx: 0, dy: 0, rgbSplit: 0, clip: null, chars: 1,
      local, span,
    };
    // Plain properties that can be keyed.
    for (const k of PROPS) {
      if (layer.keys && layer.keys[k]) {
        const v = sample(layer.keys[k], local);
        if (v !== undefined) st[k] = v;
      } else if (st[k] === undefined && layer[k] !== undefined) st[k] = layer[k];
    }
    // Continuous motion while visible.
    if (layer.loop) applyLoop(st, layer.loop, local);
    // Entrance and exit.
    if (layer.in) combine(st, moveState(layer.in, inOutProgress(layer.in, local, span, 0.45, false), layer.seed));
    if (layer.out) combine(st, moveState(layer.out, inOutProgress(layer.out, local, span, 0.3, true), layer.seed));
    return st;
  }

  function applyLoop(st, loops, local) {
    for (const l of [].concat(loops)) {
      const a = l.amount === undefined ? 1 : l.amount;
      const f = l.speed === undefined ? 1 : l.speed;
      const w = local * f * Math.PI * 2;
      switch (l.type) {
        case "float": st.dy += Math.sin(w * 0.5) * 1.2 * a; break;
        case "pulse": st.scale *= 1 + Math.sin(w) * 0.04 * a; break;
        case "wiggle": st.rotation += Math.sin(w * 1.3) * 4 * a; break;
        case "shake": { const r = rng(hash(7, Math.floor(local * 24 * f))); st.dx += (r() - 0.5) * 1.5 * a; st.dy += (r() - 0.5) * 1.5 * a; break; }
        case "spin": st.rotation += local * 360 * f * a; break;
        case "drift": st.scale *= 1 + local * 0.02 * a; break;
        case "blink": st.opacity *= Math.sin(w) > -0.2 ? 1 : 0; break;
        case "flicker": { const r = rng(hash(11, Math.floor(local * 12 * f)))(); st.opacity *= r > 0.15 * a ? 1 : 0.35; break; }
        default: break;
      }
    }
  }

  // ── drawing helpers ──────────────────────────────────────
  function roundRectPath(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  /** Fill: a colour, or { type: "linear"|"radial", angle, stops: [[0, c], [1, c]] }. Box is the area it spans. */
  function paint(ctx, fill, box) {
    if (!fill || typeof fill === "string") return fill || "#fff";
    const stops = fill.stops || [[0, "#fff"], [1, "#000"]];
    let g;
    if (fill.type === "radial") {
      const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
      g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(box.w, box.h) / 2);
    } else {
      const a = ((fill.angle === undefined ? 90 : fill.angle) * Math.PI) / 180;
      const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
      const len = (Math.abs(box.w * Math.sin(a)) + Math.abs(box.h * Math.cos(a))) / 2;
      // angle 90 = left→right, 180 = top→bottom (CSS convention)
      g = ctx.createLinearGradient(cx - Math.sin(a) * len, cy + Math.cos(a) * len, cx + Math.sin(a) * len, cy - Math.cos(a) * len);
    }
    for (const [o, c] of stops) g.addColorStop(clamp(o), typeof c === "string" ? c : rgba(parseColor(c)));
    return g;
  }

  function setShadow(ctx, sh, U) {
    if (!sh) {
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      return;
    }
    ctx.shadowColor = sh.color || "rgba(0,0,0,0.5)";
    ctx.shadowBlur = (sh.blur === undefined ? 2 : sh.blur) * U;
    ctx.shadowOffsetX = (sh.x || 0) * U;
    ctx.shadowOffsetY = (sh.y === undefined ? 0.6 : sh.y) * U;
  }

  // ── text: script detection, minimal bidi, layout ─────────
  const AR = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
  const LATIN = /[A-Za-zÀ-ɏ]/;
  const hasArabic = (s) => AR.test(s);
  function wordDir(w) {
    for (const ch of w) {
      if (AR.test(ch)) return "r";
      if (LATIN.test(ch)) return "l";
    }
    return "n";
  }
  function paragraphDir(text) {
    for (const ch of text) {
      if (AR.test(ch)) return "rtl";
      if (LATIN.test(ch)) return "ltr";
    }
    return "ltr";
  }
  /** Orders the words of one line for display, left to right. */
  function visualOrder(words, dir) {
    const runs = [];
    let base = dir === "rtl" ? "r" : "l";
    for (const w of words) {
      let d = wordDir(w.text);
      if (d === "n") d = runs.length ? runs[runs.length - 1].d : base;
      if (!runs.length || runs[runs.length - 1].d !== d) runs.push({ d, items: [] });
      runs[runs.length - 1].items.push(w);
    }
    const ordered = dir === "rtl" ? runs.slice().reverse() : runs;
    const out = [];
    for (const r of ordered) out.push(...(r.d === "r" ? r.items.slice().reverse() : r.items));
    return out;
  }

  function fontString(layer, sizePx) {
    const fam = layer.font || "Inter";
    return `${layer.italic ? "italic " : ""}${layer.weight || 800} ${sizePx}px "${fam}", "Cairo", system-ui, sans-serif`;
  }

  const textOf = (layer, st) => {
    let s = layer.text === undefined ? "" : String(layer.text);
    if (layer.count) {
      const c = layer.count;
      const v = st.value !== undefined ? st.value : lerp(c.from || 0, c.to || 0, ease(c.ease || "outExpo")(clamp(st.local / (c.dur || 1.2))));
      const d = c.decimals || 0;
      let n = v.toFixed(d);
      if (c.separator !== false) n = n.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      s = (c.prefix || "") + n + (c.suffix || "");
    }
    if (layer.upper) s = s.toUpperCase();
    return s;
  };

  /**
   * Lays text out in lines and words (or characters). Returns units with positions
   * relative to the block's centre, in pixels.
   */
  function layoutText(ctx, layer, st, U) {
    const sizePx = (st.size || layer.size || 8) * U;
    ctx.font = fontString(layer, sizePx);
    const text = textOf(layer, st);
    const dir = layer.dir || paragraphDir(text);
    const maxW = layer.maxWidth ? layer.maxWidth * U : Infinity;
    const track = (layer.tracking || 0) * sizePx; // extra space between letters, in ems
    const lineH = sizePx * (layer.lineHeight || 1.12);
    // Display fonts have very narrow spaces; keep words clearly apart.
    const space = Math.max(ctx.measureText(" ").width, sizePx * 0.27) * (layer.wordSpacing || 1) + track;
    const arabic = hasArabic(text);
    const byChar = (layer.split === "char" || track) && !arabic;

    const measure = (w) => {
      if (!track) return ctx.measureText(w).width;
      let sum = 0;
      for (const ch of w) sum += ctx.measureText(ch).width + track;
      return sum - track;
    };

    // Words, with timings when given (captions).
    const words = layer.words
      ? layer.words.map((w, i) => ({ text: layer.upper ? String(w.t).toUpperCase() : String(w.t), s: w.s, e: w.e, i }))
      : text.split(/[ \t]+/).filter(Boolean).map((w, i) => ({ text: w, i }));

    // Explicit line breaks with "\n".
    const lines = [];
    let cur = [], curW = 0;
    for (const w of words) {
      const parts = w.text.split("\n");
      parts.forEach((part, pi) => {
        if (pi > 0) { lines.push(cur); cur = []; curW = 0; }
        if (!part) return;
        const ww = measure(part);
        const unit = { ...w, text: part, w: ww };
        if (cur.length && curW + space + ww > maxW) { lines.push(cur); cur = []; curW = 0; }
        curW += (cur.length ? space : 0) + ww;
        cur.push(unit);
      });
    }
    if (cur.length) lines.push(cur);

    const align = layer.align || "center";
    const total = lines.length * lineH;
    const units = [];
    let wordIndex = 0, charIndex = 0;
    let blockW = 0;
    lines.forEach((line, li) => {
      const ordered = visualOrder(line, dir);
      const lw = ordered.reduce((s, w) => s + w.w, 0) + space * Math.max(0, ordered.length - 1);
      blockW = Math.max(blockW, lw);
      let x0 = align === "left" ? 0 : align === "right" ? -lw : -lw / 2;
      if (align === "left" || align === "right") x0 = 0; // resolved below against blockW
      const y = -total / 2 + lineH * (li + 0.5);
      let x = x0;
      for (const w of ordered) {
        const base = { line: li, word: w.i === undefined ? wordIndex : w.i, y, s: w.s, e: w.e, lineW: lw };
        if (byChar) {
          for (const ch of w.text) {
            const cw = ctx.measureText(ch).width;
            units.push({ ...base, text: ch, x: x + cw / 2, w: cw, char: charIndex++ });
            x += cw + track;
          }
          x += space - track;
        } else {
          units.push({ ...base, text: w.text, x: x + w.w / 2, w: w.w, char: charIndex });
          charIndex += w.text.length;
          x += w.w + space;
        }
        wordIndex++;
      }
    });
    // Left/right alignment: the layer's position is the block's left (or right) edge.
    let ox = 0;
    if (align === "left") ox = blockW / 2;
    else if (align === "right") ox = -blockW / 2;
    if (align === "left" || align === "right") {
      for (const u of units) u.x += (align === "left" ? -blockW / 2 : blockW / 2 - u.lineW) + ox;
    }
    return { units, lines: lines.length, lineH, blockW, blockH: total, sizePx, dir, ox };
  }

  function unitProgress(layer, u, index, count, local, span) {
    const spec = layer.unit;
    if (!spec) return null;
    const stagger = spec.stagger === undefined ? 0.05 : spec.stagger;
    let order = index;
    if (spec.order === "reverse") order = count - 1 - index;
    else if (spec.order === "center") order = Math.abs(index - (count - 1) / 2);
    else if (spec.order === "random") order = Math.floor(rng(hash(index + 1, layer.seed || 3))() * count);
    // Caption words enter when they're spoken.
    const begin = u.s !== undefined && spec.onWord ? u.s - (layer.start || 0) : (spec.delay || 0) + order * stagger;
    const dur = spec.dur || 0.35;
    const pin = ease(spec.ease || "out")(clamp((local - begin) / dur));
    let pout = 1;
    if (layer.unitOut) {
      const so = layer.unitOut;
      const st = so.stagger === undefined ? stagger : so.stagger;
      const od = so.dur || 0.25;
      const ostart = span - od - (so.delay || 0) - (count - 1 - order) * st * 0 - order * st * 0.5;
      pout = ease(so.ease || "in")(clamp(1 - (local - ostart) / od));
    }
    return { pin, pout };
  }

  function drawText(ctx, layer, st, U, t) {
    const L = layoutText(ctx, layer, st, U);
    const { units, sizePx } = L;
    if (!units.length) return;
    const fillBox = { x: -L.blockW / 2 + L.ox, y: -L.blockH / 2, w: L.blockW, h: L.blockH };
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.direction = L.dir;
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;

    // Background box behind the whole block or each line.
    if (layer.box) {
      const b = layer.box;
      const px = (b.padX === undefined ? 0.45 : b.padX) * sizePx, py = (b.padY === undefined ? 0.2 : b.padY) * sizePx;
      const r = (b.radius === undefined ? 0.25 : b.radius) * sizePx;
      ctx.save();
      setShadow(ctx, b.shadow, U);
      ctx.fillStyle = paint(ctx, b.fill || "#000", fillBox);
      ctx.globalAlpha *= b.opacity === undefined ? 1 : b.opacity;
      if (b.mode === "line") {
        for (let li = 0; li < L.lines; li++) {
          const us = units.filter((u) => u.line === li);
          if (!us.length) continue;
          const minX = Math.min(...us.map((u) => u.x - u.w / 2)), maxX = Math.max(...us.map((u) => u.x + u.w / 2));
          roundRectPath(ctx, minX - px, us[0].y - L.lineH / 2 - py + L.lineH * 0.06, maxX - minX + 2 * px, L.lineH + 2 * py - L.lineH * 0.12, r);
          ctx.fill();
        }
      } else {
        const p = layer.box.reveal === undefined ? 1 : sample(layer.box.reveal, st.local);
        roundRectPath(ctx, fillBox.x - px, fillBox.y - py, (fillBox.w + 2 * px) * clamp(p), fillBox.h + 2 * py, r);
        ctx.fill();
      }
      ctx.restore();
    }

    const fill = paint(ctx, st.fill || layer.fill || st.color || layer.color || "#fff", fillBox);
    const totalChars = units.reduce((s, u) => s + u.text.length, 0);
    const shown = Math.round(totalChars * clamp(st.chars));
    let charsSoFar = 0;
    const active = activeWord(layer, t);

    units.forEach((u, i) => {
      let text = u.text;
      if (st.chars < 1) {
        if (charsSoFar >= shown) return;
        if (charsSoFar + text.length > shown) text = Array.from(text).slice(0, shown - charsSoFar).join("");
        charsSoFar += u.text.length;
      }
      const up = unitProgress(layer, u, i, units.length, st.local, st.span);
      let ux = u.x, uy = u.y, us = 1, ur = 0, ua = 1, ublur = 0;
      if (up) {
        const ch = moveState(layer.unit, up.pin, (layer.seed || 1) + i);
        if (ch.dx) ux += ch.dx * U;
        if (ch.dy) uy += ch.dy * U;
        if (ch.scale !== undefined) us *= ch.scale;
        if (ch.rotation) ur += ch.rotation;
        if (ch.opacity !== undefined) ua *= ch.opacity;
        if (ch.blur) ublur += ch.blur;
        if (layer.unitOut) {
          const co = moveState(layer.unitOut, up.pout, (layer.seed || 1) + i);
          if (co.dy) uy += co.dy * U;
          if (co.dx) ux += co.dx * U;
          if (co.scale !== undefined) us *= co.scale;
          if (co.opacity !== undefined) ua *= co.opacity;
        }
      }
      // Captions: style for the spoken word, the words already said and the ones to come.
      let color = null, wordBox = null, wordStroke = null;
      if (layer.words && active !== -1) {
        const isActive = u.word === active;
        const said = u.word < active;
        if (isActive && layer.active) {
          const a = layer.active;
          if (a.color) color = a.color;
          if (a.scale) {
            const w = layer.words[u.word];
            const k = ease("outBack")(clamp((t - w.s) / 0.14));
            us *= lerp(1, a.scale, k);
          }
          if (a.box) wordBox = a.box;
          if (a.stroke) wordStroke = a.stroke;
          if (a.dy) uy += a.dy * U;
        } else if (!isActive && !said && layer.future) {
          if (layer.future.color) color = layer.future.color;
          if (layer.future.opacity !== undefined) ua *= layer.future.opacity;
          if (layer.future.hide) return;
        } else if (said && layer.past && layer.past.color) color = layer.past.color;
      }
      if (ua <= 0.001) return;

      ctx.save();
      ctx.translate(ux, uy);
      if (ur) ctx.rotate((ur * Math.PI) / 180);
      if (us !== 1) ctx.scale(us, us);
      ctx.globalAlpha *= ua;
      if (ublur > 0.01) ctx.filter = `blur(${(ublur * U).toFixed(2)}px)`;

      if (wordBox) {
        const pad = (wordBox.pad === undefined ? 0.18 : wordBox.pad) * sizePx;
        ctx.save();
        ctx.fillStyle = wordBox.fill || "#ffd60a";
        roundRectPath(ctx, -u.w / 2 - pad, -L.lineH / 2 + L.lineH * 0.08, u.w + pad * 2, L.lineH * 0.84, (wordBox.radius === undefined ? 0.2 : wordBox.radius) * sizePx);
        ctx.fill();
        ctx.restore();
      }
      // Extruded 3D shadow.
      if (layer.extrude) {
        const e = layer.extrude;
        const depth = (e.depth || 0.8) * U;
        const a = ((e.angle === undefined ? 135 : e.angle) * Math.PI) / 180;
        ctx.fillStyle = e.color || "#000";
        const steps = Math.max(2, Math.round(depth));
        for (let k = steps; k >= 1; k--) {
          const d = (k / steps) * depth;
          if (layer.stroke) {
            ctx.lineWidth = layer.stroke.width * U * 2;
            ctx.strokeStyle = e.color || "#000";
            ctx.strokeText(text, Math.sin(a) * d, -Math.cos(a) * d);
          }
          ctx.fillText(text, Math.sin(a) * d, -Math.cos(a) * d);
        }
      }
      // Glow underneath.
      if (layer.glow) {
        const g = layer.glow;
        ctx.save();
        ctx.shadowColor = g.color || "#fff";
        ctx.shadowBlur = (g.blur || 3) * U;
        ctx.fillStyle = g.color || "#fff";
        for (let k = 0; k < (g.strength || 2); k++) ctx.fillText(text, 0, 0);
        ctx.restore();
      }
      setShadow(ctx, layer.shadow, U);
      const stroke = wordStroke || layer.stroke;
      if (stroke) {
        ctx.lineWidth = (stroke.width || 0.6) * U * 2; // half of it sits under the fill
        ctx.strokeStyle = stroke.color || "#000";
        ctx.strokeText(text, 0, 0);
        if (!layer.shadow) setShadow(ctx, null, U);
        else setShadow(ctx, null, U);
      }
      if (st.rgbSplit > 0.01) {
        const o = st.rgbSplit * U;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = "rgba(255,0,60,0.8)";
        ctx.fillText(text, -o, 0);
        ctx.fillStyle = "rgba(0,220,255,0.8)";
        ctx.fillText(text, o, 0);
        ctx.restore();
      }
      if (layer.fill !== "none") {
        ctx.fillStyle = color || fill;
        ctx.fillText(text, 0, 0);
      }
      ctx.restore();
    });
  }

  function activeWord(layer, t) {
    if (!layer.words) return -1;
    let idx = -1;
    for (let i = 0; i < layer.words.length; i++) if (t >= layer.words[i].s - 0.02) idx = i;
    return idx;
  }

  // ── shapes ───────────────────────────────────────────────
  function shapeBox(st, layer, U) {
    const w = (st.w === undefined ? layer.w || 20 : st.w) * U;
    const h = (st.h === undefined ? layer.h || 20 : st.h) * U;
    const ax = layer.anchorX === undefined ? 0.5 : layer.anchorX;
    const ay = layer.anchorY === undefined ? 0.5 : layer.anchorY;
    return { x: -w * ax, y: -h * ay, w, h };
  }

  function drawRect(ctx, layer, st, U) {
    const b = shapeBox(st, layer, U);
    const prog = st.progress === undefined ? 1 : clamp(st.progress);
    const r = (st.radius === undefined ? layer.radius || 0 : st.radius) * U;
    setShadow(ctx, layer.shadow, U);
    roundRectPath(ctx, b.x, b.y, Math.max(0.01, b.w * prog), b.h, r);
    if (layer.fill !== "none") {
      ctx.fillStyle = paint(ctx, st.fill || layer.fill || "#fff", b);
      ctx.fill();
    }
    if (layer.stroke) {
      setShadow(ctx, null, U);
      ctx.lineWidth = (layer.stroke.width || 0.4) * U;
      ctx.strokeStyle = layer.stroke.color || "#fff";
      ctx.stroke();
    }
  }

  function drawEllipse(ctx, layer, st, U) {
    const b = shapeBox(st, layer, U);
    setShadow(ctx, layer.shadow, U);
    ctx.beginPath();
    ctx.ellipse(b.x + b.w / 2, b.y + b.h / 2, b.w / 2, b.h / 2, 0, 0, Math.PI * 2);
    if (layer.fill !== "none") {
      ctx.fillStyle = paint(ctx, st.fill || layer.fill || "#fff", b);
      ctx.fill();
    }
    if (layer.stroke) {
      setShadow(ctx, null, U);
      ctx.lineWidth = (layer.stroke.width || 0.4) * U;
      ctx.strokeStyle = layer.stroke.color || "#fff";
      ctx.stroke();
    }
  }

  /** Arc / ring: progress 0–1 of a full circle, starting at 12 o'clock. */
  function drawRing(ctx, layer, st, U) {
    const r = ((st.w === undefined ? layer.w || 20 : st.w) * U) / 2;
    const lw = (layer.width || 1.5) * U;
    const p = st.progress === undefined ? 1 : clamp(st.progress);
    ctx.lineCap = layer.cap || "round";
    if (layer.track) {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.strokeStyle = layer.track;
      ctx.lineWidth = lw;
      ctx.stroke();
    }
    if (p <= 0) return;
    ctx.beginPath();
    ctx.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p);
    ctx.strokeStyle = paint(ctx, st.color || layer.color || "#fff", { x: -r, y: -r, w: 2 * r, h: 2 * r });
    ctx.lineWidth = lw;
    setShadow(ctx, layer.shadow, U);
    ctx.stroke();
  }

  // Path length for draw-on strokes. Uses the DOM when available, else a polyline estimate.
  const lengthCache = new Map();
  function pathLength(d) {
    if (lengthCache.has(d)) return lengthCache.get(d);
    let len = 0;
    try {
      if (typeof document !== "undefined") {
        const el = document.createElementNS("http://www.w3.org/2000/svg", "path");
        el.setAttribute("d", d);
        len = el.getTotalLength();
      }
    } catch (e) {
      len = 0;
    }
    if (!len) {
      const nums = (d.match(/-?\d*\.?\d+/g) || []).map(Number);
      for (let i = 2; i + 1 < nums.length; i += 2) len += Math.hypot(nums[i] - nums[i - 2], nums[i + 1] - nums[i - 1]);
      len = len || 100;
    }
    lengthCache.set(d, len);
    return len;
  }

  /** SVG path in u units around the layer's position; trim 0–1 draws it on. */
  function drawPath(ctx, layer, st, U) {
    if (typeof Path2D === "undefined") return;
    ctx.save();
    ctx.scale(U, U);
    const p = new Path2D(layer.d);
    const trim = st.trim === undefined ? 1 : clamp(st.trim);
    if (layer.fill && layer.fill !== "none") {
      ctx.globalAlpha *= trim;
      ctx.fillStyle = paint(ctx, st.fill || layer.fill, { x: -20, y: -20, w: 40, h: 40 });
      ctx.fill(p);
      ctx.globalAlpha /= trim || 1;
    }
    if (layer.stroke) {
      const len = pathLength(layer.d);
      ctx.lineWidth = layer.stroke.width || 0.8;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = st.color || layer.stroke.color || "#fff";
      if (trim < 1) {
        ctx.setLineDash([len * trim, len + 1]);
      }
      if (trim > 0) ctx.stroke(p);
    }
    ctx.restore();
  }

  // ── liquid glass ─────────────────────────────────────────
  /**
   * A pane of liquid glass. With a background frame (env.bg) it blurs and bends the
   * video behind it; without one it is a frosted tint with the same highlights.
   */
  function drawGlass(ctx, layer, st, U, env, t) {
    const b = shapeBox(st, layer, U);
    const r = (st.radius === undefined ? (layer.radius === undefined ? Math.min(b.w, b.h) / U / 2 : layer.radius) : st.radius) * U;
    const tone = layer.tone || "light"; // light | dark | clear
    const blurU = layer.frost === undefined ? 2.2 : layer.frost;
    const light = st.light === undefined ? (layer.light === undefined ? 1 : layer.light) : st.light;
    const refract = layer.refract === undefined ? 1 : layer.refract;
    const tint = st.tint || layer.tint || (tone === "dark" ? "rgba(20,20,24,0.32)" : tone === "clear" ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.16)");
    const bg = env && env.bg ? env.bg(t) : null;

    // Soft shadow outside the pane only (drawn from a copy far off to the side).
    if (layer.shadow !== false) {
      ctx.save();
      const off = 10000;
      ctx.shadowColor = layer.shadowColor || "rgba(0,0,0,0.28)";
      ctx.shadowBlur = 3.5 * U;
      const m0 = ctx.getTransform();
      ctx.shadowOffsetX = off * m0.a;
      ctx.shadowOffsetY = off * m0.b + 0.8 * U;
      roundRectPath(ctx, b.x - off, b.y, b.w, b.h, r);
      ctx.fillStyle = "#000";
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    roundRectPath(ctx, b.x, b.y, b.w, b.h, r);
    ctx.clip();

    if (bg) {
      // Draw the frame behind the pane in screen space, magnified a touch like a lens.
      const m = ctx.getTransform();
      const lx = b.x + b.w / 2, ly = b.y + b.h / 2;
      const cx = m.a * lx + m.c * ly + m.e, cy = m.b * lx + m.d * ly + m.f; // pane centre on screen
      const W = env.W, H = env.H;
      const half = Math.max(1, Math.min(b.w, b.h) / 2 * Math.hypot(m.a, m.b));
      const lens = 1 + (0.8 * U * refract) / half; // ~1u of magnification at the edge
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.filter = `blur(${(blurU * U).toFixed(1)}px) saturate(1.5) brightness(${tone === "dark" ? 0.75 : 1.06})`;
      ctx.translate(cx, cy);
      ctx.scale(lens, lens);
      ctx.translate(-cx, -cy);
      ctx.drawImage(bg, 0, 0, W, H);
      ctx.restore();

      // Edges bend the light more: a ring drawn with a stronger magnification.
      if (refract > 0) {
        const inset = Math.min(b.w, b.h) * 0.14;
        ctx.save();
        ctx.beginPath();
        roundRectPathTo(ctx, b.x, b.y, b.w, b.h, r);
        roundRectPathTo(ctx, b.x + inset, b.y + inset, b.w - 2 * inset, b.h - 2 * inset, Math.max(0, r - inset));
        ctx.clip("evenodd");
        const strong = 1 + (2.6 * U * refract) / half; // edges bend ~2.5u
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.filter = `blur(${(blurU * U * 1.3).toFixed(1)}px) saturate(1.7) brightness(1.1)`;
        ctx.translate(cx, cy);
        ctx.scale(strong, strong);
        ctx.translate(-cx, -cy);
        ctx.globalAlpha = 0.85;
        ctx.drawImage(bg, 0, 0, W, H);
        ctx.restore();
      }
    }

    // Tint and a soft vertical sheen.
    ctx.fillStyle = tint;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    const sheen = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
    sheen.addColorStop(0, `rgba(255,255,255,${0.22 * light})`);
    sheen.addColorStop(0.45, `rgba(255,255,255,${0.04 * light})`);
    sheen.addColorStop(1, `rgba(255,255,255,${0.1 * light})`);
    ctx.fillStyle = sheen;
    ctx.fillRect(b.x, b.y, b.w, b.h);

    // Inner glow along the rim.
    ctx.save();
    ctx.shadowColor = `rgba(255,255,255,${0.55 * light})`;
    ctx.shadowBlur = 1.6 * U;
    ctx.lineWidth = 0.5 * U;
    ctx.strokeStyle = `rgba(255,255,255,${0.35 * light})`;
    roundRectPath(ctx, b.x - 0.25 * U, b.y - 0.25 * U, b.w + 0.5 * U, b.h + 0.5 * U, r + 0.25 * U);
    ctx.stroke();
    ctx.restore();
    ctx.restore(); // clip

    // Specular rim: bright where the light hits (top-left), faint opposite.
    const spec = ctx.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h);
    spec.addColorStop(0, `rgba(255,255,255,${0.95 * light})`);
    spec.addColorStop(0.3, `rgba(255,255,255,${0.18 * light})`);
    spec.addColorStop(0.65, `rgba(255,255,255,${0.08 * light})`);
    spec.addColorStop(1, `rgba(255,255,255,${0.6 * light})`);
    ctx.lineWidth = Math.max(1, (layer.rim === undefined ? 0.28 : layer.rim) * U);
    ctx.strokeStyle = spec;
    roundRectPath(ctx, b.x + ctx.lineWidth / 2, b.y + ctx.lineWidth / 2, b.w - ctx.lineWidth, b.h - ctx.lineWidth, Math.max(0, r - ctx.lineWidth / 2));
    ctx.stroke();
  }
  function roundRectPathTo(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  // ── particles ────────────────────────────────────────────
  function drawParticles(ctx, layer, st, U, env) {
    const n = layer.count || 40;
    const rand = rng(layer.seed || 42);
    const colors = layer.colors || ["#ffd60a", "#ff375f", "#30d158", "#0a84ff", "#ffffff"];
    const life = layer.life || 1.6;
    const g = (layer.gravity === undefined ? 60 : layer.gravity) * U;
    const kind = layer.kind || "confetti";
    const spread = ((layer.spread === undefined ? 360 : layer.spread) * Math.PI) / 180;
    const dirA = (((layer.direction === undefined ? -90 : layer.direction) * Math.PI) / 180);
    for (let i = 0; i < n; i++) {
      const delay = rand() * (layer.burst === false ? st.span : 0.12);
      const lt = st.local - delay;
      const a = dirA + (rand() - 0.5) * spread;
      const sp = (layer.speed || 45) * U * (0.4 + rand() * 0.8);
      const size = (layer.size || 1.2) * U * (0.6 + rand() * 0.8);
      const color = colors[Math.floor(rand() * colors.length)];
      const spinSpeed = (rand() - 0.5) * 12;
      const wob = rand() * Math.PI * 2;
      if (lt < 0 || lt > life) continue;
      const drag = Math.exp(-lt * 1.4);
      const x = (Math.cos(a) * sp * (1 - drag)) / 1.4;
      const y = (Math.sin(a) * sp * (1 - drag)) / 1.4 + 0.5 * g * lt * lt * 0.35;
      const fade = clamp((life - lt) / (life * 0.35));
      ctx.save();
      ctx.translate(x, y);
      ctx.globalAlpha *= fade;
      if (kind === "confetti") {
        ctx.rotate(spinSpeed * lt);
        ctx.scale(1, Math.abs(Math.sin(lt * 6 + wob)) + 0.15);
        ctx.fillStyle = color;
        ctx.fillRect(-size / 2, -size / 4, size, size / 2);
      } else if (kind === "sparkle") {
        const s = size * (0.6 + 0.4 * Math.sin(lt * 14 + wob));
        ctx.fillStyle = color;
        ctx.beginPath();
        for (let k = 0; k < 8; k++) {
          const rr = k % 2 ? s * 0.25 : s;
          const aa = (k * Math.PI) / 4;
          ctx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr);
        }
        ctx.closePath();
        ctx.fill();
      } else if (kind === "emoji") {
        ctx.font = `${size * 2.2}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const list = layer.emoji || ["🔥"];
        ctx.fillText(list[i % list.length], 0, 0);
      } else {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // ── images (logos, stickers) ─────────────────────────────
  function drawImage(ctx, layer, st, U, env) {
    const img = env && env.images ? env.images[layer.src] : null;
    if (!img || !img.width) return;
    const b = shapeBox(st, layer, U);
    const ratio = img.width / img.height;
    let w = b.w, h = b.h;
    if (layer.fit !== "fill") {
      if (w / h > ratio) w = h * ratio; else h = w / ratio;
    }
    setShadow(ctx, layer.shadow, U);
    if (layer.radius) {
      ctx.save();
      roundRectPath(ctx, -w / 2, -h / 2, w, h, layer.radius * U);
      ctx.clip();
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();
    } else ctx.drawImage(img, -w / 2, -h / 2, w, h);
  }

  // ── one layer ────────────────────────────────────────────
  function isVisible(layer, t, scene) {
    if (layer.hidden) return false;
    const s = layer.start || 0;
    const e = layer.end === undefined ? scene.duration : layer.end;
    return t >= s && t < e;
  }

  function drawLayer(ctx, layer, t, scene, env) {
    if (!isVisible(layer, t, scene)) return;
    const st = layerState(layer, t, scene, env.rel);
    if (st.opacity <= 0.001) return;
    const U = env.U, W = env.W, H = env.H;
    ctx.save();
    // Top-level layers sit at fractions of the frame; children of a group at offsets in u.
    if (env.rel) ctx.translate((st.x + st.dx) * U, (st.y + st.dy) * U);
    else ctx.translate(st.x * W + st.dx * U, st.y * H + st.dy * U);
    if (st.rotation) ctx.rotate((st.rotation * Math.PI) / 180);
    if (st.skewX) ctx.transform(1, 0, Math.tan((st.skewX * Math.PI) / 180), 1, 0, 0);
    const sx = st.scale * st.sx, sy = st.scale * st.sy;
    if (sx !== 1 || sy !== 1) ctx.scale(sx, sy);
    ctx.globalAlpha *= clamp(st.opacity);
    if (layer.blend) ctx.globalCompositeOperation = layer.blend;
    if (st.blur > 0.01) ctx.filter = `blur(${(st.blur * U).toFixed(2)}px)`;

    if (st.clip) applyClip(ctx, st.clip, layer, st, U, env);

    switch (layer.type) {
      case "text": drawText(ctx, layer, st, U, t); break;
      case "rect": drawRect(ctx, layer, st, U); break;
      case "ellipse": case "circle": drawEllipse(ctx, layer, st, U); break;
      case "ring": drawRing(ctx, layer, st, U); break;
      case "path": drawPath(ctx, layer, st, U); break;
      case "glass": drawGlass(ctx, layer, st, U, env, t); break;
      case "particles": drawParticles(ctx, layer, st, U, env); break;
      case "image": drawImage(ctx, layer, st, U, env); break;
      case "group": {
        const inner = { ...env, rel: true };
        for (const child of layer.layers || []) drawLayer(ctx, child, t, scene, inner);
        break;
      }
      default: break;
    }
    ctx.restore();
  }

  function applyClip(ctx, clip, layer, st, U, env) {
    const p = clamp(clip.p);
    // Reveal inside a generous box around the layer.
    const big = Math.max(env.W, env.H) * 2;
    let w = big, h = big, ox = 0;
    if (layer.type === "rect" || layer.type === "glass" || layer.type === "image") {
      const b = shapeBox(st, layer, U);
      w = b.w * 1.4 + 4 * U; h = b.h * 1.4 + 4 * U;
    } else if (layer.type === "text") {
      const ctx2 = ctx;
      ctx2.save();
      const L = layoutText(ctx2, layer, st, U);
      ctx2.restore();
      w = L.blockW + L.sizePx * 1.4; h = L.blockH + L.sizePx * 0.8; ox = L.ox;
    }
    ctx.translate(ox, 0);
    ctx.beginPath();
    if (clip.dir === "right") ctx.rect(-w / 2, -h / 2, w * p, h);
    else if (clip.dir === "left") ctx.rect(w / 2 - w * p, -h / 2, w * p, h);
    else if (clip.dir === "down") ctx.rect(-w / 2, -h / 2, w, h * p);
    else if (clip.dir === "up") ctx.rect(-w / 2, h / 2 - h * p, w, h * p);
    else ctx.rect((-w / 2) * p, (-h / 2) * p, w * p, h * p);
    ctx.clip();
    ctx.translate(-ox, 0);
  }

  // ── public ───────────────────────────────────────────────
  /**
   * Draws the scene at time t. The canvas is cleared to transparent first.
   * opts.bg(t) → an image of the video behind the graphic (for liquid glass), optional.
   * opts.images → { src: HTMLImageElement } preloaded for image layers.
   */
  function render(ctx, scene, t, opts = {}) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    const U = Math.min(W, H) / 100;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.restore();
    const env = { W, H, U, bg: opts.bg || null, images: opts.images || {} };
    for (const layer of scene.layers || []) drawLayer(ctx, layer, t, scene, env);
  }

  /** Every image src the scene uses (so the caller can preload them). */
  function imagesOf(scene) {
    const out = new Set();
    const walk = (ls) => ls.forEach((l) => { if (l.type === "image" && l.src) out.add(l.src); if (l.layers) walk(l.layers); });
    walk(scene.layers || []);
    return [...out];
  }

  /** Every font family the scene uses. */
  function fontsOf(scene) {
    const out = new Set();
    const walk = (ls) => ls.forEach((l) => { if (l.type === "text") out.add(l.font || "Inter"); if (l.layers) walk(l.layers); });
    walk(scene.layers || []);
    return [...out];
  }

  const usesGlass = (scene) => JSON.stringify(scene.layers || []).indexOf('"glass"') !== -1;

  return { render, sample, ease, EASE, MOVES, parseColor, mix, layoutText, visualOrder, paragraphDir, layerState, imagesOf, fontsOf, usesGlass, rng, clamp };
});
