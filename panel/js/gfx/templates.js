/* PostKit motion gallery — every template is a function from options to a scene.
 * Options every template accepts: the text fields it lists, accent (colour), font,
 * y (0–1 vertical position), dur (seconds), plus anything in its own fields.
 */
(function (root, factory) {
  // Premiere's panel defines `module` when Node is on, so set the page global as well.
  const lib = factory();
  if (root) root.PKTemplates = lib;
  if (typeof module === "object" && module.exports) module.exports = lib;
})(typeof window !== "undefined" ? window : typeof self !== "undefined" ? self : null, function () {
  "use strict";

  const LIST = [];
  const BY_ID = {};
  /**
   * id, name, category, fields {key: default}, default duration, build(o) → layers,
   * extra: { y, accent, font, tags, glass }
   */
  function def(id, name, cat, fields, dur, build, extra = {}) {
    const t = { id, name, cat, fields, dur, build, y: extra.y === undefined ? 0.5 : extra.y, accent: extra.accent || "#ffd60a", font: extra.font || null, tags: extra.tags || [], glass: !!extra.glass, overlay: !!extra.overlay };
    LIST.push(t);
    BY_ID[id] = t;
  }

  // ── small builders ───────────────────────────────────────
  const txt = (text, o) => ({ type: "text", text, weight: 800, size: 10, maxWidth: 84, color: "#ffffff", ...o });
  const rect = (o) => ({ type: "rect", ...o });
  const glass = (o) => ({ type: "glass", ...o });
  const OUT = { type: "fade", dur: 0.25 };
  const shadow = { color: "rgba(0,0,0,0.45)", blur: 2.2, y: 0.5 };
  const lines = (s) => String(s).split("\n");

  // ════════════════════════════════════════════════════════
  // TITLES
  // ════════════════════════════════════════════════════════
  def("pop-words", "Pop words", "Titles", { text: "Make it pop" }, 2.6, (o) => [
    txt(o.text, { y: o.y, font: o.font || "Montserrat", weight: 900, size: 12, upper: true, stroke: { color: "#000", width: 0.8 }, shadow, split: "word", unit: { type: "pop", dur: 0.38, ease: "outBack", stagger: 0.09 }, out: OUT }),
  ]);

  def("rise-lines", "Rise", "Titles", { text: "Small habits,\nbig results" }, 3, (o) => [
    txt(o.text, { y: o.y, font: o.font || "Inter", weight: 900, size: 10.5, lineHeight: 1.05, shadow, split: "word", unit: { type: "rise", dur: 0.55, ease: "outQuart", stagger: 0.07 }, out: { type: "rise", dur: 0.3 } }),
  ]);

  def("typewriter", "Typewriter", "Titles", { text: "Here's what nobody tells you" }, 3.2, (o) => [
    txt(o.text, { y: o.y, font: o.font || "JetBrains Mono", weight: 700, size: 7, maxWidth: 80, color: "#f5f5f5", box: { fill: "rgba(10,10,12,0.85)", padX: 0.6, padY: 0.35, radius: 0.2 }, in: { type: "typewriter", dur: Math.min(1.8, String(o.text).length * 0.05), ease: "linear" }, out: OUT }),
  ]);

  def("marker", "Marker highlight", "Titles", { text: "This changes everything" }, 3, (o) => [
    txt(o.text, { y: o.y, font: o.font || "Poppins", weight: 800, size: 9, color: "#111", box: { fill: o.accent, radius: 0.12, padX: 0.35, padY: 0.12, mode: "block", reveal: [[0.05, 0], [0.45, 1, "outQuart"]] }, in: { type: "fade", dur: 0.2, delay: 0.25 }, out: OUT }),
  ]);

  def("kinetic-stack", "Kinetic stack", "Titles", { text: "Work\nhard\nstay\nhumble" }, 3, (o) =>
    lines(o.text).map((l, i, all) =>
      txt(l, { y: (o.y || 0.5) + (i - (all.length - 1) / 2) * 0.085, font: o.font || "Anton", weight: 400, size: 15, upper: true, color: i % 2 ? o.accent : "#fff", shadow, in: { type: i % 2 ? "flyRight" : "flyLeft", dur: 0.45, ease: "outExpo", delay: i * 0.12 }, out: { type: i % 2 ? "slideLeft" : "slideRight", dur: 0.25 } }),
    ), { font: "Anton" });

  def("glitch", "Glitch", "Titles", { text: "SYSTEM ERROR" }, 2.4, (o) => [
    txt(o.text, { y: o.y, font: o.font || "Space Grotesk", weight: 700, size: 11, upper: true, seed: 9, in: { type: "glitch", dur: 0.7, ease: "linear" }, out: { type: "glitch", dur: 0.35, ease: "linear" }, loop: { type: "flicker", amount: 0.3, speed: 0.5 } }),
  ], { tags: ["tech"] });

  def("neon", "Neon sign", "Titles", { text: "Open late" }, 3, (o) => [
    txt(o.text, { y: o.y, font: o.font || "Caveat", weight: 700, size: 15, color: "#fff", glow: { color: o.accent, blur: 3.5, strength: 3 }, in: { type: "fade", dur: 0.6, ease: "linear" }, loop: { type: "flicker", amount: 0.6, speed: 0.6 }, out: OUT }),
  ], { accent: "#ff2bd6" });

  def("elastic-chars", "Elastic", "Titles", { text: "Boing!" }, 2.4, (o) => [
    txt(o.text, { y: o.y, font: o.font || "Poppins", weight: 800, size: 16, color: o.accent, stroke: { color: "#1a1a1a", width: 1 }, split: "char", unit: { type: "pop", dur: 0.7, ease: "outElastic", stagger: 0.05 }, out: { type: "zoomOut", dur: 0.25, ease: "inBack" } }),
  ]);

  def("bounce-drop", "Bounce drop", "Titles", { text: "Drop it like this" }, 2.6, (o) => [
    txt(o.text, { y: o.y, font: o.font || "Archivo Black", weight: 400, size: 10, shadow, split: "word", unit: { type: "drop", dur: 0.6, ease: "outBounce", stagger: 0.1 }, out: OUT }),
  ]);

  def("blur-chars", "Soft focus", "Titles", { text: "Slow down" }, 3, (o) => [
    txt(o.text, { y: o.y, font: o.font || "DM Serif Display", weight: 400, size: 14, split: "char", tracking: 0.02, unit: { type: "blur", dur: 0.7, ease: "out", stagger: 0.06, order: "random" }, out: { type: "blur", dur: 0.4 }, shadow }),
  ]);

  def("bar-wipe", "Bar wipe", "Titles", { text: "Chapter one" }, 3, (o) => [
    rect({ y: o.y, w: 70, h: 12, fill: o.accent, keys: { sx: [[0, 0.001, "inOutExpo"], [0.35, 1], [0.6, 1, "inOutExpo"], [0.9, 0.001]] }, anchorX: 0.5, end: 1 }),
    txt(o.text, { y: o.y, font: o.font || "Montserrat", weight: 900, size: 9, upper: true, tracking: 0.04, in: { type: "wipeRight", dur: 0.45, delay: 0.5, ease: "outQuart" }, out: { type: "wipeLeft", dur: 0.3 }, shadow }),
  ]);

  def("outline-fill", "Outline fill", "Titles", { text: "FOCUS" }, 3, (o) => [
    txt(o.text, { y: o.y, font: o.font || "Anton", weight: 400, size: 24, fill: "none", stroke: { color: "#fff", width: 0.35 }, in: { type: "fade", dur: 0.3 }, out: OUT }),
    txt(o.text, { y: o.y, font: o.font || "Anton", weight: 400, size: 24, color: o.accent, in: { type: "wipeUp", dur: 0.8, delay: 0.35, ease: "inOut" }, out: OUT }),
  ]);

  def("gradient-zoom", "Gradient zoom", "Titles", { text: "Next level" }, 2.6, (o) => [
    txt(o.text, { y: o.y, font: o.font || "Montserrat", weight: 900, size: 13, fill: { type: "linear", angle: 90, stops: [[0, "#ff9a3c"], [0.5, "#ff3d77"], [1, "#7a5cff"]] }, shadow, in: { type: "zoomIn", dur: 0.5, ease: "outExpo" }, loop: { type: "drift", amount: 1.5 }, out: { type: "zoomOut", dur: 0.25 } }),
  ]);

  def("serif-elegant", "Elegant", "Titles", { text: "A quiet morning" }, 3.4, (o) => [
    txt(o.text, { y: o.y, font: o.font || "Playfair Display", weight: 700, italic: true, size: 11, split: "char", unit: { type: "rise", dur: 0.8, ease: "outQuart", stagger: 0.035 }, out: { type: "fade", dur: 0.5 }, shadow: { color: "rgba(0,0,0,0.35)", blur: 3, y: 0.3 } }),
    rect({ y: (o.y || 0.5) + 0.055, w: 18, h: 0.3, fill: "#fff", keys: { sx: [[0.8, 0.001, "outQuart"], [1.5, 1]] }, out: OUT }),
  ]);

  def("handwritten-underline", "Handwritten", "Titles", { text: "Day 1 of 100" }, 3, (o) => [
    txt(o.text, { y: o.y, font: o.font || "Permanent Marker", weight: 400, size: 12, color: "#fff", shadow, in: { type: "pop", dur: 0.4, ease: "outBack" }, out: OUT }),
    { type: "path", x: 0.5, y: (o.y || 0.5) + 0.05, d: "M-30 0 C -15 -2.5, 10 2.5, 30 -1", stroke: { color: o.accent, width: 1.4 }, keys: { trim: [[0.3, 0, "out"], [0.85, 1]] }, out: OUT },
  ]);

  def("extrude-3d", "3D pop", "Titles", { text: "WOW" }, 2.4, (o) => [
    txt(o.text, { y: o.y, font: o.font || "Bangers", weight: 400, size: 22, color: o.accent, stroke: { color: "#111", width: 0.7 }, extrude: { color: "#111", depth: 1.6, angle: 150 }, in: { type: "pop", dur: 0.45, ease: "outBack" }, loop: { type: "wiggle", amount: 0.5, speed: 0.8 }, out: { type: "zoomOut", dur: 0.2, ease: "inBack" } }),
  ]);

  def("breaking", "Breaking news", "Titles", { text: "BREAKING", sub: "It's finally here" }, 3.5, (o) => [
    rect({ y: o.y, w: 78, h: 10, fill: "#e0202e", radius: 0.6, in: { type: "wipeRight", dur: 0.35, ease: "outExpo" }, out: { type: "wipeLeft", dur: 0.25 } }),
    txt(o.text, { y: o.y, font: "Anton", weight: 400, size: 7.5, tracking: 0.08, in: { type: "slideLeft", dur: 0.35, delay: 0.25 }, out: OUT }),
    rect({ y: (o.y || 0.5) + 0.052, w: 78, h: 7, fill: "#fff", radius: 0.6, in: { type: "wipeRight", dur: 0.35, delay: 0.3, ease: "outExpo" }, out: { type: "wipeLeft", dur: 0.25 } }),
    txt(o.sub, { y: (o.y || 0.5) + 0.052, font: "Inter", weight: 700, size: 4.2, color: "#111", in: { type: "fade", dur: 0.3, delay: 0.55 }, out: OUT }),
  ], { tags: ["news"] });

  def("chapter-number", "Chapter number", "Titles", { num: "01", text: "The setup" }, 3.2, (o) => [
    txt(o.num, { y: (o.y || 0.5) - 0.05, font: "Bebas Neue", weight: 400, size: 26, color: o.accent, in: { type: "rise", dur: 0.6, ease: "outQuart" }, out: OUT }),
    rect({ y: o.y, w: 30, h: 0.35, fill: "#fff", keys: { sx: [[0.2, 0.001, "outExpo"], [0.8, 1]] }, out: OUT }),
    txt(o.text, { y: (o.y || 0.5) + 0.035, font: o.font || "Inter", weight: 700, size: 6, upper: true, tracking: 0.15, in: { type: "slideUp", dur: 0.5, delay: 0.4 }, out: OUT }),
  ]);

  def("quote", "Quote", "Titles", { text: "Done is better than perfect.", by: "— Sheryl Sandberg" }, 4, (o) => [
    txt("“", { y: (o.y || 0.5) - 0.09, font: "Playfair Display", weight: 900, size: 30, color: o.accent, in: { type: "pop", dur: 0.4, ease: "outBack" }, out: OUT }),
    txt(o.text, { y: o.y, font: o.font || "Playfair Display", weight: 700, size: 7.5, maxWidth: 78, lineHeight: 1.25, split: "word", unit: { type: "fade", dur: 0.4, stagger: 0.08, delay: 0.3 }, out: OUT, shadow }),
    txt(o.by, { y: (o.y || 0.5) + 0.09, font: "Inter", weight: 500, size: 4, color: "rgba(255,255,255,0.8)", in: { type: "fade", dur: 0.5, delay: 1.1 }, out: OUT }),
  ]);

  def("spin-words", "Spin in", "Titles", { text: "Turn it around" }, 2.6, (o) => [
    txt(o.text, { y: o.y, font: o.font || "Poppins", weight: 800, size: 10, shadow, split: "word", unit: { type: "spin", dur: 0.55, ease: "outBack", stagger: 0.1 }, out: OUT }),
  ]);

  def("stretch-chars", "Squash & stretch", "Titles", { text: "Jelly" }, 2.4, (o) => [
    txt(o.text, { y: o.y, font: o.font || "Archivo Black", weight: 400, size: 18, color: o.accent, stroke: { color: "#000", width: 0.6 }, split: "char", unit: { type: "stretch", dur: 0.55, ease: "outElastic", stagger: 0.06 }, out: OUT }),
  ], { accent: "#7cf2c8" });

  def("box-reveal", "Box reveal", "Titles", { text: "Behind the scenes" }, 3, (o) => [
    rect({ y: o.y, w: 80, h: 13, radius: 1.2, fill: "#111", keys: { sx: [[0, 0.001, "inOutExpo"], [0.4, 1]] }, out: { type: "flipY", dur: 0.25 } }),
    txt(o.text, { y: o.y, font: o.font || "Inter", weight: 800, size: 6.5, color: "#fff", in: { type: "slideUp", dur: 0.4, delay: 0.35, ease: "outQuart" }, out: OUT }),
  ]);

  def("arabic-bold", "Arabic bold", "Titles", { text: "خليك معنا للآخر" }, 2.8, (o) => [
    txt(o.text, { y: o.y, font: o.font || "Lalezar", weight: 400, size: 13, color: "#fff", stroke: { color: "#000", width: 0.6 }, shadow, split: "word", unit: { type: "rise", dur: 0.5, ease: "outQuart", stagger: 0.12 }, out: OUT }),
  ], { tags: ["arabic"] });

  def("bilingual", "Bilingual", "Titles", { text: "يلّا نبلّش", sub: "Let's get started" }, 3, (o) => [
    txt(o.text, { y: (o.y || 0.5) - 0.03, font: "Cairo", weight: 900, size: 11, color: "#fff", shadow, in: { type: "rise", dur: 0.55, ease: "outQuart" }, out: OUT }),
    txt(o.sub, { y: (o.y || 0.5) + 0.035, font: "Inter", weight: 700, size: 5.2, color: o.accent, upper: true, tracking: 0.12, in: { type: "rise", dur: 0.55, delay: 0.15, ease: "outQuart" }, out: OUT }),
  ], { tags: ["arabic"] });

  def("emoji-title", "Emoji title", "Titles", { text: "Big news", emoji: "🎉" }, 2.8, (o) => [
    txt(o.emoji, { y: (o.y || 0.5) - 0.07, size: 16, font: "Apple Color Emoji", in: { type: "drop", dur: 0.6, ease: "outBounce" }, loop: { type: "wiggle", amount: 0.8 }, out: OUT }),
    { type: "particles", y: (o.y || 0.5) - 0.07, kind: "sparkle", count: 14, colors: [o.accent, "#fff"], speed: 30, gravity: 0, size: 1.6, life: 1.2, start: 0.35, end: 2 },
    txt(o.text, { y: (o.y || 0.5) + 0.02, font: o.font || "Montserrat", weight: 900, size: 10, shadow, split: "word", unit: { type: "pop", dur: 0.35, ease: "outBack", stagger: 0.08, delay: 0.3 }, out: OUT }),
  ]);

  def("countdown", "3-2-1", "Titles", {}, 3, (o) =>
    ["3", "2", "1"].map((n, i) => txt(n, { y: o.y, font: "Anton", weight: 400, size: 40, color: i === 2 ? o.accent : "#fff", shadow, start: i, end: i + 1, in: { type: "zoomIn", dur: 0.35, ease: "outExpo" }, out: { type: "zoomOut", dur: 0.2 } })),
  );

  def("stamp", "Stamp", "Titles", { text: "APPROVED" }, 2.6, (o) => [
    {
      type: "group", y: o.y, rotation: -10, in: { type: "zoomIn", dur: 0.25, ease: "outQuart", amount: 1.6 }, out: OUT,
      layers: [rect({ w: 72, h: 16, radius: 1.5, fill: "none", stroke: { color: o.accent, width: 1.2 } }), txt(o.text, { font: "Bebas Neue", weight: 400, size: 12, color: o.accent, tracking: 0.12 })],
    },
  ], { accent: "#ff3b30" });

  def("split-slide", "Split slide", "Titles", { text: "Before", sub: "After" }, 3, (o) => [
    txt(o.text, { y: (o.y || 0.5) - 0.04, font: o.font || "Montserrat", weight: 900, size: 12, upper: true, in: { type: "flyLeft", dur: 0.5, ease: "outExpo" }, out: { type: "slideRight", dur: 0.3 }, shadow }),
    txt(o.sub, { y: (o.y || 0.5) + 0.04, font: o.font || "Montserrat", weight: 900, size: 12, upper: true, color: o.accent, in: { type: "flyRight", dur: 0.5, delay: 0.12, ease: "outExpo" }, out: { type: "slideLeft", dur: 0.3 }, shadow }),
  ]);

  def("minimal-fade", "Minimal", "Titles", { text: "Episode 4" }, 3, (o) => [
    txt(o.text, { y: o.y, font: o.font || "Inter", weight: 500, size: 6, tracking: 0.25, upper: true, in: { type: "fade", dur: 0.8 }, out: { type: "fade", dur: 0.6 }, shadow: { color: "rgba(0,0,0,0.4)", blur: 2, y: 0 } }),
  ]);

  def("skew-slam", "Skew slam", "Titles", { text: "No excuses" }, 2.4, (o) => [
    txt(o.text, { y: o.y, font: o.font || "Anton", weight: 400, size: 16, upper: true, italic: false, skewX: -8, color: "#fff", shadow, in: { type: "skew", dur: 0.4, ease: "outExpo", amount: 2 }, loop: { type: "shake", amount: 0.3 }, out: OUT }),
  ]);

  def("subtitle-card", "Title + subtitle", "Titles", { text: "How I edit in 10 minutes", sub: "Full workflow" }, 3.4, (o) => [
    txt(o.sub, { y: (o.y || 0.5) - 0.06, font: "Inter", weight: 700, size: 4.4, color: "#111", upper: true, tracking: 0.12, box: { fill: o.accent, padX: 0.6, padY: 0.25, radius: 0.3 }, in: { type: "pop", dur: 0.35, ease: "outBack" }, out: OUT }),
    txt(o.text, { y: (o.y || 0.5) + 0.01, font: o.font || "Montserrat", weight: 900, size: 8.5, maxWidth: 82, lineHeight: 1.08, shadow, split: "word", unit: { type: "rise", dur: 0.45, stagger: 0.05, delay: 0.15, ease: "outQuart" }, out: OUT }),
  ]);

  def("cinematic", "Cinematic", "Titles", { text: "THE JOURNEY" }, 4, (o) => [
    rect({ x: 0.5, y: 0, w: 400, h: 12, anchorY: 0, fill: "#000", keys: { y: [[0, -0.08, "outQuart"], [0.8, 0]] }, out: { type: "fade", dur: 0.5 } }),
    rect({ x: 0.5, y: 1, w: 400, h: 12, anchorY: 1, fill: "#000", keys: { y: [[0, 1.08, "outQuart"], [0.8, 1]] }, out: { type: "fade", dur: 0.5 } }),
    txt(o.text, { y: o.y, font: o.font || "Playfair Display", weight: 700, size: 8, tracking: 0.35, upper: true, in: { type: "blur", dur: 1.2 }, out: { type: "blur", dur: 0.6 } }),
  ]);

  // ════════════════════════════════════════════════════════
  // LIQUID GLASS
  // ════════════════════════════════════════════════════════
  const G = { glass: true };

  def("glass-pill", "Glass pill", "Liquid glass", { text: "Watch till the end" }, 3, (o) => [
    { type: "group", y: o.y, in: { type: "pop", dur: 0.5, ease: "outBack" }, out: { type: "zoomOut", dur: 0.25, ease: "inBack" }, layers: [
      glass({ w: Math.min(90, 10 + String(o.text).length * 3.1), h: 11, radius: 5.5 }),
      txt(o.text, { font: o.font || "Inter", weight: 700, size: 5, shadow: { color: "rgba(0,0,0,0.25)", blur: 1, y: 0.2 } }),
    ] },
  ], G);

  def("glass-card", "Glass title card", "Liquid glass", { text: "5 editing tricks", sub: "that save hours" }, 3.6, (o) => [
    { type: "group", y: o.y, in: { type: "rise", dur: 0.6, ease: "outQuart", amount: 2 }, out: { type: "blur", dur: 0.3 }, layers: [
      glass({ w: 80, h: 34, radius: 6 }),
      txt(o.text, { y: -4, font: o.font || "Montserrat", weight: 900, size: 8.5, maxWidth: 70, shadow: { color: "rgba(0,0,0,0.3)", blur: 1.5, y: 0.3 }, split: "word", unit: { type: "rise", dur: 0.5, stagger: 0.06, delay: 0.25, ease: "outQuart" } }),
      txt(o.sub, { y: 7, font: "Inter", weight: 500, size: 4.6, color: "rgba(255,255,255,0.88)", in: { type: "fade", dur: 0.5, delay: 0.6 } }),
    ] },
  ], G);

  def("glass-lower", "Glass lower third", "Liquid glass", { text: "George Charbel", sub: "Designer · Beirut" }, 4, (o) => [
    { type: "group", x: 0.08, y: o.y, in: { type: "slideRight", dur: 0.55, ease: "outQuart" }, out: { type: "slideRight", dur: 0.3 }, layers: [
      glass({ x: 30, w: 60, h: 15, radius: 4, anchorX: 0.5 }),
      { type: "ellipse", x: 5.5, w: 6, h: 6, fill: o.accent },
      txt(o.text, { x: 11, y: -2.4, font: o.font || "Inter", weight: 800, size: 4.6, align: "left", maxWidth: 46 }),
      txt(o.sub, { x: 11, y: 3, font: "Inter", weight: 500, size: 3.3, align: "left", color: "rgba(255,255,255,0.82)", maxWidth: 46 }),
    ] },
  ], { glass: true, y: 0.68 });

  def("glass-notification", "Glass notification", "Liquid glass", { text: "PostKit", sub: "Your reel is ready to post 🎬", emoji: "✂️" }, 3.6, (o) => [
    { type: "group", y: 0.1, in: { type: "drop", dur: 0.6, ease: "outBack", amount: 0.8 }, out: { type: "slideDown", dur: 0.35, amount: -1 }, layers: [
      glass({ w: 88, h: 17, radius: 5, tone: "dark" }),
      rect({ x: -35, w: 9, h: 9, radius: 2.2, fill: { type: "linear", angle: 160, stops: [[0, o.accent], [1, "#ff8a00"]] } }),
      txt(o.emoji, { x: -35, size: 4.6, font: "Apple Color Emoji" }),
      txt(o.text, { x: -28, y: -2.6, font: "Inter", weight: 700, size: 3.6, align: "left", maxWidth: 60 }),
      txt("now", { x: 39, y: -2.6, font: "Inter", weight: 500, size: 2.8, color: "rgba(255,255,255,0.6)", align: "right" }),
      txt(o.sub, { x: -28, y: 2.6, font: "Inter", weight: 500, size: 3.4, align: "left", maxWidth: 64, color: "rgba(255,255,255,0.9)" }),
    ] },
  ], { glass: true, y: 0.1 });

  def("glass-button", "Glass button", "Liquid glass", { text: "Follow for more", emoji: "👆" }, 3.2, (o) => [
    { type: "group", y: o.y, in: { type: "pop", dur: 0.5, ease: "outBack" }, loop: { type: "pulse", amount: 0.8, speed: 1.2 }, out: { type: "zoomOut", dur: 0.25 }, layers: [
      glass({ w: 64, h: 13, radius: 6.5, tint: "rgba(255,255,255,0.22)" }),
      txt(o.text, { x: -3, font: o.font || "Poppins", weight: 800, size: 5, shadow: { color: "rgba(0,0,0,0.25)", blur: 1, y: 0.2 } }),
      txt(o.emoji, { x: 25, size: 5, font: "Apple Color Emoji" }),
    ] },
  ], { glass: true, y: 0.62 });

  def("glass-search", "Glass search bar", "Liquid glass", { text: "how to edit faster" }, 3.6, (o) => [
    { type: "group", y: o.y, in: { type: "pop", dur: 0.45, ease: "outBack" }, out: OUT, layers: [
      glass({ w: 84, h: 12, radius: 6 }),
      { type: "ellipse", x: -35, w: 3.6, h: 3.6, fill: "none", stroke: { color: "#fff", width: 0.55 } },
      { type: "path", x: 0, y: 0, d: "M-32.2 1.3 L-30.6 2.9", stroke: { color: "#fff", width: 0.6 } },
      txt(o.text, { x: -28, font: "Inter", weight: 500, size: 4.4, align: "left", maxWidth: 60, in: { type: "typewriter", dur: Math.min(1.6, String(o.text).length * 0.07), delay: 0.4, ease: "linear" } }),
    ] },
  ], G);

  def("glass-bubble", "Glass message", "Liquid glass", { text: "wait… you edited this in Premiere??" }, 3.4, (o) => [
    { type: "group", x: 0.62, y: o.y, in: { type: "pop", dur: 0.45, ease: "outBack" }, out: OUT, layers: [
      glass({ w: 62, h: 15, radius: 5, tint: "rgba(10,132,255,0.35)" }),
      txt(o.text, { font: "Inter", weight: 500, size: 4, maxWidth: 54, lineHeight: 1.2 }),
    ] },
  ], G);

  def("glass-progress", "Glass progress bar", "Liquid glass", {}, 10, (o) => [
    { type: "group", y: 0.06, in: { type: "fade", dur: 0.3 }, out: OUT, layers: [
      glass({ w: 86, h: 3.2, radius: 1.6, frost: 1.4, rim: 0.18 }),
      rect({ x: -42.6, w: 85.2, h: 1.8, radius: 0.9, anchorX: 0, fill: o.accent, keys: { progress: [[0, 0, "linear"], [o.dur || 10, 1]] } }),
    ] },
  ], { glass: true, y: 0.06 });

  def("glass-stat", "Glass stat", "Liquid glass", { from: 0, to: 1250000, prefix: "", suffix: "", sub: "views in 48 hours" }, 3.6, (o) => [
    { type: "group", y: o.y, in: { type: "rise", dur: 0.5, ease: "outQuart", amount: 2 }, out: OUT, layers: [
      glass({ w: 74, h: 28, radius: 6 }),
      txt("", { y: -3, font: "Montserrat", weight: 900, size: 11, count: { from: +o.from || 0, to: +o.to || 0, dur: 1.6, prefix: o.prefix, suffix: o.suffix } }),
      txt(o.sub, { y: 7, font: "Inter", weight: 500, size: 4, color: "rgba(255,255,255,0.85)" }),
    ] },
  ], G);

  def("glass-list", "Glass checklist", "Liquid glass", { text: "Hook in 2 seconds\nCut every pause\nCaptions on" }, 4, (o) =>
    lines(o.text).map((l, i, all) => ({
      type: "group", x: 0.5, y: (o.y || 0.5) + (i - (all.length - 1) / 2) * 0.075, in: { type: "slideRight", dur: 0.5, delay: 0.25 * i, ease: "outQuart" }, out: OUT, layers: [
        glass({ w: 80, h: 11, radius: 3.5 }),
        { type: "ellipse", x: -33, w: 5.4, h: 5.4, fill: o.accent, in: { type: "pop", dur: 0.35, delay: 0.25 * i + 0.25, ease: "outBack" } },
        { type: "path", x: 0, y: 0, d: "M-34.6 0.1 L-33.3 1.4 L-31.2 -1.2", stroke: { color: "#111", width: 0.7 }, keys: { trim: [[0.25 * i + 0.35, 0], [0.25 * i + 0.6, 1]] } },
        txt(l, { x: -27, font: o.font || "Inter", weight: 700, size: 4.5, align: "left", maxWidth: 58 }),
      ],
    })), G);

  def("glass-badge", "Glass emoji badge", "Liquid glass", { emoji: "🔥" }, 3, (o) => [
    { type: "group", y: o.y, in: { type: "pop", dur: 0.5, ease: "outBack" }, loop: { type: "float", amount: 1 }, out: { type: "zoomOut", dur: 0.25 }, layers: [
      glass({ w: 24, h: 24, radius: 12 }),
      txt(o.emoji, { size: 11, font: "Apple Color Emoji", loop: { type: "wiggle", amount: 0.6 } }),
    ] },
  ], G);

  def("glass-tag", "Glass chapter tag", "Liquid glass", { text: "Part 2" }, 3, (o) => [
    { type: "group", x: 0.2, y: 0.12, in: { type: "slideRight", dur: 0.45, ease: "outQuart" }, out: OUT, layers: [
      glass({ w: 28, h: 9, radius: 4.5, rim: 0.2 }),
      txt(o.text, { font: o.font || "Inter", weight: 700, size: 4, upper: true, tracking: 0.08 }),
    ] },
  ], { glass: true, y: 0.12 });

  def("glass-quote", "Glass quote", "Liquid glass", { text: "The best camera is the one you have with you." }, 4, (o) => [
    { type: "group", y: o.y, in: { type: "rise", dur: 0.6, ease: "outQuart", amount: 2 }, out: { type: "blur", dur: 0.35 }, layers: [
      glass({ w: 82, h: 36, radius: 5, tone: "dark" }),
      txt("“", { x: -31, y: -11, font: "Playfair Display", weight: 900, size: 14, color: o.accent }),
      txt(o.text, { y: 2, font: o.font || "Playfair Display", weight: 700, italic: true, size: 5.6, maxWidth: 68, lineHeight: 1.25, split: "word", unit: { type: "fade", stagger: 0.05, delay: 0.3 } }),
    ] },
  ], G);

  def("glass-timer", "Glass timer", "Liquid glass", { seconds: 5 }, 5, (o) => {
    const s = Math.max(1, +o.seconds || 5);
    return [{ type: "group", y: o.y, in: { type: "pop", dur: 0.45, ease: "outBack" }, out: OUT, layers: [
      glass({ w: 30, h: 30, radius: 15 }),
      { type: "ring", w: 23, width: 1.6, track: "rgba(255,255,255,0.25)", color: o.accent, keys: { progress: [[0, 1, "linear"], [s, 0]] } },
      txt("", { font: "Montserrat", weight: 900, size: 9, count: { from: s, to: 0, dur: s, ease: "linear", separator: false } }),
    ] }];
  }, G);

  def("glass-poll", "Glass poll", "Liquid glass", { text: "Which one?", a: "Option A", b: "Option B", pa: 64 }, 4, (o) => {
    const pa = Math.max(0, Math.min(100, +o.pa || 50)) / 100;
    const row = (label, p, y, d) => [
      rect({ x: -36, y, w: 72 * p, h: 8, radius: 2.4, anchorX: 0, fill: withA(o.accent, 0.55), keys: { progress: [[d, 0, "outQuart"], [d + 0.8, 1]] } }),
      txt(label, { x: -33, y, font: "Inter", weight: 700, size: 3.8, align: "left", maxWidth: 50 }),
      txt(Math.round(p * 100) + "%", { x: 33, y, font: "Inter", weight: 800, size: 3.8, align: "right", in: { type: "fade", delay: d + 0.5 } }),
    ];
    return [{ type: "group", y: o.y, in: { type: "rise", dur: 0.5, ease: "outQuart", amount: 2 }, out: OUT, layers: [
      glass({ w: 80, h: 38, radius: 5 }),
      txt(o.text, { y: -11, font: o.font || "Inter", weight: 800, size: 5, maxWidth: 70 }),
      ...row(o.a, pa, 0, 0.5), ...row(o.b, 1 - pa, 10, 0.7),
    ] }];
  }, G);

  def("glass-player", "Glass music player", "Liquid glass", { text: "Sunset Drive", sub: "Lo-fi beats" }, 6, (o) => [
    { type: "group", y: o.y, in: { type: "rise", dur: 0.5, ease: "outQuart", amount: 2 }, out: OUT, layers: [
      glass({ w: 82, h: 24, radius: 5.5, tone: "dark" }),
      rect({ x: -31, y: -2, w: 14, h: 14, radius: 2.4, fill: { type: "linear", angle: 135, stops: [[0, o.accent], [1, "#7a5cff"]] } }),
      txt(o.text, { x: -21, y: -5.2, font: "Inter", weight: 800, size: 4.2, align: "left", maxWidth: 52 }),
      txt(o.sub, { x: -21, y: -0.3, font: "Inter", weight: 500, size: 3.2, align: "left", color: "rgba(255,255,255,0.7)", maxWidth: 52 }),
      rect({ x: -21, y: 6, w: 54, h: 0.9, radius: 0.45, anchorX: 0, fill: "rgba(255,255,255,0.25)" }),
      rect({ x: -21, y: 6, w: 54, h: 0.9, radius: 0.45, anchorX: 0, fill: "#fff", keys: { progress: [[0, 0.05, "linear"], [o.dur || 6, 0.95]] } }),
      { type: "path", x: 0, y: 0, d: "M32 -6 L32 0 M35 -6 L35 0", stroke: { color: "#fff", width: 1.1 } },
    ] },
  ], G);

  def("glass-frame", "Glass frame", "Liquid glass", {}, 4, (o) => [
    { type: "group", y: o.y, in: { type: "zoomIn", dur: 0.6, ease: "outExpo", amount: 0.2 }, out: OUT, layers: [
      glass({ w: 92, h: 92 * 1.25, radius: 6, frost: 0.6, tint: "rgba(255,255,255,0.03)", light: 1.2, refract: 1.5 }),
    ] },
  ], G);

  // ════════════════════════════════════════════════════════
  // LOWER THIRDS
  // ════════════════════════════════════════════════════════
  const LT = { y: 0.68 };
  def("lt-bar", "Accent bar", "Lower thirds", { text: "Maya Haddad", sub: "Founder, Studio M" }, 4, (o) => [
    rect({ x: 0.08, y: o.y, w: 1.2, h: 12, fill: o.accent, keys: { sy: [[0, 0.001, "outExpo"], [0.4, 1]] }, out: { type: "flipY", dur: 0.2 } }),
    txt(o.text, { x: 0.08, y: (o.y || 0.68) - 0.012, font: o.font || "Montserrat", weight: 900, size: 5.5, align: "left", in: { type: "wipeRight", dur: 0.5, delay: 0.25 }, out: { type: "wipeLeft", dur: 0.3 }, shadow, maxWidth: 70 }),
    txt(o.sub, { x: 0.08, y: (o.y || 0.68) + 0.02, font: "Inter", weight: 500, size: 3.6, align: "left", color: "rgba(255,255,255,0.9)", in: { type: "wipeRight", dur: 0.5, delay: 0.4 }, out: { type: "wipeLeft", dur: 0.3 }, shadow, maxWidth: 70 }),
  ], LT);

  def("lt-box", "Two-tone box", "Lower thirds", { text: "Karim Nassar", sub: "Chef" }, 4, (o) => [
    txt(o.text, { x: 0.08, y: o.y, font: o.font || "Inter", weight: 800, size: 5, align: "left", color: "#111", box: { fill: "#fff", padX: 0.45, padY: 0.25, radius: 0.1 }, in: { type: "wipeRight", dur: 0.45, ease: "outQuart" }, out: { type: "wipeLeft", dur: 0.3 } }),
    txt(o.sub, { x: 0.08, y: (o.y || 0.68) + 0.033, font: "Inter", weight: 700, size: 3.4, align: "left", color: "#111", upper: true, tracking: 0.1, box: { fill: o.accent, padX: 0.5, padY: 0.3, radius: 0.1 }, in: { type: "wipeRight", dur: 0.45, delay: 0.2, ease: "outQuart" }, out: { type: "wipeLeft", dur: 0.3 } }),
  ], LT);

  def("lt-line", "Minimal line", "Lower thirds", { text: "Lina Saad", sub: "Architect" }, 4, (o) => [
    txt(o.text, { y: (o.y || 0.68) - 0.015, font: o.font || "Inter", weight: 700, size: 5, in: { type: "slideUp", dur: 0.5, ease: "outQuart" }, out: OUT, shadow }),
    rect({ y: o.y, w: 34, h: 0.3, fill: "#fff", keys: { sx: [[0.1, 0.001, "outExpo"], [0.7, 1]] }, out: OUT }),
    txt(o.sub, { y: (o.y || 0.68) + 0.015, font: "Inter", weight: 500, size: 3.4, color: "rgba(255,255,255,0.85)", upper: true, tracking: 0.2, in: { type: "slideDown", dur: 0.5, delay: 0.2, ease: "outQuart" }, out: OUT, shadow }),
  ], LT);

  def("lt-slant", "Slanted", "Lower thirds", { text: "Tony Khoury", sub: "Coach" }, 4, (o) => [
    rect({ x: 0.3, y: o.y, w: 52, h: 10, fill: o.accent, skewX: -14, in: { type: "flyRight", dur: 0.5, ease: "outExpo" }, out: { type: "flyRight", dur: 0.3, ease: "in" } }),
    txt(o.text, { x: 0.3, y: o.y, font: o.font || "Anton", weight: 400, size: 6, color: "#111", upper: true, in: { type: "fade", dur: 0.3, delay: 0.3 }, out: OUT }),
    txt(o.sub, { x: 0.3, y: (o.y || 0.68) + 0.04, font: "Inter", weight: 700, size: 3.4, color: "#fff", upper: true, tracking: 0.12, box: { fill: "#111", padX: 0.5, padY: 0.3, radius: 0 }, skewX: -14, in: { type: "flyRight", dur: 0.5, delay: 0.12, ease: "outExpo" }, out: OUT }),
  ], LT);

  def("lt-arabic", "Arabic name", "Lower thirds", { text: "جورج شربل", sub: "مصمم" }, 4, (o) => [
    rect({ x: 0.92, y: o.y, w: 1.2, h: 13, fill: o.accent, keys: { sy: [[0, 0.001, "outExpo"], [0.4, 1]] }, out: OUT }),
    txt(o.text, { x: 0.9, y: (o.y || 0.68) - 0.012, font: "Cairo", weight: 900, size: 6, align: "right", in: { type: "wipeLeft", dur: 0.5, delay: 0.2 }, out: { type: "wipeRight", dur: 0.3 }, shadow, maxWidth: 70 }),
    txt(o.sub, { x: 0.9, y: (o.y || 0.68) + 0.021, font: "Tajawal", weight: 500, size: 4, align: "right", in: { type: "wipeLeft", dur: 0.5, delay: 0.35 }, out: OUT, shadow, maxWidth: 70 }),
  ], { y: 0.68, tags: ["arabic"] });

  def("lt-handle", "Social handle", "Lower thirds", { text: "@g.viisuals", emoji: "📸" }, 3.6, (o) => [
    { type: "group", y: o.y, in: { type: "pop", dur: 0.45, ease: "outBack" }, out: OUT, layers: [
      rect({ w: 58, h: 11, radius: 5.5, fill: "rgba(0,0,0,0.6)" }),
      txt(o.emoji, { x: -22, size: 5, font: "Apple Color Emoji" }),
      txt(o.text, { x: 4, font: o.font || "Inter", weight: 800, size: 4.8 }),
    ] },
  ], LT);

  // ════════════════════════════════════════════════════════
  // CALLOUTS & STICKERS
  // ════════════════════════════════════════════════════════
  def("arrow-draw", "Hand-drawn arrow", "Callouts", { text: "look here" }, 3, (o) => [
    { type: "path", x: 0.5, y: o.y, d: "M-22 -12 C -10 -14, 6 -10, 14 2 M14 2 L 8 0 M14 2 L 15 -5", stroke: { color: o.accent, width: 1.3 }, keys: { trim: [[0, 0, "out"], [0.6, 1]] }, out: OUT },
    txt(o.text, { x: 0.4, y: (o.y || 0.5) - 0.08, font: "Caveat", weight: 700, size: 8, color: o.accent, in: { type: "pop", dur: 0.4, delay: 0.5, ease: "outBack" }, out: OUT, shadow }),
  ]);

  def("circle-draw", "Circle it", "Callouts", {}, 2.6, (o) => [
    { type: "path", x: 0.5, y: o.y, d: "M 0 -14 C 22 -15, 30 0, 18 10 C 8 17, -20 16, -26 4 C -31 -8, -12 -16, 4 -13", stroke: { color: o.accent, width: 1.1 }, keys: { trim: [[0, 0, "inOut"], [0.7, 1]] }, out: OUT },
  ], { accent: "#ff3b30" });

  def("underline-draw", "Underline", "Callouts", {}, 2.4, (o) => [
    { type: "path", x: 0.5, y: o.y, d: "M-30 0 C -10 2, 10 -2, 30 1", stroke: { color: o.accent, width: 1.5 }, keys: { trim: [[0, 0, "out"], [0.45, 1]] }, out: OUT },
  ]);

  def("emoji-burst", "Emoji burst", "Callouts", { emoji: "🔥" }, 2.2, (o) => [
    { type: "particles", y: o.y, kind: "emoji", emoji: [o.emoji], count: 16, speed: 55, gravity: 50, size: 2.6, life: 1.8, seed: 5 },
    txt(o.emoji, { y: o.y, size: 14, font: "Apple Color Emoji", in: { type: "pop", dur: 0.4, ease: "outBack" }, out: { type: "zoomOut", dur: 0.25 } }),
  ]);

  def("confetti", "Confetti", "Callouts", {}, 2.6, (o) => [
    { type: "particles", x: 0.5, y: 0.45, kind: "confetti", count: 90, speed: 80, gravity: 90, size: 1.6, life: 2.4, seed: 11, spread: 120, direction: -90 },
  ], { overlay: true });

  def("sparkles", "Sparkles", "Callouts", {}, 2, (o) => [
    { type: "particles", y: o.y, kind: "sparkle", count: 22, colors: [o.accent, "#ffffff"], speed: 40, gravity: 0, size: 2, life: 1.5, seed: 3 },
  ]);

  def("subscribe", "Subscribe button", "Callouts", { text: "SUBSCRIBE" }, 3.6, (o) => [
    { type: "group", y: o.y, in: { type: "pop", dur: 0.45, ease: "outBack" }, out: { type: "zoomOut", dur: 0.25 }, layers: [
      rect({ w: 52, h: 12, radius: 6, fill: "#ff0033", keys: { fill: [[1.2, "#ff0033", "hold"], [1.25, "#3d3d3d"]] } }),
      txt(o.text, { font: "Inter", weight: 800, size: 4.8, keys: { opacity: [[1.2, 1, "hold"], [1.25, 0]] } }),
      txt("SUBSCRIBED", { font: "Inter", weight: 800, size: 4.4, color: "#ddd", keys: { opacity: [[1.2, 0, "hold"], [1.25, 1]] } }),
      txt("👆", { x: 12, y: 8, size: 7, font: "Apple Color Emoji", keys: { x: [[0.3, 30, "outQuart"], [1, 12]], y: [[0.3, 22, "outQuart"], [1, 8], [1.15, 7, "inOut"], [1.3, 8]] } }),
    ] },
  ], { y: 0.62 });

  def("follow-plus", "Follow +", "Callouts", { text: "Follow" }, 3, (o) => [
    { type: "group", y: o.y, in: { type: "pop", dur: 0.45, ease: "outBack" }, out: OUT, layers: [
      rect({ w: 40, h: 11, radius: 2.5, fill: "#fe2c55" }),
      txt("+ " + o.text, { font: "Inter", weight: 800, size: 4.8 }),
    ] },
  ], { y: 0.62 });

  def("like-heart", "Like", "Callouts", {}, 2.4, (o) => [
    txt("❤️", { y: o.y, size: 20, font: "Apple Color Emoji", in: { type: "pop", dur: 0.5, ease: "outElastic" }, out: { type: "zoomOut", dur: 0.25 } }),
    { type: "particles", y: o.y, kind: "dots", count: 18, colors: ["#ff375f", "#ff9f0a"], speed: 50, gravity: 0, size: 1.4, life: 0.9, seed: 8, start: 0.15 },
  ]);

  def("check-mark", "Tick", "Callouts", {}, 2.2, (o) => [
    { type: "ellipse", y: o.y, w: 24, h: 24, fill: "#30d158", in: { type: "pop", dur: 0.4, ease: "outBack" }, out: OUT },
    { type: "path", x: 0.5, y: o.y, d: "M-6 0.5 L-1.5 5 L7 -5", stroke: { color: "#fff", width: 2.4 }, keys: { trim: [[0.25, 0, "out"], [0.6, 1]] }, out: OUT },
  ]);

  def("cross-mark", "Cross", "Callouts", {}, 2.2, (o) => [
    { type: "ellipse", y: o.y, w: 24, h: 24, fill: "#ff3b30", in: { type: "pop", dur: 0.4, ease: "outBack" }, loop: { type: "shake", amount: 0.5 }, out: OUT },
    { type: "path", x: 0.5, y: o.y, d: "M-5 -5 L5 5 M5 -5 L-5 5", stroke: { color: "#fff", width: 2.4 }, keys: { trim: [[0.25, 0, "out"], [0.55, 1]] }, out: OUT },
  ]);

  def("new-badge", "Badge", "Callouts", { text: "NEW" }, 2.6, (o) => [
    { type: "group", y: o.y, rotation: -12, in: { type: "spin", dur: 0.55, ease: "outBack", amount: 0.5 }, loop: { type: "pulse", amount: 0.6 }, out: OUT, layers: [
      { type: "path", d: starPath(10, 13, 16), fill: o.accent },
      txt(o.text, { font: "Anton", weight: 400, size: 6, color: "#111" }),
    ] },
  ]);

  def("stars", "Star rating", "Callouts", { stars: 5 }, 3, (o) => {
    const n = Math.max(1, Math.min(5, +o.stars || 5));
    return [0, 1, 2, 3, 4].map((i) => ({ type: "path", x: 0.5 + (i - 2) * 0.12, y: o.y, d: starPath(5, 2.4, 5), fill: i < n ? "#ffcc00" : "rgba(255,255,255,0.3)", shadow, in: { type: "pop", dur: 0.4, delay: i * 0.1, ease: "outBack" }, out: OUT }));
  });

  def("pointer", "Pointing hand", "Callouts", { emoji: "👉" }, 2.6, (o) => [
    txt(o.emoji, { x: 0.3, y: o.y, size: 14, font: "Apple Color Emoji", in: { type: "slideRight", dur: 0.4, ease: "outBack" }, loop: { type: "float", amount: 1.5, speed: 2 }, keys: { x: [[0.4, 0.3], [0.7, 0.33, "inOut"], [1, 0.3], [1.3, 0.33, "inOut"], [1.6, 0.3]] }, out: OUT }),
  ]);

  def("question", "Question pop", "Callouts", { text: "?" }, 2.2, (o) => [
    txt(o.text, { y: o.y, font: "Bangers", weight: 400, size: 30, color: o.accent, stroke: { color: "#111", width: 0.8 }, extrude: { color: "#111", depth: 1.2 }, in: { type: "pop", dur: 0.5, ease: "outElastic" }, loop: { type: "wiggle", amount: 1 }, out: OUT }),
  ]);

  def("location", "Location pin", "Callouts", { text: "Beirut, Lebanon" }, 3.4, (o) => [
    txt("📍", { y: (o.y || 0.5) - 0.04, size: 10, font: "Apple Color Emoji", in: { type: "drop", dur: 0.6, ease: "outBounce" }, out: OUT }),
    txt(o.text, { y: (o.y || 0.5) + 0.02, font: o.font || "Inter", weight: 800, size: 5.4, box: { fill: "rgba(0,0,0,0.55)", padX: 0.6, padY: 0.3, radius: 0.4 }, in: { type: "fade", dur: 0.35, delay: 0.4 }, out: OUT }),
  ]);

  def("speech-bubble", "Speech bubble", "Callouts", { text: "Wait for it…" }, 3, (o) => [
    { type: "group", x: 0.55, y: o.y, in: { type: "pop", dur: 0.45, ease: "outBack" }, out: OUT, layers: [
      rect({ w: 56, h: 16, radius: 8, fill: "#fff", shadow }),
      { type: "path", d: "M-14 7 L-20 14 L-8 7.5 Z", fill: "#fff" },
      txt(o.text, { font: "Poppins", weight: 800, size: 5, color: "#111", maxWidth: 50 }),
    ] },
  ]);

  // ════════════════════════════════════════════════════════
  // SOCIAL
  // ════════════════════════════════════════════════════════
  def("imessage", "Text messages", "Social", { text: "are you editing again?\nyes 😅\nsend it when it's done!" }, 5, (o) =>
    lines(o.text).map((l, i, all) => {
      const mine = i % 2 === 1;
      const y = (o.y || 0.45) + (i - (all.length - 1) / 2) * 0.075;
      return { type: "group", x: mine ? 0.64 : 0.36, y, in: { type: "pop", dur: 0.4, delay: 0.7 * i, ease: "outBack" }, out: OUT, layers: [
        rect({ w: Math.min(60, 10 + l.length * 2.2), h: 10, radius: 5, fill: mine ? "#0a84ff" : "#e9e9eb" }),
        txt(l, { font: "Inter", weight: 500, size: 3.8, color: mine ? "#fff" : "#111", maxWidth: 56 }),
      ] };
    }), { y: 0.45 });

  def("typing", "Typing…", "Social", {}, 2.4, (o) => [
    { type: "group", x: 0.3, y: o.y, in: { type: "pop", dur: 0.35, ease: "outBack" }, out: OUT, layers: [
      rect({ w: 20, h: 10, radius: 5, fill: "#e9e9eb" }),
      ...[-5, 0, 5].map((x, i) => ({ type: "ellipse", x, w: 2.6, h: 2.6, fill: "#8e8e93", loop: { type: "float", amount: 1.2, speed: 2 + i * 0.3 } })),
    ] },
  ]);

  def("tweet", "Post card", "Social", { name: "G.VIISUALS", handle: "@g.viisuals", text: "Stop cutting silences by hand. Seriously." }, 4, (o) => [
    { type: "group", y: o.y, in: { type: "rise", dur: 0.5, ease: "outQuart", amount: 2 }, out: OUT, layers: [
      rect({ w: 84, h: 32, radius: 4, fill: "#fff", shadow: { color: "rgba(0,0,0,0.35)", blur: 4, y: 1 } }),
      { type: "ellipse", x: -34, y: -8, w: 9, h: 9, fill: o.accent },
      txt(o.name, { x: -27.5, y: -10, font: "Inter", weight: 800, size: 3.8, color: "#111", align: "left", maxWidth: 55 }),
      txt(o.handle, { x: -27.5, y: -5.6, font: "Inter", weight: 500, size: 3.2, color: "#666", align: "left", maxWidth: 55 }),
      txt(o.text, { x: -38, y: 5, font: "Inter", weight: 500, size: 4.2, color: "#111", align: "left", maxWidth: 76, lineHeight: 1.25 }),
    ] },
  ]);

  def("reply-comment", "Reply to comment", "Social", { name: "nour.k", text: "how do you cut so fast??" }, 4, (o) => [
    { type: "group", y: 0.3, in: { type: "pop", dur: 0.45, ease: "outBack" }, out: OUT, layers: [
      rect({ w: 70, h: 15, radius: 3, fill: "#fff", shadow }),
      txt("Reply to " + o.name + "'s comment", { x: -32, y: -3.2, font: "Inter", weight: 600, size: 2.9, color: "#888", align: "left", maxWidth: 64 }),
      txt(o.text, { x: -32, y: 2.6, font: "Inter", weight: 700, size: 3.8, color: "#111", align: "left", maxWidth: 64 }),
    ] },
  ], { y: 0.3 });

  def("insta-follow", "New follower", "Social", { text: "nour.k started following you" }, 3.4, (o) => [
    { type: "group", y: 0.1, in: { type: "drop", dur: 0.55, ease: "outBack", amount: 0.7 }, out: { type: "slideDown", dur: 0.3, amount: -1 }, layers: [
      rect({ w: 84, h: 12, radius: 6, fill: "rgba(255,255,255,0.96)", shadow }),
      { type: "ellipse", x: -36, w: 7, h: 7, fill: { type: "linear", angle: 45, stops: [[0, "#feda75"], [0.5, "#d62976"], [1, "#4f5bd5"]] } },
      txt(o.text, { x: -30.5, font: "Inter", weight: 600, size: 3.5, color: "#111", align: "left", maxWidth: 70 }),
    ] },
  ], { y: 0.1 });

  def("yt-like-sub", "Like & subscribe", "Social", {}, 4, (o) => [
    { type: "group", y: o.y, in: { type: "slideUp", dur: 0.45, ease: "outBack" }, out: OUT, layers: [
      rect({ x: -18, w: 30, h: 11, radius: 5.5, fill: "rgba(255,255,255,0.95)" }),
      txt("👍 Like", { x: -18, font: "Inter", weight: 700, size: 4, color: "#111" }),
      rect({ x: 17, w: 36, h: 11, radius: 5.5, fill: "#ff0033", in: { type: "pop", delay: 0.5, ease: "outBack" } }),
      txt("Subscribe", { x: 17, font: "Inter", weight: 800, size: 4, in: { type: "fade", delay: 0.6 } }),
    ] },
  ], { y: 0.7 });

  // ════════════════════════════════════════════════════════
  // DATA & COUNTERS
  // ════════════════════════════════════════════════════════
  def("count-up", "Count up", "Data", { from: 0, to: 10000, prefix: "", suffix: "+", sub: "happy clients" }, 3, (o) => [
    txt("", { y: o.y, font: o.font || "Montserrat", weight: 900, size: 16, shadow, count: { from: +o.from || 0, to: +o.to || 0, dur: 1.6, prefix: o.prefix, suffix: o.suffix }, in: { type: "pop", dur: 0.35, ease: "outBack" }, out: OUT }),
    txt(o.sub, { y: (o.y || 0.5) + 0.06, font: "Inter", weight: 700, size: 5, upper: true, tracking: 0.12, color: o.accent, in: { type: "slideUp", dur: 0.4, delay: 0.3 }, out: OUT, shadow }),
  ]);

  def("percent-ring", "Percent ring", "Data", { to: 87, sub: "retention" }, 3, (o) => {
    const p = Math.max(0, Math.min(100, +o.to || 0));
    return [
      { type: "ring", y: o.y, w: 40, width: 2.6, track: "rgba(255,255,255,0.22)", color: o.accent, keys: { progress: [[0.1, 0, "outQuart"], [1.6, p / 100]] }, in: { type: "pop", dur: 0.4, ease: "outBack" }, out: OUT },
      txt("", { y: o.y, font: "Montserrat", weight: 900, size: 9, count: { from: 0, to: p, dur: 1.5, suffix: "%", ease: "outQuart" }, out: OUT }),
      txt(o.sub, { y: (o.y || 0.5) + 0.075, font: "Inter", weight: 700, size: 4.6, upper: true, tracking: 0.12, in: { type: "fade", delay: 0.4 }, out: OUT, shadow }),
    ];
  });

  def("bar-chart", "Bar chart", "Data", { text: "2024\n2025\n2026", values: "30, 55, 100" }, 3.6, (o) => {
    const labels = lines(o.text);
    const vals = String(o.values).split(/[,\s]+/).map(Number).filter((n) => !isNaN(n));
    const max = Math.max(1, ...vals);
    return labels.map((l, i) => {
      const x = 0.5 + (i - (labels.length - 1) / 2) * 0.2;
      const h = 34 * ((vals[i] || 0) / max);
      return [
        rect({ x, y: (o.y || 0.5) + 0.1, w: 14, h, radius: 1.2, anchorY: 1, fill: i === labels.length - 1 ? o.accent : "rgba(255,255,255,0.85)", keys: { sy: [[0.15 * i, 0.001, "outQuart"], [0.15 * i + 0.8, 1]] }, out: OUT }),
        txt(l, { x, y: (o.y || 0.5) + 0.125, font: "Inter", weight: 700, size: 3.8, shadow, in: { type: "fade", delay: 0.2 }, out: OUT }),
      ];
    }).flat();
  });

  def("progress-line", "Progress bar", "Data", {}, 10, (o) => [
    rect({ x: 0, y: 0.995, w: 400, h: 1.2, anchorX: 0, anchorY: 1, fill: o.accent, keys: { progress: [[0, 0, "linear"], [o.dur || 10, 1]] } }),
  ], { overlay: true });

  def("timer", "Stopwatch", "Data", { seconds: 10 }, 10, (o) => [
    txt("", { y: o.y, font: "JetBrains Mono", weight: 700, size: 9, box: { fill: "rgba(0,0,0,0.6)", padX: 0.5, padY: 0.25, radius: 0.3 }, count: { from: 0, to: +o.seconds || 10, dur: +o.seconds || 10, ease: "linear", decimals: 1, suffix: "s", separator: false }, out: OUT }),
  ], { y: 0.15 });

  // ════════════════════════════════════════════════════════
  // OVERLAYS & TRANSITIONS (full-frame, short)
  // ════════════════════════════════════════════════════════
  const OV = { overlay: true };
  def("flash", "Flash", "Transitions", {}, 0.5, () => [rect({ w: 400, h: 400, fill: "#fff", keys: { opacity: [[0, 0, "out"], [0.08, 1, "out"], [0.5, 0]] } })], OV);
  def("dip-black", "Dip to black", "Transitions", {}, 0.8, () => [rect({ w: 400, h: 400, fill: "#000", keys: { opacity: [[0, 0, "inOut"], [0.4, 1, "inOut"], [0.8, 0]] } })], OV);
  def("circle-wipe", "Circle wipe", "Transitions", {}, 0.8, (o) => [
    { type: "ellipse", w: 10, h: 10, fill: o.accent, keys: { scale: [[0, 0.01, "inOutExpo"], [0.4, 22, "hold"], [0.4, 22]], opacity: [[0, 1, "hold"], [0.42, 1, "out"], [0.8, 0]] } },
  ], OV);
  def("bars-wipe", "Bars wipe", "Transitions", {}, 0.9, (o) =>
    [0, 1, 2, 3, 4].map((i) => rect({ x: 0.5, y: 0.1 + i * 0.2, w: 400, h: 37, fill: i % 2 ? "#111" : o.accent, keys: { x: [[i * 0.04, -1.6, "inOutExpo"], [0.4 + i * 0.04, 0.5, "inOutExpo"], [0.8 + i * 0.02, 2.6]] } })), OV);
  def("diagonal-swipe", "Diagonal swipe", "Transitions", {}, 0.8, (o) => [
    rect({ w: 120, h: 400, fill: o.accent, rotation: 20, keys: { x: [[0, -1.2, "inOutExpo"], [0.8, 2.2]] } }),
    rect({ w: 60, h: 400, fill: "#fff", rotation: 20, keys: { x: [[0.06, -1.2, "inOutExpo"], [0.86, 2.2]] } }),
  ], OV);
  def("light-sweep", "Light sweep", "Transitions", {}, 1, () => [
    rect({ w: 40, h: 400, rotation: 18, blend: "screen", fill: { type: "linear", angle: 90, stops: [[0, "rgba(255,255,255,0)"], [0.5, "rgba(255,240,200,0.75)"], [1, "rgba(255,255,255,0)"]] }, keys: { x: [[0, -0.4, "inOut"], [1, 1.4]] } }),
  ], OV);
  def("light-leak", "Light leak", "Transitions", {}, 1.4, () => [
    { type: "ellipse", w: 160, h: 120, blend: "screen", fill: { type: "radial", stops: [[0, "rgba(255,170,60,0.9)"], [0.5, "rgba(255,70,40,0.45)"], [1, "rgba(255,40,40,0)"]] }, keys: { x: [[0, 0.1, "inOut"], [1.4, 0.9]], opacity: [[0, 0, "inOut"], [0.5, 1, "inOut"], [1.4, 0]] } },
  ], OV);
  def("zoom-lines", "Speed lines", "Transitions", {}, 0.8, () => [
    { type: "group", keys: { opacity: [[0, 0], [0.1, 1], [0.6, 1], [0.8, 0]] }, loop: { type: "spin", amount: 0.02 }, layers: Array.from({ length: 36 }, (_, i) => {
      const a = (i / 36) * Math.PI * 2;
      const r1 = 40 + ((i * 37) % 17), r2 = 130;
      return { type: "path", d: `M${(Math.cos(a) * r1).toFixed(1)} ${(Math.sin(a) * r1).toFixed(1)} L${(Math.cos(a) * r2).toFixed(1)} ${(Math.sin(a) * r2).toFixed(1)}`, stroke: { color: "rgba(255,255,255,0.8)", width: 0.5 + (i % 3) * 0.3 } };
    }) },
  ], OV);
  def("glitch-bars", "Glitch bars", "Transitions", {}, 0.6, () =>
    Array.from({ length: 9 }, (_, i) => rect({ x: 0.5, y: ((i * 0.37) % 1), w: 400, h: 2 + (i % 4) * 3, fill: ["#ff0055", "#00e5ff", "#ffffff"][i % 3], blend: "screen", keys: { opacity: [[0, 0, "hold"], [0.04 * i, 0.9, "hold"], [0.04 * i + 0.12, 0, "hold"], [0.3 + 0.03 * i, 0.7, "hold"], [0.36 + 0.03 * i, 0]] }, loop: { type: "shake", amount: 6 } })), OV);
  def("letterbox", "Letterbox", "Transitions", {}, 6, () => [
    rect({ x: 0.5, y: 0, w: 400, h: 14, anchorY: 0, fill: "#000", keys: { y: [[0, -0.1, "outQuart"], [0.7, 0]] }, out: { type: "fade", dur: 0.6 } }),
    rect({ x: 0.5, y: 1, w: 400, h: 14, anchorY: 1, fill: "#000", keys: { y: [[0, 1.1, "outQuart"], [0.7, 1]] }, out: { type: "fade", dur: 0.6 } }),
  ], OV);
  def("vignette", "Vignette", "Transitions", {}, 5, () => [
    { type: "ellipse", w: 260, h: 260, fill: { type: "radial", stops: [[0.45, "rgba(0,0,0,0)"], [1, "rgba(0,0,0,0.7)"]] }, in: { type: "fade", dur: 0.6 }, out: { type: "fade", dur: 0.6 } },
  ], OV);
  def("glass-wipe", "Glass wipe", "Transitions", {}, 0.9, () => [
    glass({ w: 70, h: 400, radius: 0, rotation: 14, frost: 3, refract: 2, keys: { x: [[0, -0.5, "inOutExpo"], [0.9, 1.5]] } }),
  ], { overlay: true, glass: true });

  // ── helpers used above ───────────────────────────────────
  function starPath(points, inner, outer) {
    let d = "";
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 ? inner : outer;
      const a = (i * Math.PI) / points - Math.PI / 2;
      d += (i ? "L" : "M") + (Math.cos(a) * r).toFixed(2) + " " + (Math.sin(a) * r).toFixed(2) + " ";
    }
    return d + "Z";
  }
  function withA(c, a) {
    const m = String(c).match(/^#([0-9a-f]{6})$/i);
    if (!m) return c;
    const n = parseInt(m[1], 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  // ── public ───────────────────────────────────────────────
  /** Builds the scene for a template with the user's options. */
  function build(id, opts = {}) {
    const t = BY_ID[id];
    if (!t) throw new Error("Unknown template: " + id);
    const o = { ...t.fields, accent: t.accent, y: t.y, dur: t.dur, ...clean(opts) };
    const dur = +o.dur || t.dur;
    const layers = t.build({ ...o, dur }).flat();
    // Anything without an explicit end lasts the whole scene; exits run at the end.
    return { duration: dur, layers };
  }
  function clean(o) {
    const out = {};
    for (const k of Object.keys(o)) if (o[k] !== undefined && o[k] !== null && o[k] !== "") out[k] = o[k];
    return out;
  }

  function list(cat) {
    return LIST.filter((t) => !cat || t.cat === cat).map((t) => ({ id: t.id, name: t.name, cat: t.cat, fields: t.fields, dur: t.dur, glass: t.glass, overlay: t.overlay, tags: t.tags, accent: t.accent }));
  }
  const CATEGORIES = ["Titles", "Liquid glass", "Lower thirds", "Callouts", "Social", "Data", "Transitions"];

  return { build, list, CATEGORIES, get: (id) => BY_ID[id] };
});
