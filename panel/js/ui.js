/* PostKit panel — DOM helpers, icons and shared components (track pickers, sliders,
 * segmented controls, the motion-graphics picker with live previews). */
(function () {
  "use strict";
  const PK = window.PK;
  const result = PK.result;

  /** h("div.class#id", {attrs, on: {click}}, ...children) */
  function h(sel, props, ...kids) {
    if (props === null || typeof props !== "object" || props instanceof Node || Array.isArray(props)) {
      if (props !== undefined && props !== null) kids.unshift(props);
      props = {};
    }
    const m = sel.match(/^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i);
    const el = document.createElement((m && m[1]) || "div");
    if (m && m[2]) m[2].replace(/([.#])([\w-]+)/g, (_, t, v) => (t === "." ? el.classList.add(v) : (el.id = v)));
    for (const [k, v] of Object.entries(props)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === "on") for (const [e, fn] of Object.entries(v)) el.addEventListener(e, fn);
      else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
      else if (k === "text") el.textContent = v;
      else if (k === "html") el.innerHTML = v;
      else if (k in el && typeof v !== "string") el[k] = v;
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const k of kids.flat()) if (k !== null && k !== undefined && k !== false) el.append(k instanceof Node ? k : document.createTextNode(String(k)));
    return el;
  }

  // ── icons (20px line icons) ──────────────────────────────
  const P = (d) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICONS = {
    ai: P('<path d="M12 3l1.8 4.6L18 9.4l-4.2 1.8L12 16l-1.8-4.8L6 9.4l4.2-1.8z"/><path d="M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>'),
    cut: P('<circle cx="6" cy="7" r="2.5"/><circle cx="6" cy="17" r="2.5"/><path d="M8.2 8.2L20 18M8.2 15.8L20 6"/>'),
    zoom: P('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/><rect x="8.5" y="8.5" width="7" height="7" rx="1"/>'),
    multicam: P('<rect x="3" y="6" width="12" height="9" rx="1.5"/><path d="M15 9l5-3v9l-5-3"/><path d="M7 19h4"/>'),
    presets: P('<path d="M4 18c4-1 6-12 16-12"/><circle cx="4" cy="18" r="1.5"/><circle cx="20" cy="6" r="1.5"/>'),
    curves: P('<path d="M4 19C10 19 8 5 20 5"/><path d="M4 19l4-6M20 5l-4 6" stroke-dasharray="2 2"/>'),
    tracking: P('<rect x="7" y="7" width="10" height="10" rx="1"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>'),
    captions: P('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 15h4M13 15h4M7 11h10"/>'),
    titles: P('<path d="M5 6h14M12 6v13M9 19h6"/>'),
    glass: P('<rect x="4" y="5" width="16" height="14" rx="4"/><path d="M7.5 8.5c1-1 2.5-1.5 4-1.5"/>'),
    gallery: P('<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><path d="M17 13v8M13 17h8"/>'),
    safe: P('<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M7 17h10M14 6v7"/>'),
    voice: P('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/>'),
    sfx: P('<path d="M4 10v4h4l5 4V6L8 10z"/><path d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11"/>'),
    autosfx: P('<path d="M3 12h3l2-5 3 10 3-7 2 4h5"/>'),
    duck: P('<path d="M3 7h18M3 17h18"/><path d="M3 12h4l2 3h6l2-3h4"/>'),
    looks: P('<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 000 16z" fill="currentColor" stroke="none" opacity=".35"/>'),
    broll: P('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18M8 5v4M16 5v4M10 12l4 2.5-4 2.5z"/>'),
    library: P('<path d="M4 4h4v16H4zM10 4h4v16h-4z"/><path d="M16 5l3.5-1 2.5 15-3.5 1z"/>'),
    search: P('<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>'),
    cleanup: P('<path d="M3 7h18M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
    taste: P('<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>'),
  };

  // ── controls ─────────────────────────────────────────────
  const KIND_LABEL = { speech: "Speech track", camera: "Camera track", music: "Music track" };
  /** A track picker bound to PK.state.tracks[kind]; stays in sync with every other picker. */
  function trackSelect(kind, label) {
    const sel = h("select");
    const fill = () => {
      const info = PK.state.info;
      sel.innerHTML = "";
      const isAudio = kind !== "camera";
      if (kind !== "speech") sel.add(new Option("None", "-1"));
      if (info) (isAudio ? info.tracks.audio : info.tracks.video).forEach((t) => sel.add(new Option(`${isAudio ? "A" : "V"}${t.index + 1}${t.clips ? "" : " (empty)"}`, String(t.index))));
      sel.value = String(PK.state.tracks[kind]);
    };
    sel.addEventListener("change", () => {
      PK.state.tracks[kind] = parseInt(sel.value, 10);
      PK.emit("tracks", kind);
    });
    PK.on("sequence", fill);
    PK.on("tracks", (k) => k === kind && (sel.value = String(PK.state.tracks[kind])));
    fill();
    return h("label", label || KIND_LABEL[kind], sel);
  }

  function slider(label, { min, max, step = 1, value, fmt = (v) => v }) {
    const input = h("input", { type: "range", min, max, step, value });
    const out = h("output", fmt(value));
    input.addEventListener("input", () => (out.textContent = fmt(+input.value)));
    const el = h("label", label, " ", out, input);
    return { el, input, get value() { return +input.value; }, set value(v) { input.value = v; out.textContent = fmt(+v); } };
  }

  let segN = 0;
  /** options: [[value, label], …] */
  function segmented(options, value, onChange) {
    const name = "seg" + ++segN;
    const el = h("div.segmented", { role: "radiogroup" });
    options.forEach(([v, label]) => {
      const input = h("input", { type: "radio", name, value: v, checked: v === value });
      const l = h("label", input, " ", label);
      if (v === value) l.classList.add("on");
      input.addEventListener("change", () => {
        el.querySelectorAll("label").forEach((x) => x.classList.toggle("on", x.querySelector("input").checked));
        onChange && onChange(v);
      });
      input.addEventListener("focus", () => l.classList.add("focus"));
      input.addEventListener("blur", () => l.classList.remove("focus"));
      el.append(l);
    });
    return { el, get value() { const c = el.querySelector("input:checked"); return c ? c.value : value; } };
  }

  function select(label, options, value) {
    const sel = h("select");
    options.forEach(([v, t]) => sel.add(new Option(t, v)));
    if (value !== undefined) sel.value = value;
    return { el: h("label", label, sel), sel, get value() { return sel.value; } };
  }

  const button = (text, cls, onClick, attrs = {}) => h("button." + (cls || "secondary"), { type: "button", ...attrs, on: { click: onClick } }, text);
  const resultLine = () => h("p.result");
  const note = (text) => h("p.muted.small", text);

  /** Progress bar for long renders. */
  function progress() {
    const bar = h("div.progress-fill");
    const el = h("div.progress", { hidden: true }, bar);
    return { el, set(p) { el.hidden = p === null; bar.style.width = `${Math.round((p || 0) * 100)}%`; } };
  }

  // ── preview canvases ─────────────────────────────────────
  function aspect() {
    const i = PK.state.info;
    return i && i.width && i.height ? i.height / i.width : 16 / 9;
  }
  /** Draws a scene over the preview frame. */
  function drawPreview(canvas, scene, t, bg) {
    const ctx = canvas.getContext("2d");
    const off = canvas._off || (canvas._off = document.createElement("canvas"));
    if (off.width !== canvas.width || off.height !== canvas.height) { off.width = canvas.width; off.height = canvas.height; }
    window.PKGfx.render(off.getContext("2d"), scene, t, { bg: () => bg });
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (bg) drawCover(ctx, bg, canvas.width, canvas.height);
    ctx.drawImage(off, 0, 0);
  }
  function drawCover(ctx, img, W, H) {
    const w = img.naturalWidth || img.width, hh = img.naturalHeight || img.height;
    const k = Math.max(W / w, H / hh);
    ctx.drawImage(img, (W - w * k) / 2, (H - hh * k) / 2, w * k, hh * k);
  }

  /** Plays a scene in a loop on a canvas until stop() is called. */
  function player(canvas, getScene, getBg) {
    let raf = 0, t0 = 0, playing = false;
    const tick = (now) => {
      const scene = getScene();
      if (!scene) return;
      if (!t0) t0 = now;
      const t = ((now - t0) / 1000) % (scene.duration + 0.6);
      drawPreview(canvas, scene, Math.min(t, scene.duration - 0.001), getBg());
      if (playing) raf = requestAnimationFrame(tick);
    };
    return {
      play() { if (playing) return; playing = true; t0 = 0; raf = requestAnimationFrame(tick); },
      stop() { playing = false; cancelAnimationFrame(raf); },
      restart() { t0 = 0; },
      get playing() { return playing; },
    };
  }

  // ── motion-graphics picker ───────────────────────────────
  /**
   * Grid of templates with live previews and an editor for the chosen one.
   * opts: { cats: [category…], withAI: bool, withSaved: bool }
   */
  function graphicPicker(opts) {
    const T = window.PKTemplates;
    const fonts = window.PKFonts.FAMILIES.map((f) => f.family);
    const root = h("div.gpick");
    let bg = PK.fallbackFrame();
    let cat = opts.cats[0];
    let current = null; // { id, name, scene (AI/saved) or template, fields }
    const saved = () => PK.readJson("motions.json", { items: [] }).items;

    const chips = h("div.chips");
    const grid = h("div.tiles");
    const editor = h("div.geditor", { hidden: true });
    const res = resultLine();
    const prog = progress();

    const cats = [...opts.cats];
    if (opts.withSaved) cats.push("My motions");
    function renderChips() {
      chips.innerHTML = "";
      if (cats.length < 2) return;
      cats.forEach((c) => chips.append(h("button.chip", { type: "button", "aria-pressed": String(c === cat), on: { click: () => { cat = c; renderChips(); renderGrid(); } } }, c)));
    }

    const tileW = 84;
    function tileCanvas() {
      const c = h("canvas.tile-canvas");
      c.width = tileW * 2; c.height = Math.round(tileW * 2 * aspect());
      return c;
    }
    let hoverPlayer = null;
    function renderGrid() {
      grid.innerHTML = "";
      const items = cat === "My motions" ? saved().map((s, i) => ({ id: "saved:" + i, name: s.name, scene: s.scene })) : T.list(cat);
      if (!items.length) grid.append(h("p.muted.small", cat === "My motions" ? "Motions you make with AI and save appear here." : "Nothing here yet."));
      items.forEach((it) => {
        const c = tileCanvas();
        const scene = it.scene || T.build(it.id, {});
        const settle = Math.min(scene.duration * 0.6, Math.max(0, scene.duration - 0.35));
        drawPreview(c, scene, settle, bg);
        const tile = h("button.tile", { type: "button", title: it.name }, c, h("span.tile-name", it.name));
        const p = player(c, () => scene, () => bg);
        tile.addEventListener("mouseenter", () => { if (hoverPlayer) hoverPlayer.stop(); hoverPlayer = p; p.play(); });
        tile.addEventListener("mouseleave", () => { p.stop(); drawPreview(c, scene, settle, bg); });
        tile.addEventListener("click", () => open(it));
        grid.append(tile);
      });
    }

    // Editor
    const big = h("canvas.big-canvas");
    const fieldsBox = h("div.fields");
    const accent = h("input", { type: "color", value: "#ffd60a" });
    const fontSel = select("Font", [["", "Template's font"], ...fonts.map((f) => [f, f])], "");
    const ypos = slider("Position", { min: 0.06, max: 0.94, step: 0.01, value: 0.5, fmt: (v) => (v < 0.33 ? "Top" : v > 0.66 ? "Bottom" : "Middle") + ` ${Math.round(v * 100)}%` });
    const dur = slider("Length", { min: 0.5, max: 12, step: 0.1, value: 3, fmt: (v) => `${(+v).toFixed(1)} s` });
    const bigPlayer = player(big, () => currentScene(), () => bg);
    const add = button("Add at the playhead", "primary", () => place());
    const back = button("‹ All", "link", () => { editor.hidden = true; grid.hidden = false; chips.hidden = false; bigPlayer.stop(); });
    let fieldInputs = {};

    function currentScene() {
      if (!current) return null;
      try {
        if (current.scene) {
          const s = JSON.parse(JSON.stringify(current.scene));
          s.duration = dur.value;
          return s;
        }
        const values = {};
        for (const [k, el] of Object.entries(fieldInputs)) values[k] = el.value;
        const scene = T.build(current.id, { ...values, accent: accent.value, y: ypos.value, dur: dur.value });
        if (fontSel.value) applyFont(scene.layers, fontSel.value);
        return scene;
      } catch (e) {
        return null;
      }
    }
    function applyFont(layers, font) {
      for (const l of layers) {
        if (l.type === "text" && !/Emoji/.test(l.font || "")) l.font = font;
        if (l.layers) applyFont(l.layers, font);
      }
    }

    function open(it) {
      current = it;
      const t = it.scene ? null : T.get(it.id);
      fieldsBox.innerHTML = "";
      fieldInputs = {};
      if (t) {
        for (const [k, v] of Object.entries(t.fields)) {
          const multi = String(v).includes("\n");
          const input = multi ? h("textarea", { rows: 3, dir: "auto" }) : h("input", { dir: "auto" });
          input.value = v;
          input.addEventListener("input", () => bigPlayer.restart());
          fieldInputs[k] = input;
          fieldsBox.append(h("label", fieldLabel(k), input));
        }
        accent.value = /^#[0-9a-f]{6}$/i.test(t.accent) ? t.accent : "#ffd60a";
        ypos.value = t.y;
        dur.value = t.dur;
      } else {
        dur.value = it.scene.duration || 3;
      }
      accent.parentElement.hidden = !t;
      ypos.el.hidden = !t;
      fontSel.el.hidden = !t;
      editor.querySelector(".gname").textContent = it.name;
      big.width = Math.min(640, (root.clientWidth || 300) * 2);
      big.height = Math.round(big.width * aspect());
      editor.hidden = false;
      grid.hidden = true;
      chips.hidden = true;
      result(res, "");
      bigPlayer.play();
      PK.emit("graphic:open", it);
    }

    async function place() {
      const scene = currentScene();
      if (!scene) return;
      await PK.run(res, "Rendering…", async () => {
        const r = await PK.addGraphic(scene, { label: current.name, onProgress: (p) => { prog.set(p); PK.status(`Rendering… ${Math.round(p * 100)}%`, true); } });
        prog.set(null);
        result(res, `Added “${current.name}” at ${PK.L.chapters.stamp(r.start)} on V${r.track + 1}.`, "ok");
      }, [add]);
      prog.set(null);
    }

    editor.append(
      h("div.row", back, h("strong.gname"), h("span")),
      big,
      fieldsBox,
      h("div.grid2", h("label", "Accent", accent), fontSel.el),
      ypos.el,
      dur.el,
      add,
      prog.el,
      res,
    );

    // AI motion
    let aiBox = null;
    if (opts.withAI) {
      const prompt = h("textarea", { rows: 2, placeholder: "Describe a motion… e.g. a liquid-glass card that says “Day 30” with confetti", dir: "auto" });
      const make = button("Make it", "primary", () => makeAI(prompt.value, null));
      const change = h("input", { placeholder: "Change it… e.g. make it blue and slower", dir: "auto" });
      const changeBtn = button("Change", "secondary", () => makeAI(change.value, current && current.scene));
      const save = button("Save to My motions", "link", () => {
        const s = currentScene();
        if (!s) return;
        const data = PK.readJson("motions.json", { items: [] });
        data.items.unshift({ name: current.name, scene: s });
        PK.writeJson("motions.json", data);
        result(res, "Saved to My motions.", "ok");
      });
      const aiRes = resultLine();
      const changeRow = h("div.search-row.ai-change", { hidden: true }, change, changeBtn);
      aiBox = h("div.ai-motion", h("h2", "Make one with AI"), prompt, h("div.actions", make), aiRes);
      editor.append(changeRow, save);
      PK.on("graphic:open", (it) => { changeRow.hidden = !it.scene; save.hidden = !it.scene || String(it.id).startsWith("saved:"); });
      async function makeAI(text, base) {
        if (!String(text).trim()) return;
        await PK.run(base ? res : aiRes, base ? "Changing it…" : "Designing your motion…", async () => {
          const data = await PK.api("/api/panel/ai/motion", { prompt: text, scene: base || null, aspect: aspect() > 1.2 ? "vertical" : aspect() < 0.8 ? "horizontal" : "square", fonts, accent: accent.value });
          const scene = window.PKValidate.scene(data.scene);
          open({ id: "ai:" + Date.now(), name: scene.name || "AI motion", scene });
          result(res, `Made with AI · ${data.cost} credits · ${data.balance} left.`, "ok");
          change.value = "";
        }, [make, changeBtn]);
      }
      const cost = h("span.muted.small");
      make.after(cost);
      cost.textContent = " 4 credits";
    }

    root.append(...(aiBox ? [aiBox] : []), chips, grid, editor);
    renderChips();
    renderGrid();
    return {
      el: root,
      async refreshBackground(force) {
        bg = await PK.previewFrame(force);
        renderGrid();
      },
      stop() { bigPlayer.stop(); if (hoverPlayer) hoverPlayer.stop(); },
    };
  }
  const fieldLabel = (k) => ({ text: "Text", sub: "Second line", emoji: "Emoji", num: "Number", by: "By", name: "Name", handle: "Handle", from: "From", to: "To", prefix: "Before the number", suffix: "After the number", values: "Values", seconds: "Seconds", stars: "Stars", a: "Option A", b: "Option B", pa: "Option A %", dur: "Length" }[k] || k);

  PK.ui = { h, ICONS, trackSelect, slider, segmented, select, button, resultLine, note, progress, graphicPicker, drawPreview, drawCover, player, aspect };
})();
