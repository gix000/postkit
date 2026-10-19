/* The AI editor: you say what you want; it looks at the video (transcript, pauses,
 * stills), plans with only the tools the job needs, shows you the plan and a few
 * colour looks, then performs it on a copy of the sequence. */
(function () {
  "use strict";
  const PK = window.PK;
  const { h, button, resultLine, note, select, segmented, progress } = PK.ui;
  const { L, host, state, plural, secs, result, fs } = PK;

  const EXAMPLES = [
    "Make this a punchy TikTok",
    "Clean it up: cut pauses and retakes, add captions",
    "Calm, cinematic edit with a warm grade",
    "Add captions and a few glass cards for the key points",
    "Reel in Lebanese style, bold yellow captions, lots of energy",
  ];
  const cost = (seconds) => 12 + 4 * Math.ceil(Math.max(1, seconds) / 60);

  // ── taste ────────────────────────────────────────────────
  const TASTE_DEFAULT = { pace: "auto", captions: "auto", words: "auto", accent: "", font: "", graphics: "auto", sfx: "auto", color: "auto", zoom: "auto", hook: "auto", notes: "" };
  const taste = () => ({ ...TASTE_DEFAULT, ...PK.readJson("taste.json", {}) });
  /** Only what the creator actually set (auto means "you choose"). */
  function tasteForAI() {
    const t = taste(), out = {};
    for (const [k, v] of Object.entries(t)) if (v && v !== "auto") out[k] = v;
    return out;
  }

  function tasteView() {
    const t = taste();
    const caps = [["auto", "You choose"], ["off", "No captions"], ["premiere", "Premiere captions"], ...window.PKCaptions.list().map((s) => [s.id, s.name])];
    const looks = [["auto", "You choose"], ["off", "Don't grade"], ...L.looks.list().map((l) => [l.id, l.name])];
    const f = {
      pace: select("Pace", [["auto", "You choose"], ["calm", "Calm"], ["normal", "Normal"], ["fast", "Fast"]], t.pace),
      captions: select("Captions", caps, t.captions),
      words: select("Words per caption", [["auto", "You choose"], ["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"]], String(t.words)),
      font: select("Font", [["", "You choose"], ...window.PKFonts.FAMILIES.map((x) => [x.family, x.family])], t.font),
      graphics: select("Graphics", [["auto", "You choose"], ["none", "None"], ["few", "A few"], ["more", "Plenty"]], t.graphics),
      sfx: select("Sound effects", [["auto", "You choose"], ["off", "None"], ["subtle", "Subtle"], ["lots", "Lots"]], t.sfx),
      color: select("Colour", looks, t.color),
      zoom: select("Zoom", [["auto", "You choose"], ["off", "No zoom"], ["punch", "Punch-ins"], ["push", "Slow pushes"]], t.zoom),
      hook: select("Hook at the start", [["auto", "You choose"], ["off", "Never"]], t.hook),
    };
    const accent = h("input", { type: "color", value: t.accent || "#ffd60a" });
    const useAccent = h("input", { type: "checkbox", checked: !!t.accent });
    const notes = h("textarea", { rows: 3, placeholder: "Anything else — e.g. no emojis, keep it classy, my brand colours are navy and gold", dir: "auto" });
    notes.value = t.notes || "";
    const saved = resultLine();
    const save = button("Save my taste", "primary", () => {
      const out = {};
      for (const [k, s] of Object.entries(f)) out[k] = s.value;
      out.accent = useAccent.checked ? accent.value : "";
      out.notes = notes.value.trim();
      PK.writeJson("taste.json", out);
      result(saved, "Saved. The AI editor uses it every time.", "ok");
    });
    const reset = button("Let the AI choose everything", "link", () => { PK.writeJson("taste.json", {}); PK.emit("taste:reset"); result(saved, "Cleared — the AI picks the style from each video.", "ok"); });
    return h("div.taste",
      note("Set this once. Leave anything on “You choose” and the AI picks it from the kind of video."),
      h("div.grid2", f.pace.el, f.zoom.el), h("div.grid2", f.captions.el, f.words.el), h("div.grid2", f.graphics.el, f.sfx.el), h("div.grid2", f.color.el, f.hook.el), f.font.el,
      h("label.check", useAccent, " Brand colour ", accent),
      h("label", "Notes", notes), save, reset, saved);
  }

  // ── context for the plan ─────────────────────────────────
  function catalog() {
    return {
      templates: window.PKTemplates.list().map((t) => ({ id: t.id, name: t.name, cat: t.cat, fields: t.fields })),
      captions: window.PKCaptions.list().map((s) => ({ id: s.id, name: s.name })),
      looks: L.looks.list(),
      sfx: PK.sfxPack().map((s) => ({ id: s.id, name: s.name, tags: s.tags })),
      presets: L.presets.list().map((p) => p.id),
      voices: Object.keys(L.voice.PRESETS),
      fonts: window.PKFonts.FAMILIES.map((f) => f.family),
    };
  }

  async function gather(onStep) {
    const info = await PK.loadSequence();
    if (!info) throw new Error("Open a sequence in Premiere first.");
    const ctx = { info, transcript: null, pauses: null, frames: [], framePath: null };
    if (PK.features().transcribe !== false) {
      onStep("Transcribing…");
      ctx.transcript = await PK.needTranscript();
    }
    onStep("Listening for pauses…");
    try {
      const clips = await PK.clipsOn("audio", state.tracks.speech, "speech");
      let sil = [];
      for (const c of clips) sil = sil.concat(await L.silence.detectInClip(PK.ffmpegBin(), c, { thresholdDb: -35, minSilence: 0.4 }));
      ctx.pauses = { count: sil.length, seconds: sil.reduce((s, r) => s + r.end - r.start, 0), longest: sil.reduce((m, r) => Math.max(m, r.end - r.start), 0) };
      ctx.silences = sil;
    } catch (e) {
      ctx.pauses = null;
    }
    onStep("Looking at the video…");
    const dur = info.duration || 10;
    for (const p of [0.12, 0.38, 0.62, 0.88]) {
      try {
        const f = await PK.grabFrame(dur * p);
        if (!ctx.framePath) ctx.framePath = f.path;
        ctx.frames.push({ t: dur * p, data: PK.jpegB64(f.img, 640) });
      } catch (e) { /* no frame there */ }
    }
    return ctx;
  }

  // ── the plan, as steps the creator can switch off ────────
  const STEP_ORDER = ["cut_silences", "remove_takes", "hook", "zoom", "moves", "captions", "graphics", "sfx", "progress_bar", "color", "voice", "music_duck", "chapters"];
  function describe(plan, key, ctx) {
    const v = plan[key];
    const seg = (id) => ctx.transcript && ctx.transcript.segments.find((s) => s.id === id);
    switch (key) {
      case "cut_silences": return { title: "Cut the pauses", detail: `Pauses over ${(+v.min_pause).toFixed(2)} s${ctx.pauses ? ` — about ${plural(ctx.pauses.count, "pause")}` : ""}` };
      case "remove_takes": return v.segment_ids && v.segment_ids.length ? { title: `Remove ${plural(v.segment_ids.length, "retake")}`, detail: v.segment_ids.map((id) => (seg(id) ? `“${seg(id).text.slice(0, 60)}”` : "")).filter(Boolean).slice(0, 3).join(" · ") } : null;
      case "hook": return seg(v.segment_id) ? { title: "Open on a hook", detail: `“${seg(v.segment_id).text.slice(0, 90)}”` } : null;
      case "zoom": return { title: v.style === "push" ? "Slow pushes" : "Punch-in zooms", detail: `${Math.round(v.amount)}% on each sentence` };
      case "moves": return v.length ? { title: `${plural(v.length, "camera move")}`, detail: v.map((m) => (L.presets.PRESETS[m.preset] || {}).name).filter(Boolean).slice(0, 4).join(", ") } : null;
      case "captions": return { title: "Captions", detail: v.style === "premiere" ? "Premiere captions you can edit" : `${(window.PKCaptions.STYLES[v.style] || {}).name || v.style}, ${v.words_per_caption || 3} words at a time` };
      case "graphics": return v.length ? { title: plural(v.length, "graphic"), detail: v.map((g) => (window.PKTemplates.get(g.template) || {}).name).filter(Boolean).join(", ") } : null;
      case "sfx": return v.length ? { title: plural(v.length, "sound effect"), detail: [...new Set(v.map((s) => (PK.sfxById(s.sound) || {}).name))].filter(Boolean).join(", ") } : null;
      case "progress_bar": return v ? { title: "Progress bar", detail: "A thin bar along the bottom" } : null;
      case "color": return { title: "Colour grade", detail: "Pick a look below" };
      case "voice": return { title: "Studio voice", detail: `${(L.voice.PRESETS[v.preset] || {}).name || v.preset} for ${(L.voice.TARGETS[v.target || "social"] || {}).name}` };
      case "music_duck": return state.tracks.music >= 0 ? { title: "Duck the music", detail: `${v.under_db || -20} dB under the voice` } : null;
      case "chapters": return v ? { title: "Chapter markers", detail: "From the topics in the transcript" } : null;
      default: return null;
    }
  }

  // ── doing it ─────────────────────────────────────────────
  const norm = (s) => String(s).toLowerCase().normalize("NFKD").replace(/[ً-ْـ]/g, "").replace(/[^\p{L}\p{N}]/gu, "");

  async function execute(plan, on, ctx, look, log) {
    const T = ctx.transcript || { words: [], segments: [], language: null };
    const accent = (plan.style && plan.style.accent) || "#ffd60a";
    const camera = state.tracks.camera, speech = state.tracks.speech, music = state.tracks.music;
    const step = async (label, fn) => {
      const li = log(label, "busy");
      try {
        const msg = await fn();
        li.done(msg || "", "ok");
      } catch (err) {
        li.done(err.message || String(err), "err");
      }
    };

    // A copy, always.
    const dup = await host("pk_duplicate", "PostKit edit");
    await PK.loadSequence();
    let removed = [], hook = null;

    // Cuts: pauses and retakes in one pass.
    const ranges = [];
    if (on.cut_silences && ctx.silences) {
      const c = plan.cut_silences;
      ranges.push(...L.silence.planCuts(ctx.silences, { padding: +c.padding || 0.12, minSilence: +c.min_pause || 0.4, fps: PK.fps() }));
    }
    if (on.remove_takes) for (const id of plan.remove_takes.segment_ids || []) {
      const s = T.segments.find((x) => x.id === id);
      if (s) ranges.push({ start: Math.max(0, s.start - 0.04), end: s.end + 0.04 });
    }
    if (ranges.length) {
      await step("Cutting pauses and retakes", async () => {
        const f = PK.fps();
        const snapped = L.edl.merge(ranges).map((r) => ({ start: Math.round(r.start * f) / f, end: Math.round(r.end * f) / f })).filter((r) => r.end > r.start);
        const r = await host("pk_cut", JSON.stringify(snapped), speech, camera);
        removed = r.applied || [];
        await host("pk_crossfades", speech, 2).catch(() => null);
        return `${secs(r.removedSeconds)} removed`;
      });
    }

    if (on.hook) {
      await step("Opening on the hook", async () => {
        const s = T.segments.find((x) => x.id === plan.hook.segment_id);
        if (!s) throw new Error("Couldn't find that line.");
        // Where the line sits after the cuts (trimmed if a pause cut touched its edges).
        const moved = L.edl.mapSegments([s], removed, null)[0];
        if (!moved) throw new Error("That line was cut.");
        const a = moved.start, b = moved.end;
        const r = await host("pk_hook", a, b + 0.08, speech, camera);
        hook = { start: a, end: a + r.seconds };
        return secs(r.seconds);
      });
    }

    // Everything after this uses edited times.
    const W = L.edl.mapWords(T.words, removed, hook);
    const S = L.edl.mapSegments(T.segments, removed, hook);
    if (T.words.length) {
      state.transcript = { language: T.language, words: W, segments: S.map((s, i) => ({ ...s, id: i })) };
      state.transcriptSeq = state.info && state.info.id;
    }
    const segAt = (id) => S.find((s) => s.id === id);
    const hookSeg = hook ? [{ start: 0, end: hook.end - hook.start, text: "" }] : [];
    await PK.loadSequence();

    if (on.zoom && camera >= 0) {
      await step("Zooming on each sentence", async () => {
        const keys = L.zoom.plan(hookSeg.concat(S), { style: plan.zoom.style, amount: Math.max(4, Math.min(30, +plan.zoom.amount || 12)), fps: PK.fps() });
        const r = await host("pk_zoom", JSON.stringify(keys), camera);
        return plural(r.keys, "keyframe");
      });
    }

    if (on.moves && camera >= 0 && plan.moves.length) {
      await step("Camera moves", async () => {
        const items = [];
        for (const m of plan.moves) {
          const s = segAt(m.segment_id);
          if (!s || !L.presets.PRESETS[m.preset]) continue;
          const keys = L.presets.plan(m.preset, { start: s.start, end: s.end }, { strength: "medium", fps: PK.fps() });
          if (on.zoom) delete keys.scale; // zoom owns Scale
          if (Object.keys(keys).length) items.push({ time: s.start + 0.01, keys });
        }
        const r = await host("pk_keysAt", camera, JSON.stringify(items));
        return plural(r.keys, "keyframe");
      });
    }

    if (on.captions && W.length) {
      await step("Captions", async () => {
        const c = plan.captions;
        if (c.style === "premiere") {
          const caps = L.captions.group(W, { maxWords: Math.min(3, c.words_per_caption || 3) });
          const file = PK.path.join(PK.outDir("Captions"), `${PK.safeName(dup.name)} ${PK.stamp()}.srt`);
          fs.writeFileSync(file, "﻿" + L.captions.toSrt(caps), "utf8");
          await host("pk_captions", file);
          return plural(caps.length, "caption");
        }
        const groups = window.PKCaptions.groupWords(W, { maxWords: c.words_per_caption || (window.PKCaptions.STYLES[c.style] || {}).words || 3 });
        const { scene, offset } = window.PKCaptions.build(groups, { style: c.style, accent, y: c.y || 0.66 });
        await PK.addGraphic(scene, { start: offset, label: "Captions", onProgress: (p) => PK.status(`Rendering captions… ${Math.round(p * 100)}%`, true) });
        return plural(groups.length, "caption");
      });
    }

    if (on.graphics && plan.graphics.length) {
      let n = 0;
      for (const g of plan.graphics) {
        if (g._off) continue;
        const t = window.PKTemplates.get(g.template);
        const s = segAt(g.segment_id);
        if (!t || !s) continue;
        await step(t.name, async () => {
          const scene = window.PKTemplates.build(g.template, { ...(g.fields || {}), accent, y: g.y, dur: g.duration ? Math.max(1, Math.min(8, +g.duration)) : undefined });
          await PK.addGraphic(scene, { start: s.start + (+g.offset || 0), label: t.name, onProgress: (p) => PK.status(`Rendering ${t.name}… ${Math.round(p * 100)}%`, true) });
          n++;
          return `at ${L.chapters.stamp(s.start + (+g.offset || 0))}`;
        });
      }
    }

    if (on.sfx && plan.sfx.length) {
      await step("Sound effects", async () => {
        const items = [];
        for (const x of plan.sfx) {
          const s = segAt(x.segment_id);
          const snd = PK.sfxById(x.sound);
          if (!s || !snd) continue;
          let at = s.start + (+x.offset || 0);
          if (x.word) {
            const w = W.find((w) => w.start >= s.start - 0.05 && w.end <= s.end + 0.05 && norm(w.word) === norm(x.word));
            if (w) at = w.start;
          }
          items.push({ path: snd.path, start: Math.max(0, at), dur: snd.duration, type: "audio", gainDb: Math.max(-24, Math.min(0, x.gain_db === undefined ? -10 : +x.gain_db)), from: speech + 1 });
        }
        if (!items.length) return "none placed";
        await host("pk_place", JSON.stringify(items));
        return plural(items.length, "sound");
      });
    }

    if (on.progress_bar) {
      await step("Progress bar", async () => {
        const total = (state.info && state.info.duration) || 10;
        const scene = window.PKTemplates.build("progress-line", { accent, dur: total });
        await PK.addGraphic(scene, { start: 0, label: "Progress bar", onProgress: (p) => PK.status(`Rendering the progress bar… ${Math.round(p * 100)}%`, true) });
      });
    }

    if (on.color && look && camera >= 0) {
      await step(`Colour: ${L.looks.LOOKS[look].name}`, async () => {
        const r = await host("pk_look", JSON.stringify(PK.looks.lookValues(look, 1)), camera);
        return plural(r.clips, "clip");
      });
    }

    if (on.voice) {
      await step("Studio voice", async () => {
        const clips = await PK.clipsOn("audio", speech, "speech");
        const r = await L.voice.process(PK.ffmpegBin(), clips, { preset: plan.voice.preset, target: plan.voice.target || "social" });
        const dur = clips[clips.length - 1].end - r.start;
        const p = await host("pk_place", JSON.stringify([{ path: r.file, start: r.start, dur, type: "audio", bin: "Voice", from: speech + 1 }]));
        await host("pk_mute", speech, true);
        return `on A${p.placed[0].track + 1}`;
      });
    }

    if (on.music_duck && music >= 0) {
      await step("Ducking the music", async () => {
        const mclips = (await host("pk_clips", "audio", music)).clips;
        if (!mclips.length) throw new Error("No music clips.");
        const runs = await PK.speechRuns();
        const d = plan.music_duck;
        const keys = L.motion.duckKeys(runs, { under: d.under_db || -20, between: d.between_db || -8, start: mclips[0].start, end: mclips[mclips.length - 1].end });
        const r = await host("pk_volumeKeys", music, JSON.stringify(keys));
        return plural(r.keys, "keyframe");
      });
    }

    if (on.chapters && S.length) {
      await step("Chapter markers", async () => {
        const ch = L.chapters.chapters(S);
        if (ch.length < 3) return "too short for chapters";
        const r = await host("pk_markers", JSON.stringify(ch.map((c) => ({ time: c.time, name: c.title, color: 1 }))));
        return plural(r.added, "marker");
      });
    }
    return dup;
  }

  // ── the home screen ──────────────────────────────────────
  function mountHome(root) {
    const ask = h("textarea#ai-ask", { rows: 3, placeholder: "Tell it what you want, in plain words…", dir: "auto" });
    const chips = h("div.chips.examples");
    EXAMPLES.forEach((e) => chips.append(h("button.chip", { type: "button", on: { click: () => { ask.value = e; ask.focus(); } } }, e)));
    const costLine = h("p.muted.small.cost");
    const res = resultLine();
    const planBtn = button("Plan the edit", "primary", () => startPlan());
    const tasteBtn = h("button.secondary.icon-label", { type: "button", html: PK.ui.ICONS.taste + "<span>Your taste</span>", on: { click: () => PK.emit("open:taste") } });
    const off = note("");
    const homeBox = h("div.ai-box", h("h1", "What should I edit?"), ask, chips, h("div.actions", tasteBtn, planBtn), costLine, off, res);

    const planBox = h("div.ai-plan", { hidden: true });
    const runBox = h("div.ai-run", { hidden: true });
    root.append(homeBox, planBox, runBox);
    // The tool grid only shows next to the request box, not under a plan or a running edit.
    new MutationObserver(() => { const g = document.getElementById("tool-groups"); if (g) g.hidden = homeBox.hidden; }).observe(homeBox, { attributes: true, attributeFilter: ["hidden"] });

    function updateCost() {
      const d = (state.info && state.info.duration) || 0;
      const c = cost(d);
      const bal = state.session && typeof state.session.credits === "number" ? state.session.credits : null;
      costLine.textContent = `Planning costs ${c} credits${d ? ` for this ${secs(d)} sequence` : ""}${bal !== null ? ` · you have ${bal.toLocaleString()}` : ""}. Doing the edit is free.`;
    }
    PK.on("sequence", updateCost);
    PK.on("credits", updateCost);
    PK.on("session", () => {
      updateCost();
      const ai = PK.features().ai !== false;
      off.textContent = ai ? "" : "The AI editor isn't switched on on the server yet. Every tool below works without it.";
      planBtn.disabled = !ai;
    });
    updateCost();

    let ctx = null, plan = null;
    async function startPlan() {
      if (!ask.value.trim()) { ask.focus(); return result(res, "Tell it what you want first — or pick one of the examples.", "err"); }
      await PK.run(res, "Getting ready…", async () => {
        ctx = await gather((s) => PK.status(s, true));
        PK.status("Planning the edit…", true);
        const data = await PK.api("/api/panel/ai/plan", {
          instruction: ask.value.trim(),
          taste: tasteForAI(),
          video: { name: ctx.info.name, duration: ctx.info.duration || 0, fps: ctx.info.fps, width: ctx.info.width, height: ctx.info.height, cameras: ctx.info.tracks.video.filter((t) => t.clips).length, hasMusic: state.tracks.music >= 0 },
          transcript: ctx.transcript ? { language: ctx.transcript.language, segments: ctx.transcript.segments.map((s) => ({ id: s.id, start: +s.start.toFixed(2), end: +s.end.toFixed(2), text: s.text })) } : null,
          pauses: ctx.pauses || undefined,
          frames: ctx.frames,
          catalog: catalog(),
        });
        plan = data.plan;
        await showPlan(data);
      }, [planBtn]);
    }

    async function showPlan(data) {
      planBox.innerHTML = "";
      const on = {};
      const list = h("ul.steps");
      for (const key of STEP_ORDER) {
        if (plan[key] === undefined || plan[key] === null || plan[key] === false) continue;
        const d = describe(plan, key, ctx);
        if (!d) continue;
        on[key] = true;
        const box = h("input", { type: "checkbox", checked: true });
        box.addEventListener("change", () => (on[key] = box.checked));
        const why = plan[key] && plan[key].why ? plan[key].why : Array.isArray(plan[key]) && plan[key][0] && plan[key][0].why ? plan[key][0].why : "";
        const li = h("li.step", h("label.check", box, h("span.step-title", d.title)), h("p.step-detail", { dir: "auto" }, d.detail), why ? h("p.step-why", { dir: "auto" }, why) : null);
        if (key === "graphics") {
          const sub = h("ul.sub");
          plan.graphics.forEach((g) => {
            const t = window.PKTemplates.get(g.template);
            if (!t) return;
            const cb = h("input", { type: "checkbox", checked: true });
            cb.addEventListener("change", () => (g._off = !cb.checked));
            const text = g.fields ? Object.values(g.fields).filter(Boolean).join(" · ") : "";
            sub.append(h("li", h("label.check", cb, ` ${t.name}`, text ? h("span.muted", { dir: "auto" }, ` — ${text.slice(0, 50)}`) : "")));
          });
          li.append(sub);
        }
        list.append(li);
      }
      let look = null;
      const looksBox = h("div.tiles.looks-grid");
      if (plan.color && ctx.framePath) {
        const ids = (plan.color.looks || []).filter((id) => L.looks.LOOKS[id]);
        look = L.looks.LOOKS[plan.color.recommended] ? plan.color.recommended : ids[0];
        try {
          const files = await PK.looks.lookPreviews(ctx.framePath, ids);
          looksBox.append(h("button.tile", { type: "button", disabled: true }, h("img.look-img", { src: PK.fileUrl(ctx.framePath), alt: "" }), h("span.tile-name", "Now")));
          ids.forEach((id) => {
            const t = h("button.tile", { type: "button", "aria-pressed": String(id === look), title: L.looks.LOOKS[id].note }, h("img.look-img", { src: PK.fileUrl(files[id]), alt: "" }), h("span.tile-name", L.looks.LOOKS[id].name + (id === plan.color.recommended ? " ★" : "")));
            t.addEventListener("click", () => { look = id; looksBox.querySelectorAll(".tile").forEach((x) => x.setAttribute("aria-pressed", String(x === t))); });
            looksBox.append(t);
          });
        } catch (e) { /* previews are a nicety */ }
      }
      const style = plan.style || {};
      const go = button("Edit it on a copy", "primary", () => doIt());
      const back = button("Change the request", "secondary", () => { planBox.hidden = true; homeBox.hidden = false; });
      planBox.append(
        h("h1", "The plan"),
        h("p.summary", { dir: "auto" }, plan.summary || ""),
        h("p.style-line", h("span.swatch", { style: { background: style.accent || "#ffd60a" } }), ` ${style.name || "Your style"} · ${style.pace || "normal"} pace${style.font ? ` · ${style.font}` : ""}`),
        list,
        looksBox.children.length ? h("div", h("h2", "Pick a look"), looksBox) : null,
        note(`Planned for ${data.cost} credits · ${data.balance.toLocaleString()} left. Nothing has changed yet — it works on a copy of your sequence.`),
        h("div.actions", back, go),
      );
      homeBox.hidden = true;
      planBox.hidden = false;
      planBox.scrollIntoView({ block: "start" });

      async function doIt() {
        runBox.innerHTML = "";
        const steps = h("ul.run-steps");
        const prog = h("p.result");
        const done = button("Back to the editor", "secondary", () => { runBox.hidden = true; homeBox.hidden = false; });
        done.hidden = true;
        runBox.append(h("h1", "Editing…"), steps, prog, done);
        planBox.hidden = true;
        runBox.hidden = false;
        const log = (label) => {
          const li = h("li.busy", h("span.run-label", label), h("span.run-note"));
          steps.append(li);
          return { done(msg, kind) { li.className = kind; li.querySelector(".run-note").textContent = msg ? ` — ${msg}` : ""; } };
        };
        await PK.run(prog, "Editing…", async () => {
          const dup = await execute(plan, on, ctx, look, log);
          runBox.querySelector("h1").textContent = "Done";
          const failed = steps.querySelectorAll("li.err").length;
          result(prog, `Edited on “${dup.name}”. Your original sequence is untouched.${failed ? ` ${plural(failed, "step")} didn't work — see above.` : ""}`, failed ? "" : "ok");
        });
        done.hidden = false;
      }
    }
  }

  PK.ai = { mountHome, tasteView, execute, catalog, cost };
})();
