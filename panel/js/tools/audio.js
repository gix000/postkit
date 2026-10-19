/* Audio tools: studio voice, sound effects (built-in pack + AI), automatic SFX, auto ducking. */
(function () {
  "use strict";
  const PK = window.PK;
  const { h, slider, segmented, select, button, resultLine, note, progress } = PK.ui;
  const { L, host, state, plural, secs, run, result, fs, path } = PK;

  /** Speech runs (who's talking when) from the transcript, or from silence detection. */
  async function speechRuns() {
    const t = state.transcript;
    if (t && t.words.length) {
      const runs = [];
      for (const w of t.words) {
        const last = runs[runs.length - 1];
        if (last && w.start - last.end < 0.6) last.end = Math.max(last.end, w.end);
        else runs.push({ start: w.start, end: w.end });
      }
      return runs;
    }
    const clips = await PK.clipsOn("audio", state.tracks.speech, "speech");
    let sil = [];
    for (const c of clips) sil = sil.concat(await L.silence.detectInClip(PK.ffmpegBin(), c, { thresholdDb: -38, minSilence: 0.5 }));
    return L.motion.speechFromSilences(clips, sil);
  }
  PK.speechRuns = speechRuns;

  /** Clips of the speech track cut down to a window [from, to). */
  function windowed(clips, from, to) {
    return clips
      .filter((c) => c.end > from && c.start < to)
      .map((c) => {
        const s = Math.max(c.start, from), e = Math.min(c.end, to);
        return { ...c, start: s, end: e, inPoint: c.inPoint + (s - c.start) };
      });
  }

  // ── studio voice ─────────────────────────────────────────
  PK.tool({
    id: "voice", name: "Studio voice", group: "Audio", note: "Cleaner, warmer, at the right loudness", needs: ["speech"],
    mount(el) {
      const presets = Object.entries(L.voice.PRESETS);
      const preset = select("Sound", presets.map(([id, p]) => [id, `${p.name} — ${p.note}`]), "clean");
      const target = select("Loudness for", Object.entries(L.voice.TARGETS).map(([id, t]) => [id, `${t.name} (${t.lufs} LUFS)`]), "social");
      const findings = h("ul.plain.findings");
      const res = resultLine();
      const ab = h("div.ab", { hidden: true });
      let analysis = null;
      const analyze = button("Check the voice", "secondary", () =>
        run(res, "Listening…", async () => {
          const clips = await PK.clipsOn("audio", state.tracks.speech, "speech");
          const tmp = path.join(PK.os.tmpdir(), `postkit-voice-${Date.now()}.wav`);
          const sample = windowed(clips, clips[0].start, clips[0].start + 120);
          await L.voice.mixdown(PK.ffmpegBin(), sample, tmp);
          analysis = await L.voice.analyze(PK.ffmpegBin(), tmp);
          fs.rmSync(tmp, { force: true });
          findings.innerHTML = "";
          L.voice.findings(analysis, L.voice.TARGETS[target.value]).forEach((f) => findings.append(h("li", f)));
          result(res, "Checked on your computer — free. Pick a sound and preview it.", "ok");
        }, [analyze]));
      const preview = button("Preview 10 s", "secondary", () =>
        run(res, "Making a preview…", async () => {
          const clips = await PK.clipsOn("audio", state.tracks.speech, "speech");
          let from = await PK.playhead();
          if (!clips.some((c) => c.end > from && c.start < from + 10)) from = clips[0].start;
          const part = windowed(clips, from, from + 10);
          const dir = PK.outDir("Voice");
          const before = path.join(PK.os.tmpdir(), `postkit-before-${Date.now()}.wav`);
          const after = path.join(PK.os.tmpdir(), `postkit-after-${Date.now()}.wav`);
          await L.voice.mixdown(PK.ffmpegBin(), part, before);
          await L.voice.mixdown(PK.ffmpegBin(), part, after, { extraFilters: L.voice.chain(preset.value, analysis, target.value) });
          ab.innerHTML = "";
          const a1 = new Audio(PK.fileUrl(before)), a2 = new Audio(PK.fileUrl(after));
          const play = (a, other) => () => { other.pause(); a.currentTime = 0; a.play(); };
          ab.append(button("▶ Before", "secondary", play(a1, a2)), button("▶ After", "primary", play(a2, a1)));
          ab.hidden = false;
          void dir;
          result(res, "Compare before and after.", "ok");
        }, [preview]));
      const apply = button("Apply on a new track", "primary", () =>
        run(res, "Cleaning the voice…", async () => {
          const clips = await PK.clipsOn("audio", state.tracks.speech, "speech");
          const r = await L.voice.process(PK.ffmpegBin(), clips, { preset: preset.value, target: target.value, analysis });
          const dur = clips[clips.length - 1].end - r.start;
          const placed = await host("pk_place", JSON.stringify([{ path: r.file, start: r.start, dur, type: "audio", bin: "Voice", from: state.tracks.speech + 1 }]));
          await host("pk_mute", state.tracks.speech, true);
          result(res, `Clean voice on A${placed.placed[0].track + 1}; A${state.tracks.speech + 1} is muted (unmute it to compare). Your original audio is untouched.`, "ok");
        }, [apply]));
      el.append(note("Measures your voice on your computer for free, then makes it cleaner and clearer at the loudness your platform expects. The original is kept."), analyze, findings, preset.el, target.el, h("div.actions", preview, apply), ab, res);
    },
  });

  // ── sound effects ────────────────────────────────────────
  PK.tool({
    id: "sfx", name: "Sound effects", group: "Audio", note: "28 built-in sounds, or describe one", needs: [],
    mount(el) {
      const pack = PK.sfxPack();
      let cat = "";
      const level = slider("Level", { min: -24, max: 0, value: -8, fmt: (v) => `${v} dB` });
      const chips = h("div.chips");
      const list = h("ul.lib");
      const res = resultLine();
      const generated = () => PK.readJson("sounds.json", { items: [] }).items.filter((s) => fs.existsSync(s.path));
      const all = () => [...generated().map((s) => ({ ...s, category: "Made with AI" })), ...pack];
      let audioEl = null;
      async function place(s) {
        await run(res, "Adding…", async () => {
          const at = await PK.playhead();
          const r = await host("pk_place", JSON.stringify([{ path: s.path, start: at, dur: s.duration || 1, type: "audio", gainDb: level.value, from: state.tracks.speech + 1 }]));
          result(res, `Added “${s.name}” at ${L.chapters.stamp(at)} on A${r.placed[0].track + 1}.`, "ok");
        });
      }
      function render() {
        const cats = [...new Set(all().map((s) => s.category))];
        chips.innerHTML = "";
        ["", ...cats].forEach((c) => chips.append(h("button.chip", { type: "button", "aria-pressed": String(cat === c), on: { click: () => { cat = c; render(); } } }, c || "All")));
        list.innerHTML = "";
        all().filter((s) => !cat || s.category === cat).forEach((s) => {
          const play = h("button.icon-btn", { type: "button", title: "Listen", "aria-label": `Listen to ${s.name}` }, "▶");
          play.addEventListener("click", (e) => { e.stopPropagation(); if (audioEl) audioEl.pause(); audioEl = new Audio(PK.fileUrl(s.path)); audioEl.volume = 0.7; audioEl.play().catch(() => {}); });
          const row = h("button.lib-row", { type: "button", title: "Add at the playhead" }, h("span.lib-name", s.name), h("span.lib-cat", s.category));
          row.addEventListener("click", () => place(s));
          list.append(h("li.sfx-li", play, row));
        });
      }
      const gen = h("div.ai-sfx");
      const prompt = h("input", { placeholder: "Describe a sound… e.g. glass shattering in slow motion", dir: "auto" });
      const len = slider("Length", { min: 0.5, max: 10, step: 0.5, value: 2, fmt: (v) => `${v} s` });
      const make = button("Generate · 6 credits", "primary", () =>
        run(res, "Generating the sound…", async () => {
          if (!prompt.value.trim()) throw new Error("Describe the sound first.");
          const r = await PK.api("/api/panel/sfx", { text: prompt.value, seconds: len.value }, { raw: true });
          const buf = Buffer.from(await r.arrayBuffer());
          const bal = r.headers.get("X-Credits-Balance");
          if (bal) PK.setCredits(+bal);
          const name = prompt.value.trim().slice(0, 40);
          const file = path.join(PK.outDir("Sounds"), `${PK.safeName(name)} ${PK.stamp()}.mp3`);
          fs.writeFileSync(file, buf);
          const data = PK.readJson("sounds.json", { items: [] });
          data.items.unshift({ id: "ai-" + Date.now(), name, path: file, duration: len.value });
          PK.writeJson("sounds.json", data);
          render();
          result(res, `Made “${name}”. Click it in the list to add it.`, "ok");
        }, [make]));
      gen.append(h("h2", "Describe a sound"), prompt, len.el, make);
      PK.on("session", () => (gen.hidden = PK.features().sfx === false));
      gen.hidden = PK.features().sfx === false;
      el.append(note("Click a sound to drop it at the playhead. ▶ to listen first."), level.el, chips, list, gen, res);
      render();
    },
  });

  // ── automatic SFX ────────────────────────────────────────
  const EMPHASIS = new Set("wow boom finally secret never always best worst crazy insane free stop wait important huge million thousand billion biggest fastest perfect literally guaranteed".split(" ").concat("واو يلا سر أبدا أبداً مجانا مجاناً هلق ركز مهم مليون ألف انتبه أحسن أسوأ أكبر فجأة".split(" ")));
  function wordKind(w) {
    const s = String(w).toLowerCase().replace(/[.,!?؟،"“”']/g, "");
    if (/[$€£]|dollar|دولار|ليرة/.test(s)) return "coin";
    if (/\d/.test(s)) return "pop";
    if (EMPHASIS.has(s)) return "impact";
    if (/[?؟]$/.test(String(w))) return "ding";
    return null;
  }
  /** Where automatic sounds go. Returns [{time, sound}] with at least `gap` seconds between. */
  function autoSounds({ words, cuts, graphics, gap }) {
    const ev = [];
    for (const g of graphics) ev.push({ time: Math.max(0, g - 0.05), sound: "swoosh", p: 3 });
    cuts.forEach((c, i) => ev.push({ time: Math.max(0, c - 0.12), sound: i % 2 ? "swipe" : "whoosh", p: 1 }));
    let impacts = 0;
    for (const w of words) {
      const k = wordKind(w.word);
      if (!k) continue;
      if (k === "impact" && impacts++ > 2) { ev.push({ time: w.start, sound: "pop", p: 2 }); continue; }
      ev.push({ time: w.start, sound: k, p: 2 });
    }
    ev.sort((a, b) => a.time - b.time || b.p - a.p);
    const out = [];
    for (const e of ev) {
      const last = out[out.length - 1];
      if (last && e.time - last.time < gap) { if (e.p > last.p) out[out.length - 1] = e; continue; }
      out.push(e);
    }
    return out;
  }
  PK.autoSounds = autoSounds;

  PK.tool({
    id: "autosfx", name: "Automatic SFX", group: "Audio", note: "Sounds on cuts, words and graphics", needs: ["speech", "camera"],
    mount(el) {
      const onCuts = h("input", { type: "checkbox", checked: true });
      const onWords = h("input", { type: "checkbox", checked: true });
      const onGfx = h("input", { type: "checkbox", checked: true });
      const density = segmented([["4", "Subtle"], ["2.5", "Normal"], ["1.2", "Lots"]], "2.5");
      const level = slider("Level", { min: -24, max: 0, value: -10, fmt: (v) => `${v} dB` });
      const res = resultLine();
      const go = button("Add the sounds", "primary", () =>
        run(res, "Finding the moments…", async () => {
          const words = onWords.checked ? (await PK.needTranscript()).words : [];
          let cuts = [], graphics = [];
          if (onCuts.checked && state.tracks.camera >= 0) {
            const clips = (await host("pk_clips", "video", state.tracks.camera)).clips;
            cuts = clips.slice(1).map((c) => c.start);
          }
          if (onGfx.checked && state.info) {
            for (const t of state.info.tracks.video) {
              if (t.index <= state.tracks.camera || !t.clips) continue;
              const clips = (await host("pk_clips", "video", t.index)).clips;
              graphics = graphics.concat(clips.filter((c) => /PostKit[\\/]Graphics/i.test(c.mediaPath)).map((c) => c.start));
            }
          }
          const plan = autoSounds({ words, cuts, graphics, gap: +density.value });
          if (!plan.length) throw new Error("Nothing to put sounds on yet. Add captions, graphics or cuts first.");
          const items = plan.map((p) => { const s = PK.sfxById(p.sound); return { path: s.path, start: p.time, dur: s.duration, type: "audio", gainDb: level.value, from: state.tracks.speech + 1 }; });
          PK.status(`Placing ${plural(items.length, "sound")}…`, true);
          const r = await host("pk_place", JSON.stringify(items));
          const tracks = [...new Set(r.placed.map((p) => `A${p.track + 1}`))].join(", ");
          result(res, `Added ${plural(items.length, "sound")} on ${tracks}. Delete any you don't like.`, "ok");
        }, [go]));
      el.append(note("Picks moments from what's said and what's on screen, and drops a fitting sound on each. Uses the built-in sounds; no credits."), h("label.check", onCuts, " On cuts (whooshes)"), h("label.check", onWords, " On numbers and key words"), h("label.check", onGfx, " When PostKit graphics appear"), density.el, level.el, go, res);
    },
  });

  // ── auto ducking ─────────────────────────────────────────
  PK.tool({
    id: "duck", name: "Auto ducking", group: "Audio", note: "Music dips under the voice", needs: ["speech", "music"],
    mount(el) {
      const under = slider("Music under the voice", { min: -36, max: -6, value: -20, fmt: (v) => `${v} dB` });
      const between = slider("Music in the pauses", { min: -24, max: 0, value: -8, fmt: (v) => `${v} dB` });
      const ramp = slider("Fade", { min: 0.05, max: 1, step: 0.05, value: 0.25, fmt: (v) => `${(+v).toFixed(2)} s` });
      const res = resultLine();
      const go = button("Duck the music", "primary", () =>
        run(res, "Finding the voice…", async () => {
          if (state.tracks.music < 0) throw new Error("Pick the music track.");
          const music = (await host("pk_clips", "audio", state.tracks.music)).clips;
          if (!music.length) throw new Error("The music track has no clips.");
          const runs = await speechRuns();
          const keys = L.motion.duckKeys(runs, { under: under.value, between: between.value, ramp: ramp.value, start: music[0].start, end: music[music.length - 1].end });
          const r = await host("pk_volumeKeys", state.tracks.music, JSON.stringify(keys));
          result(res, `Wrote ${plural(r.keys, "volume keyframe")} on A${state.tracks.music + 1}.`, "ok");
        }, [go]));
      el.append(note("Lowers the music while someone speaks and brings it back up in the pauses, with volume keyframes you can still adjust."), under.el, between.el, ramp.el, go, res);
    },
  });
})();
