/* Start from video files: pick a video (or a few clips) and optional music; PostKit
 * builds the sequence in the format you want, works out whether someone is talking or
 * it's footage for a montage, and does the whole edit. */
(function () {
  "use strict";
  const PK = window.PK;
  PK.autoedit = PK.autoedit || {};
  const { h, button, select, note, resultLine } = PK.ui;
  const { L, host, state, plural, secs, fs, path, result } = PK;

  const VIDEO_TYPES = ["mp4", "mov", "m4v", "mxf", "avi", "mkv", "mts", "m2ts", "webm", "3gp", "mpg"];
  const AUDIO_TYPES = ["mp3", "wav", "m4a", "aac", "aif", "aiff", "flac", "ogg"];
  const TRANSITIONS = ["flash", "dip-black", "circle-wipe", "bars-wipe", "diagonal-swipe", "light-sweep", "light-leak", "zoom-lines", "glitch-bars"];

  function pick(multiple, types, title) {
    const dlg = window.cep && window.cep.fs && window.cep.fs.showOpenDialogEx;
    if (!dlg) throw new Error("Open PostKit from Premiere Pro to choose files.");
    const r = window.cep.fs.showOpenDialogEx(multiple, false, title, "", types);
    return (r && r.data) || [];
  }

  /** One still from the middle of a clip, as base64 JPEG (for the AI). */
  async function still(bin, file, at) {
    const out = path.join(PK.os.tmpdir(), `postkit-still-${Date.now()}-${Math.round(Math.random() * 1e5)}.jpg`);
    await L.ffmpeg.run(bin, ["-y", "-ss", at.toFixed(2), "-i", file, "-frames:v", "1", "-vf", "scale=480:-2", "-q:v", "5", out]);
    const b64 = fs.readFileSync(out).toString("base64");
    fs.rmSync(out, { force: true });
    return b64;
  }

  /** The value of a beat grid in beats per minute. */
  function bpmOf(beats) {
    if (!beats || beats.length < 4) return null;
    const gaps = [];
    for (let i = 1; i < beats.length; i++) gaps.push(beats[i] - beats[i - 1]);
    gaps.sort((a, b) => a - b);
    let p = gaps[Math.floor(gaps.length / 2)];
    while (p < 0.33) p *= 2;
    while (p > 1) p /= 2;
    return 60 / p;
  }

  function mount(home) {
    let files = [], music = null;
    const list = h("ul.file-list");
    const res = resultLine();
    function renderFiles() {
      list.innerHTML = "";
      files.forEach((f, i) => list.append(h("li", h("span.file-name", path.basename(f)), button("×", "link", () => { files.splice(i, 1); renderFiles(); }, { "aria-label": `Remove ${path.basename(f)}` }))));
      if (music) list.append(h("li.music", h("span.file-name", "♪ " + path.basename(music)), button("×", "link", () => { music = null; renderFiles(); }, { "aria-label": "Remove the music" })));
      go.disabled = !files.length;
      go.textContent = files.length ? `Make the edit · ${plural(files.length, "video")}` : "Make the edit";
    }
    const addV = button("+ Add videos", "secondary", () => { try { files = files.concat(pick(true, VIDEO_TYPES, "Choose your videos").filter((f) => !files.includes(f))); renderFiles(); } catch (e) { result(res, e.message, "err"); } });
    const addM = button("♪ Add music", "secondary", () => { try { const m = pick(false, AUDIO_TYPES, "Choose the music"); if (m[0]) music = m[0]; renderFiles(); } catch (e) { result(res, e.message, "err"); } });
    const format = select("Format", [["vertical", "Vertical 9:16 — TikTok, Reels, Shorts"], ["original", "Same as the footage"], ["square", "Square 1:1"], ["horizontal", "Horizontal 16:9 — YouTube"]], "vertical");
    const lengthSel = select("Length", [["auto", "You choose"], ["15", "About 15 s"], ["30", "About 30 s"], ["60", "About 60 s"], ["full", "As long as it needs"]], "auto");
    const keep = h("input", { type: "checkbox" });
    const review = h("input", { type: "checkbox" });
    const go = button("Make the edit", "primary", () => run(), { disabled: true });
    const box = h("div.from-files",
      h("h2", "Start from video files"),
      note("Pick one video or a few clips, and music if you like. PostKit builds the sequence, works out whether someone is talking or it's footage for a montage, and does the whole edit — the request above is optional."),
      h("div.actions", addV, addM), list,
      h("div.grid2", format.el, lengthSel.el),
      h("label.check", keep, " Keep the clips' own sound (montages)"),
      h("label.check", review, " Show me the plan before editing"),
      go, res);
    // Two ways in: edit the open sequence, or start from files. The request box serves both.
    const sw = PK.ui.segmented([["files", "Start from videos"], ["sequence", "Edit this sequence"]], "files", (v) => show(v));
    const heading = home.homeBox.querySelector("h1");
    heading.after(sw.el);
    home.homeBox.querySelector(".chips.examples").after(box);
    box.querySelector("h2").hidden = true;
    function show(v) {
      box.hidden = v !== "files";
      home.homeBox.querySelectorAll(".seq-only").forEach((el) => (el.hidden = v === "files"));
      heading.textContent = v === "files" ? "Give it a video" : "What should I edit?";
    }
    let chosen = false;
    sw.el.addEventListener("change", () => (chosen = true));
    PK.on("sequence", (info) => {
      if (chosen) return;
      const v = info ? "sequence" : "files";
      sw.el.querySelectorAll("input").forEach((i) => { i.checked = i.value === v; i.parentElement.classList.toggle("on", i.checked); });
      show(v);
    });
    show("files");

    async function run(opts = {}) {
      if (opts.files) files = opts.files;
      if (!files.length) return;
      const view = home.runView("Making your edit…");
      let showedPlan = false;
      await PK.run(view.prog, "Working…", async () => {
        const bin = PK.ffmpegBin();
        const fmt = opts.frame || L.footage.FORMATS[format.value];
        const infos = [];
        await view.step(`Reading ${plural(files.length, "video")}`, async () => {
          for (const f of files) infos.push(await L.footage.probe(bin, f));
          const bad = files.filter((f, i) => !infos[i].duration || !infos[i].width);
          if (bad.length) throw new Error(`Couldn't read ${bad.map((b) => path.basename(b)).join(", ")}.`);
          return secs(infos.reduce((s, i) => s + i.duration, 0)) + " of footage";
        }, { fatal: true });

        const base = PK.safeName(path.basename(files[0]).replace(/\.[^.]+$/, ""));
        let raw;
        await view.step("Building the sequence", async () => {
          raw = await host("pk_newSequence", `${base} — PostKit`, JSON.stringify(files), fmt ? fmt.w : 0, fmt ? fmt.h : 0, false);
          await PK.loadSequence();
          if (fmt && raw.resized) {
            const scales = {};
            files.forEach((f, i) => (scales[f] = L.footage.fillScale(infos[i].width, infos[i].height, fmt.w, fmt.h)));
            await host("pk_scaleClips", state.tracks.camera >= 0 ? state.tracks.camera : 0, JSON.stringify(scales));
          }
          return fmt && !raw.resized ? `“${raw.name}” (couldn't change the frame size — set it in Sequence Settings)` : `“${raw.name}”${fmt ? `, ${fmt.name}` : ""}`;
        }, { fatal: true });

        // Someone talking, or footage for a montage?
        let talking = false;
        const total = infos.reduce((s, i) => s + i.duration, 0);
        if (!opts.montage && PK.features().transcribe !== false && infos.some((i) => i.audio)) {
          await view.step("Listening", async () => {
            const t = await PK.transcribe();
            const wpm = t.words.length / Math.max(0.2, total / 60);
            talking = t.words.length >= 12 && wpm >= 40;
            return talking ? `someone's talking — ${plural(t.words.length, "word")}` : "mostly footage — making a montage";
          });
        }

        if (talking) {
          if (PK.features().ai === false) throw new Error("The AI editor isn't switched on on the server yet.");
          let data;
          await view.step("Planning the edit", async () => {
            data = await home.requestPlan(home.ask.value.trim(), (s) => PK.status(s, true));
            return `${data.cost} credits · ${data.balance.toLocaleString()} left`;
          }, { fatal: true });
          if (review.checked) { showedPlan = true; return home.showPlan(data); }
          const dup = await home.runPlan(view);
          view.finish(`Edited on “${dup.name}”. The untouched sequence “${raw.name}” is next to it in the PostKit bin.`);
          return;
        }
        const name = await montage(view, bin, infos, fmt, base);
        view.finish(`Your montage is “${name}”. The clips in order are in “${raw.name}”.`);
      });
      if (view.heading.textContent !== "Done" && !showedPlan) view.fail();
    }

    async function montage(view, bin, infos, fmt, base) {
      const clips = files.map((f, i) => ({ path: f, name: path.basename(f), duration: infos[i].duration, info: infos[i] }));
      await view.step("Looking at your footage", async () => {
        for (const c of clips) c.analysis = await L.footage.analyze(bin, c.path, c.info);
        const good = clips.reduce((s, c) => s + L.footage.goodSeconds(c.analysis), 0);
        return `${secs(good)} of usable footage`;
      }, { fatal: true });

      let beats = null, musicInfo = null;
      if (music) {
        await view.step("Finding the beat", async () => {
          musicInfo = await L.footage.probe(bin, music);
          beats = await L.beats.forClip(bin, { mediaPath: music, inPoint: 0, outPoint: musicInfo.duration, start: 0 }, { sensitivity: 1 });
          const bpm = bpmOf(beats);
          return bpm ? `${Math.round(bpm)} BPM` : "no clear beat — cutting to a steady rhythm";
        });
      }

      // How long: what you asked, never more than the good footage (or the music) allows.
      const good = clips.reduce((s, c) => s + L.footage.goodSeconds(c.analysis), 0);
      const cap = Math.max(5, good * 0.85);
      const musicCap = musicInfo ? musicInfo.duration : Infinity;
      let length;
      if (length_choice() === "auto") length = Math.min(cap, musicCap, fmt && fmt.h > fmt.w ? 40 : 90, Math.max(12, good * 0.6));
      else if (length_choice() === "full") length = Math.min(cap, musicCap);
      else length = Math.min(+length_choice(), cap, musicCap);
      length = Math.max(3, Math.round(length * 10) / 10);

      const taste = PK.ai.tasteForAI();
      let mp = { order: clips.map((_, i) => i), pace: taste.pace || "normal", accent: taste.accent || "#ffd60a", look: taste.color && L.looks.LOOKS[taste.color] ? taste.color : "punchy", transition: "flash", zoom_on_beat: (taste.pace || "normal") === "fast", title: null, ending: null };
      if (PK.features().ai !== false) {
        await view.step("Planning the montage", async () => {
          const withStills = [];
          for (let i = 0; i < clips.length && i < 24; i++) {
            const c = clips[i];
            let s = null;
            try { s = await still(bin, c.path, c.duration / 2); } catch (e) { s = null; }
            withStills.push({ i, name: c.name, duration: c.duration, still: s || undefined });
          }
          const T = window.PKTemplates;
          const titles = T.list().filter((t) => ["Titles", "Liquid glass", "Callouts", "Lower thirds"].includes(t.cat) && !t.overlay).map((t) => ({ id: t.id, name: t.name, fields: t.fields }));
          const data = await PK.api("/api/panel/ai/montage", {
            instruction: home.ask.value.trim(), taste, format: format.value, length,
            music: musicInfo ? { duration: musicInfo.duration, bpm: bpmOf(beats) } : null,
            clips: withStills,
            catalog: { titles, transitions: TRANSITIONS, looks: L.looks.list().map((l) => ({ id: l.id, name: l.name })), fonts: window.PKFonts.FAMILIES.map((f) => f.family) },
          });
          mp = clean(data.plan, mp, clips.length);
          return `${data.cost} credits · ${data.balance.toLocaleString()} left`;
        });
      }

      const order = mp.order.length ? mp.order : clips.map((_, i) => i);
      const slotLens = L.footage.slots(beats, { length, pace: mp.pace });
      const picks = L.footage.pickMoments(order.map((i) => clips[i]), slotLens);
      const W = fmt ? fmt.w : infos[0].width, H = fmt ? fmt.h : infos[0].height;
      const infoOf = (p) => clips.find((c) => c.path === p).info;
      const items = picks.map((p) => ({ path: p.path, srcIn: p.srcIn, srcOut: p.srcOut, at: p.at, scale: L.footage.fillScale(infoOf(p.path).width, infoOf(p.path).height, W, H) }));

      let seq;
      await view.step(`Cutting ${plural(items.length, "shot")} to the ${music ? "beat" : "rhythm"}`, async () => {
        seq = await host("pk_newSequence", `${base} — Montage`, JSON.stringify([files[order[0]]]), fmt ? fmt.w : 0, fmt ? fmt.h : 0, true);
        await host("pk_assemble", JSON.stringify(items), 0, 0, keep.checked);
        if (!keep.checked) await host("pk_mute", 0, true).catch(() => null);
        await PK.loadSequence();
        state.tracks.camera = 0;
        state.tracks.speech = 0;
        return `${secs(length)}, ${mp.pace} pace`;
      }, { fatal: true });

      if (music) {
        await view.step("Adding the music", async () => {
          const r = await host("pk_place", JSON.stringify([{ path: music, start: 0, dur: length, type: "audio", bin: "Music", from: 1, srcIn: 0, srcOut: length }]));
          const mt = r.placed[0].track;
          state.tracks.music = mt;
          await host("pk_volumeKeys", mt, JSON.stringify([{ time: Math.max(0, length - 1.5), db: 0 }, { time: Math.max(0.1, length - 0.04), db: -40 }]));
          return `on A${mt + 1}, fading out at the end`;
        });
      }

      const cuts = picks.slice(1).map((p) => p.at);
      if (mp.zoom_on_beat && cuts.length) {
        await view.step("Punch-ins on the beat", async () => {
          const moves = [];
          picks.forEach((p, i) => {
            if (i === 0 || i % 2) return;
            const keys = L.presets.plan("punch", { start: p.at, end: p.at + p.len }, { strength: "medium", fps: PK.fps() });
            const k = items[i].scale / 100; // keep the reframe: punch-ins are relative to it
            keys.scale = keys.scale.map((x) => ({ time: x.time, value: +(x.value * k).toFixed(2) }));
            moves.push({ time: p.at + 0.01, keys });
          });
          const r = await host("pk_keysAt", 0, JSON.stringify(moves));
          return plural(r.keys, "keyframe");
        });
      }

      if (mp.transition && mp.transition !== "none" && cuts.length > 1) {
        await view.step("Transitions", async () => {
          const every = mp.pace === "fast" ? 4 : mp.pace === "calm" ? 2 : 3;
          const at = cuts.filter((_, i) => i % every === every - 1);
          if (!at.length) return "none needed";
          const scene = window.PKTemplates.build(mp.transition, { accent: mp.accent });
          const r = await PK.renderScene(scene, { seqStart: at[0] - scene.duration / 2, label: "Transition", glass: false });
          const whoosh = PK.sfxById("whoosh");
          const placements = at.map((t) => ({ path: r.file, start: Math.max(0, t - r.duration / 2), dur: r.duration, type: "video", bin: "Graphics" }));
          if (whoosh) at.forEach((t) => placements.push({ path: whoosh.path, start: Math.max(0, t - 0.35), dur: whoosh.duration, type: "audio", gainDb: -12, from: 1 }));
          await host("pk_place", JSON.stringify(placements));
          return `${plural(at.length, "transition")} with whooshes`;
        });
      }

      if (mp.title && window.PKTemplates.get(mp.title.template)) {
        const t = window.PKTemplates.get(mp.title.template);
        await view.step(`Opening title: ${t.name}`, async () => {
          const scene = window.PKTemplates.build(t.id, { ...(mp.title.fields || {}), accent: mp.accent, y: 0.4 });
          if (mp.font) applyFont(scene.layers, mp.font);
          await PK.addGraphic(scene, { start: 0.25, label: t.name, onProgress: (p) => PK.status(`Rendering the title… ${Math.round(p * 100)}%`, true) });
          const sw = PK.sfxById("swoosh");
          if (sw) await host("pk_place", JSON.stringify([{ path: sw.path, start: 0.2, dur: sw.duration, type: "audio", gainDb: -10, from: 1 }]));
          return Object.values(mp.title.fields || {}).join(" · ");
        });
      }

      if (mp.ending && window.PKTemplates.get(mp.ending.template)) {
        const t = window.PKTemplates.get(mp.ending.template);
        await view.step(`Ending: ${t.name}`, async () => {
          const scene = window.PKTemplates.build(t.id, { ...(mp.ending.fields || {}), accent: mp.accent, dur: Math.min(3, length / 3) });
          if (mp.font) applyFont(scene.layers, mp.font);
          await PK.addGraphic(scene, { start: Math.max(0, length - scene.duration - 0.1), label: t.name });
          return Object.values(mp.ending.fields || {}).join(" · ");
        });
      }

      if (mp.look && L.looks.LOOKS[mp.look]) {
        await view.step(`Colour: ${L.looks.LOOKS[mp.look].name}`, async () => {
          const r = await host("pk_look", JSON.stringify(PK.looks.lookValues(mp.look, 1)), 0);
          return plural(r.clips, "clip");
        });
      }
      return seq.name;
    }
    const length_choice = () => lengthSel.value;

    /** A sequence with footage and no talking: make a montage from its source files. */
    PK.autoedit.montageCurrent = async () => {
      const info = state.info;
      const clips = (await host("pk_clips", "video", state.tracks.camera >= 0 ? state.tracks.camera : 0)).clips;
      const src = [...new Set(clips.map((c) => c.mediaPath))];
      if (!src.length) throw new Error("This sequence has no video to work with.");
      await run({ files: src, montage: true, frame: info && info.width ? { w: info.width, h: info.height, name: `${info.width}×${info.height}` } : null });
    };
  }

  function applyFont(layers, font) {
    for (const l of layers) {
      if (l.type === "text" && !/Emoji/.test(l.font || "")) l.font = font;
      if (l.layers) applyFont(l.layers, font);
    }
  }

  /** Keeps only sensible values from the AI's montage plan. */
  function clean(p, fallback, n) {
    const out = { ...fallback };
    if (!p || typeof p !== "object") return out;
    if (Array.isArray(p.order)) {
      const seen = new Set();
      out.order = p.order.map((x) => Math.round(+x)).filter((x) => x >= 0 && x < n && !seen.has(x) && seen.add(x));
      if (!out.order.length) out.order = fallback.order;
    }
    if (["calm", "normal", "fast"].includes(p.pace)) out.pace = p.pace;
    if (/^#[0-9a-f]{6}$/i.test(p.accent || "")) out.accent = p.accent;
    if (p.font && window.PKFonts.FAMILIES.some((f) => f.family === p.font)) out.font = p.font;
    if (L.looks.LOOKS[p.look]) out.look = p.look;
    if (p.transition === "none" || TRANSITIONS.includes(p.transition)) out.transition = p.transition;
    if (typeof p.zoom_on_beat === "boolean") out.zoom_on_beat = p.zoom_on_beat;
    const g = (x) => (x && window.PKTemplates.get(x.template) ? { template: x.template, fields: Object.fromEntries(Object.entries(x.fields || {}).map(([k, v]) => [k, String(v).slice(0, 80)])) } : null);
    out.title = g(p.title);
    out.ending = g(p.ending);
    return out;
  }

  PK.on("ai:home", mount);
  PK.autoedit = Object.assign(PK.autoedit || {}, { bpmOf, clean });
})();
