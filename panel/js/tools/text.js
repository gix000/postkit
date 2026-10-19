/* Text & graphics tools: captions (animated or Premiere), animated titles, liquid glass,
 * motion gallery with AI motion, safe zones. */
(function () {
  "use strict";
  const PK = window.PK;
  const { h, slider, segmented, select, button, resultLine, note, progress, graphicPicker, drawPreview, player, aspect } = PK.ui;
  const { L, host, state, plural, run, result } = PK;

  // ── captions ─────────────────────────────────────────────
  PK.tool({
    id: "captions", name: "Captions", group: "Text & graphics", note: "Word-timed, animated, Arabic and English", needs: ["speech"],
    mount(el) {
      const C = window.PKCaptions;
      const lang = select("Language", [["", "Detect automatically"], ["ar", "Arabic"], ["en", "English"], ["fr", "French"]], "");
      const res = resultLine();
      const prog = progress();
      const transcriptBox = h("div.transcript-edit", { hidden: true });
      const mode = segmented([["animated", "Animated"], ["premiere", "Premiere captions"]], "animated", () => sync());
      const styleGrid = h("div.tiles.tiles-wide");
      let style = "hormozi";
      const wpc = slider("Words per caption", { min: 1, max: 6, value: 3, fmt: (v) => String(v) });
      const ypos = slider("Position", { min: 0.3, max: 0.9, step: 0.01, value: 0.66, fmt: (v) => `${Math.round(v * 100)}%` });
      const size = slider("Size", { min: 0.6, max: 1.6, step: 0.05, value: 1, fmt: (v) => `${Math.round(v * 100)}%` });
      const accent = h("input", { type: "color", value: "#ffd60a" });
      const fonts = select("Font", [["", "Style's font"], ...window.PKFonts.FAMILIES.map((f) => [f.family, f.family])], "");
      const animBox = h("div", styleGrid, h("div.grid2", wpc.el, ypos.el), h("div.grid2", size.el, h("label", "Highlight", accent)), fonts.el);
      let bg = PK.fallbackFrame();

      function sampleGroups() {
        const t = state.transcript;
        const words = t && t.words.length ? t.words.slice(0, 12) : "this is how your captions will look".split(" ").map((w, i) => ({ word: w, start: i * 0.32, end: i * 0.32 + 0.28 }));
        const shift = words[0].start;
        return C.groupWords(words.map((w) => ({ ...w, start: w.start - shift, end: w.end - shift })), { maxWords: wpc.value }).slice(0, 3);
      }
      function previewScene(id) {
        return C.build(sampleGroups(), { style: id, accent: accent.value, y: ypos.value, size: size.value, font: fonts.value || undefined }).scene;
      }
      function renderStyles() {
        styleGrid.innerHTML = "";
        C.list().forEach((s) => {
          const c = h("canvas.tile-canvas");
          c.width = 168; c.height = Math.round(168 * aspect());
          const tile = h("button.tile", { type: "button", "aria-pressed": String(s.id === style) }, c, h("span.tile-name", s.name));
          const scene = previewScene(s.id);
          drawPreview(c, scene, Math.min(0.9, scene.duration * 0.5), bg);
          const p = player(c, () => previewScene(s.id), () => bg);
          tile.addEventListener("mouseenter", () => p.play());
          tile.addEventListener("mouseleave", () => p.stop());
          tile.addEventListener("click", () => {
            style = s.id;
            wpc.value = s.words;
            styleGrid.querySelectorAll(".tile").forEach((x) => x.setAttribute("aria-pressed", String(x === tile)));
          });
          styleGrid.append(tile);
        });
      }
      [wpc, ypos, size].forEach((s) => s.input.addEventListener("change", renderStyles));
      accent.addEventListener("change", renderStyles);
      fonts.sel.addEventListener("change", renderStyles);

      function renderTranscript() {
        const t = state.transcript;
        transcriptBox.innerHTML = "";
        if (!t) return (transcriptBox.hidden = true);
        t.segments.forEach((s) => {
          const input = h("input.seg-text", { dir: "auto", value: s.text });
          input.addEventListener("change", () => editSegment(s, input.value));
          transcriptBox.append(h("div.seg", h("span.seg-time", L.chapters.stamp(s.start)), input));
        });
        transcriptBox.hidden = !t.segments.length;
      }
      /** Fixes a line: same number of words keeps the timings, otherwise they're spread evenly. */
      function editSegment(seg, text) {
        const t = state.transcript;
        const inSeg = t.words.filter((w) => w.start >= seg.start - 0.05 && w.end <= seg.end + 0.05);
        const next = text.trim().split(/\s+/).filter(Boolean);
        const rest = t.words.filter((w) => !inSeg.includes(w));
        let words;
        if (next.length === inSeg.length) words = inSeg.map((w, i) => ({ ...w, word: next[i] }));
        else {
          const step = (seg.end - seg.start) / Math.max(1, next.length);
          words = next.map((w, i) => ({ word: w, start: seg.start + i * step, end: seg.start + (i + 1) * step - 0.02 }));
        }
        t.words = rest.concat(words).sort((a, b) => a.start - b.start);
        seg.text = text.trim();
      }
      PK.on("transcript", () => { renderTranscript(); renderStyles(); add.disabled = false; });

      const go = button("Transcribe", "secondary", () =>
        run(res, "Preparing the audio…", async () => {
          const t = await PK.transcribe({ language: lang.value });
          result(res, `Transcribed ${plural(t.words.length, "word")}. Fix any word in the lines below, then add captions.`, "ok");
        }, [go, add]));
      const add = button("Add captions", "primary", () =>
        run(res, "Adding captions…", async () => {
          const t = state.transcript;
          if (!t) throw new Error("Transcribe first.");
          if (mode.value === "premiere") {
            const caps = L.captions.group(t.words, { maxWords: Math.min(3, wpc.value) });
            const file = PK.path.join(PK.outDir("Captions"), `${PK.safeName(state.info && state.info.name)} ${PK.stamp()}.srt`);
            PK.fs.writeFileSync(file, "﻿" + L.captions.toSrt(caps), "utf8");
            const r = await host("pk_captions", file);
            return result(res, r.placed ? `Added ${plural(caps.length, "caption")} on a new caption track. Style them from the Text panel.` : r.message, "ok");
          }
          const groups = C.groupWords(t.words, { maxWords: wpc.value });
          const { scene, offset } = C.build(groups, { style, accent: accent.value, y: ypos.value, size: size.value, font: fonts.value || undefined });
          const r = await PK.addGraphic(scene, { start: offset, label: "Captions", onProgress: (p) => { prog.set(p); PK.status(`Rendering captions… ${Math.round(p * 100)}%`, true); } });
          prog.set(null);
          result(res, `Added ${plural(groups.length, "caption")} on V${r.track + 1}. To change a word, fix it in the lines and add them again.`, "ok");
        }, [go, add]), { disabled: !state.transcript });

      function sync() { animBox.hidden = mode.value !== "animated"; }
      el.append(lang.el, go, transcriptBox, mode.el, animBox, add, prog.el, res);
      sync();
      renderTranscript();
      renderStyles();
      this.refresh = async () => { bg = await PK.previewFrame(); renderStyles(); };
    },
    show() { this.refresh && this.refresh(); },
  });

  // ── graphics pickers ─────────────────────────────────────
  function pickerTool(def, cats, opts = {}) {
    let picker = null;
    PK.tool({
      ...def,
      needs: [],
      mount(el) {
        picker = graphicPicker({ cats, ...opts });
        if (opts.lead) el.append(note(opts.lead));
        el.append(picker.el);
      },
      show() { picker && picker.refreshBackground(); },
      hide() { picker && picker.stop(); },
    });
  }
  pickerTool({ id: "titles", name: "Animated titles", group: "Text & graphics", note: "30+ titles and lower thirds" }, ["Titles", "Lower thirds"], { lead: "Pick a title, type your text and add it at the playhead. It's rendered with a transparent background on its own track." });
  pickerTool({ id: "glass", name: "Liquid glass", group: "Text & graphics", note: "Glass cards that bend your footage" }, ["Liquid glass"], { lead: "Real liquid glass: PostKit reads your footage under each card and blurs and bends it, then adds the highlights." });
  pickerTool({ id: "gallery", name: "Motion gallery", group: "Text & graphics", note: "100+ motions, or make one with AI" }, ["Titles", "Liquid glass", "Lower thirds", "Callouts", "Social", "Data", "Transitions"], { withAI: true, withSaved: true });

  // ── safe zones ───────────────────────────────────────────
  PK.tool({
    id: "safe", name: "Safe zones", group: "Text & graphics", note: "TikTok, Reels and Shorts UI", needs: [],
    mount(el) {
      let platform = "tiktok", img = null;
      const canvas = h("canvas.safe-canvas", { hidden: true });
      const res = resultLine();
      const seg = segmented(L.safezones.platforms().map((p) => [p.id, p.name]), "tiktok", (v) => { platform = v; if (img) draw(); });
      function draw() {
        const w = img.naturalWidth, hh = img.naturalHeight;
        canvas.width = w; canvas.height = hh;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const shown = Math.min(canvas.parentElement.clientWidth || 300, w);
        const fontPx = Math.round((12 * w) / shown);
        ctx.font = `600 ${fontPx}px system-ui, sans-serif`;
        for (const a of L.safezones.forFrame(platform, w, hh)) {
          ctx.fillStyle = "rgba(234, 90, 60, 0.38)";
          ctx.fillRect(a.x, a.y, a.w, a.h);
          ctx.strokeStyle = "rgba(255, 140, 110, 0.9)";
          ctx.lineWidth = Math.max(2, w / 400);
          ctx.strokeRect(a.x, a.y, a.w, a.h);
          if (ctx.measureText(a.label).width < a.w - fontPx) { ctx.fillStyle = "#fff"; ctx.fillText(a.label, a.x + fontPx / 2, a.y + fontPx * 1.3); }
        }
        canvas.hidden = false;
      }
      const check = button("Check this frame", "primary block", () =>
        run(res, "Grabbing the frame…", async () => {
          img = (await PK.grabFrame()).img;
          draw();
          result(res, "Keep text and faces out of the red areas.", "ok");
        }, [check]));
      el.append(note("Shows the frame under the playhead the way each app shows it. Nothing is added to your video."), seg.el, check, canvas, res);
    },
  });
})();
