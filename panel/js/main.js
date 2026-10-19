/* PostKit panel — UI and flows. Runs in Premiere's CEP browser with Node enabled. */
(function () {
  "use strict";

  // ── environment ──────────────────────────────────────────
  const cep = window.__adobe_cep__;
  const nodeRequire = (window.cep_node && window.cep_node.require) || window.require;
  const path = nodeRequire("path");
  const fs = nodeRequire("fs");
  const os = nodeRequire("os");

  function extensionRoot() {
    if (cep && cep.getSystemPath) {
      let p = decodeURI(cep.getSystemPath("extension"));
      p = p.replace(/^file:\/{2,3}/, process.platform === "win32" ? "" : "/");
      return p;
    }
    return path.resolve(__dirname, "..");
  }
  const ROOT = extensionRoot();
  const lib = (name) => nodeRequire(path.join(ROOT, "js", "lib", name));
  const licence = lib("licence.js");
  const ffmpeg = lib("ffmpeg.js");
  const silence = lib("silence.js");
  const audio = lib("audio.js");
  const captions = lib("captions.js");
  const zoom = lib("zoom.js");
  const beats = lib("beats.js");
  const chapters = lib("chapters.js");
  const presets = lib("presets.js");
  const cleanup = lib("cleanup.js");
  const library = lib("library.js");
  const safezones = lib("safezones.js");
  const config = lib("config.js");

  /** Calls a host.jsx function and parses its JSON reply. */
  function host(fn, ...args) {
    const call = `${fn}(${args.map((a) => JSON.stringify(a)).join(",")})`;
    return new Promise((resolve, reject) => {
      if (!cep) return reject(new Error("Open PostKit from Premiere Pro (Window → Extensions → PostKit)."));
      cep.evalScript(call, (raw) => {
        let res;
        try {
          res = JSON.parse(raw);
        } catch {
          return reject(new Error(raw === "EvalScript error." ? "Premiere couldn't run that step." : String(raw)));
        }
        res.ok ? resolve(res) : reject(new Error(res.error));
      });
    });
  }

  // ── tool catalogue (same order as the panel list) ────────
  const TOOLS = [
    { id: "cut", name: "Smart cut", note: "Remove pauses, close the gaps" },
    { id: "captions", name: "Transcription & captions", note: "Word-timed, Arabic and English" },
    { id: "zoom", name: "Auto zoom", note: "Framing changes with each sentence" },
    { id: "search", name: "Search & markers", note: "Find a word, chapters, beats" },
    { id: "presets", name: "Motion presets", note: "11 moves as real keyframes" },
    { id: "library", name: "Your library", note: "Your own SFX, transitions, overlays" },
    { id: "safe", name: "Safe zones", note: "TikTok, Reels and Shorts UI" },
    { id: "cleanup", name: "Project cleanup", note: "File everything into bins" },
    { id: "ai", name: "AI editor", soon: true },
    { id: "sfx", name: "Sound effects", soon: true },
    { id: "autosfx", name: "Automatic SFX", soon: true },
    { id: "broll", name: "B-roll library", soon: true },
    { id: "voice", name: "Studio voice", soon: true },
    { id: "titles", name: "Animated titles", soon: true },
    { id: "gallery", name: "Motion gallery", soon: true },
    { id: "multicam", name: "Multicam", soon: true },
    { id: "curves", name: "Curve editor", soon: true },
    { id: "tracking", name: "Tracking", soon: true },
  ];

  // ── state & ui helpers ───────────────────────────────────
  const $ = (id) => document.getElementById(id);
  const state = { session: null, info: null, cutPlan: null, transcript: null, chapters: null, library: [], libCat: "", platform: "tiktok" };

  function show(view) {
    ["signin", "home", "tool", "account"].forEach((v) => ($("view-" + v).hidden = v !== view));
    $("account-btn").hidden = view === "signin" || view === "account";
    $("home-btn").hidden = view !== "tool";
  }
  function status(text, busy) {
    const el = $("status");
    el.textContent = text || "";
    el.classList.toggle("busy", !!busy);
  }
  function result(id, text, kind) {
    const el = $(id);
    el.textContent = text || "";
    el.className = "result" + (kind ? " " + kind : "");
  }
  function secs(n) {
    return n < 60 ? `${n.toFixed(1)} s` : `${Math.floor(n / 60)} min ${Math.round(n % 60)} s`;
  }
  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

  /** Runs a task with its buttons disabled and errors shown in place. */
  async function run(resultId, label, fn, buttons = []) {
    buttons.forEach((b) => ($(b).disabled = true));
    status(label, true);
    result(resultId, "");
    try {
      await requireLicence();
      await fn();
    } catch (err) {
      result(resultId, err.message || String(err), "err");
    } finally {
      status("");
      buttons.forEach((b) => ($(b).disabled = false));
      $("cut").disabled = !state.cutPlan || !state.cutPlan.length;
      $("add-captions").disabled = !state.transcript;
      $("chapters-mark").disabled = !state.chapters;
      $("clean-apply").disabled = !state.cleanPlan || !state.cleanPlan.length;
    }
  }

  function dataFile(name) {
    const base = process.platform === "win32" ? process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming") : path.join(os.homedir(), "Library", "Application Support");
    const dir = path.join(base, "PostKit");
    fs.mkdirSync(dir, { recursive: true });
    return path.join(dir, name);
  }
  function readJson(name, fallback) {
    try {
      return JSON.parse(fs.readFileSync(dataFile(name), "utf8"));
    } catch {
      return fallback;
    }
  }
  const writeJson = (name, value) => fs.writeFileSync(dataFile(name), JSON.stringify(value, null, 2));

  // ── licence ──────────────────────────────────────────────
  async function requireLicence() {
    const s = await licence.current();
    if (!s) {
      show("signin");
      throw new Error("Please sign in again.");
    }
    state.session = s;
    return s;
  }

  $("form-email").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("email").value.trim();
    status("Sending your code…", true);
    try {
      await licence.requestCode(email);
      $("code-sent").textContent = `We sent a code to ${email}.`;
      $("form-email").hidden = true;
      $("form-code").hidden = false;
      $("code").value = "";
      $("code").focus();
      status("");
    } catch (err) {
      status(err.message);
    }
  });

  $("form-code").addEventListener("submit", async (e) => {
    e.preventDefault();
    status("Signing in…", true);
    try {
      state.session = await licence.signIn($("email").value.trim(), $("code").value.replace(/\D/g, ""));
      status("");
      await openHome();
    } catch (err) {
      status(err.message);
    }
  });

  $("change-email").addEventListener("click", () => {
    $("form-code").hidden = true;
    $("form-email").hidden = false;
  });

  let returnTo = "home";
  $("account-btn").addEventListener("click", () => {
    returnTo = $("view-tool").hidden ? "home" : "tool";
    $("acc-email").textContent = state.session ? state.session.email : "";
    $("acc-until").textContent = state.session && state.session.planExpires ? new Date(state.session.planExpires).toLocaleDateString() : "";
    show("account");
  });
  $("back").addEventListener("click", () => show(returnTo));
  $("sign-out").addEventListener("click", () => {
    licence.signOut();
    state.session = null;
    $("form-code").hidden = true;
    $("form-email").hidden = false;
    show("signin");
  });

  // ── home & navigation ────────────────────────────────────
  function renderTools() {
    const ul = $("tool-list");
    ul.innerHTML = "";
    for (const t of TOOLS) {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.className = "tool-row";
      btn.disabled = !!t.soon;
      btn.innerHTML = `<span class="tool-name"></span><span class="tool-note"></span>`;
      btn.querySelector(".tool-name").textContent = t.name;
      btn.querySelector(".tool-note").textContent = t.soon ? "Coming soon" : t.note;
      if (!t.soon) btn.addEventListener("click", () => openTool(t.id));
      li.append(btn);
      ul.append(li);
    }
  }

  function openTool(id) {
    const tool = TOOLS.find((t) => t.id === id);
    $("tool-title").textContent = tool.name;
    let needs = [];
    document.querySelectorAll(".tool").forEach((el) => {
      const on = el.dataset.tool === id;
      el.hidden = !on;
      if (on) needs = (el.dataset.needs || "").split(" ").filter(Boolean);
    });
    document.querySelectorAll("[data-pick]").forEach((el) => (el.hidden = !needs.includes(el.dataset.pick)));
    $("source").hidden = !needs.length;
    show("tool");
    if (id === "library") renderLibrary();
  }
  $("home-btn").addEventListener("click", () => show("home"));

  // ── sequence ─────────────────────────────────────────────
  function fillTracks(select, tracks, prefix, allowNone, preferIndex) {
    const prev = select.value;
    select.innerHTML = "";
    if (allowNone) select.add(new Option("None", "-1"));
    tracks.forEach((t) => select.add(new Option(`${prefix}${t.index + 1}${t.clips ? "" : " (empty)"}`, String(t.index))));
    const withClips = tracks.filter((t) => t.clips);
    const pick = preferIndex !== undefined && withClips[preferIndex] ? withClips[preferIndex] : withClips[0];
    select.value = [...select.options].some((o) => o.value === prev) ? prev : String(pick ? pick.index : allowNone ? -1 : 0);
  }

  async function loadSequence() {
    try {
      const info = await host("pk_info");
      state.info = info;
      $("seq-name").textContent = info.name;
      fillTracks($("a-track"), info.tracks.audio, "A", false);
      fillTracks($("v-track"), info.tracks.video, "V", true);
      fillTracks($("m-track"), info.tracks.audio, "A", true, 1); // music: usually the second audio track
      fillTracks($("lib-a"), info.tracks.audio, "A", false);
      fillTracks($("lib-v"), info.tracks.video, "V", false);
    } catch (err) {
      state.info = null;
      $("seq-name").textContent = err.message;
    }
  }
  $("refresh").addEventListener("click", loadSequence);

  const aIndex = () => parseInt($("a-track").value, 10);
  const vIndex = () => parseInt($("v-track").value, 10);
  const mIndex = () => parseInt($("m-track").value, 10);
  const fps = () => (state.info && state.info.fps) || 30;

  function ffmpegBin() {
    const bin = ffmpeg.find(ROOT);
    if (!bin) throw new Error("ffmpeg wasn't found. Reinstall PostKit to restore it.");
    return bin;
  }

  async function clipsOn(type, index, what) {
    if (!state.info) await loadSequence();
    if (!state.info) throw new Error("Open a sequence in Premiere first.");
    if (index < 0) throw new Error(`Pick the ${what} track.`);
    const { clips } = await host("pk_clips", type, index);
    if (!clips.length) throw new Error(`The ${what} track has no clips.`);
    return clips;
  }

  // ── smart cut ────────────────────────────────────────────
  const cutSettings = () => ({ thresholdDb: +$("thr").value, minSilence: +$("min").value, padding: +$("pad").value });
  [["thr", "thr-out", (v) => `${v} dB`], ["min", "min-out", (v) => `${(+v).toFixed(2)} s`], ["pad", "pad-out", (v) => `${(+v).toFixed(2)} s`]].forEach(
    ([input, out, fmt]) =>
      $(input).addEventListener("input", () => {
        $(out).textContent = fmt($(input).value);
        state.cutPlan = null;
        $("cut").disabled = true;
      }),
  );

  $("find").addEventListener("click", () =>
    run("cut-result", "Listening for pauses…", async () => {
      const clips = await clipsOn("audio", aIndex(), "speech");
      const bin = ffmpegBin();
      const s = cutSettings();
      let found = [];
      for (let i = 0; i < clips.length; i++) {
        status(`Listening for pauses… clip ${i + 1} of ${clips.length}`, true);
        found = found.concat(await silence.detectInClip(bin, clips[i], s));
      }
      state.cutPlan = silence.planCuts(found, { padding: s.padding, minSilence: s.minSilence, fps: fps() });
      const total = silence.totalSeconds(state.cutPlan);
      result("cut-result", state.cutPlan.length ? `Found ${plural(state.cutPlan.length, "pause")} — ${secs(total)} to remove.` : "No pauses found with these settings. Try a higher silence level.", state.cutPlan.length ? "ok" : "");
    }, ["find", "cut"]),
  );

  $("cut").addEventListener("click", () =>
    run("cut-result", "Cutting…", async () => {
      if (!state.cutPlan || !state.cutPlan.length) throw new Error("Find pauses first.");
      const dup = await host("pk_duplicate", "PostKit cut");
      const res = await host("pk_cut", JSON.stringify(state.cutPlan), aIndex(), vIndex());
      state.cutPlan = null;
      state.transcript = null; // timing changed
      await loadSequence();
      let msg = `Removed ${secs(res.removedSeconds)} in ${plural(res.cuts, "cut")} on “${dup.name}”. Your original sequence is untouched.`;
      if (res.skipped) msg += ` ${plural(res.skipped, "pause")} skipped where the camera track had a gap.`;
      result("cut-result", msg, "ok");
    }, ["find", "cut"]),
  );

  // ── transcription & captions ─────────────────────────────
  function renderTranscript(t) {
    const el = $("transcript");
    el.innerHTML = "";
    t.segments.forEach((s) => {
      const time = document.createElement("span");
      time.textContent = chapters.stamp(s.start);
      el.append(time, document.createTextNode(s.text + "\n"));
    });
    el.hidden = !t.segments.length;
  }

  async function transcribe() {
    const clips = await clipsOn("audio", aIndex(), "speech");
    status("Preparing the audio…", true);
    const { file, map, dir } = await audio.extractSpeech(ffmpegBin(), clips);
    try {
      const bytes = fs.readFileSync(file);
      if (bytes.length > 4 * 1024 * 1024) throw new Error("This sequence is too long to transcribe in one go. Try a section of up to about 20 minutes.");
      status("Transcribing…", true);
      const form = new FormData();
      form.append("file", new Blob([bytes], { type: "audio/ogg" }), "speech.ogg");
      form.append("language", $("lang").value);
      const res = await fetch(config.apiBase + "/api/panel/transcribe", { method: "POST", headers: { Authorization: "Bearer " + state.session.token }, body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Transcription failed. Try again.");
      const toSeq = (t) => audio.toSequenceTime(map, t);
      state.transcript = {
        language: data.language,
        words: data.words.map((w) => ({ word: w.word, start: toSeq(w.start), end: toSeq(w.end) })),
        segments: data.segments.map((s) => ({ text: s.text, start: toSeq(s.start), end: toSeq(s.end) })),
      };
      state.chapters = null;
      renderTranscript(state.transcript);
      return state.transcript;
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  async function needTranscript() {
    return state.transcript || transcribe();
  }

  $("transcribe").addEventListener("click", () =>
    run("cap-result", "Preparing the audio…", async () => {
      const t = await transcribe();
      result("cap-result", `Transcribed ${plural(t.words.length, "word")}. Check the text, then add captions.`, "ok");
    }, ["transcribe", "add-captions"]),
  );

  $("add-captions").addEventListener("click", () =>
    run("cap-result", "Adding captions…", async () => {
      if (!state.transcript) throw new Error("Transcribe first.");
      const caps = captions.group(state.transcript.words, { maxWords: +$("wpc").value });
      const dir = path.join(os.homedir(), "Documents", "PostKit", "Captions");
      fs.mkdirSync(dir, { recursive: true });
      const safe = (state.info ? state.info.name : "sequence").replace(/[^\w\- ]+/g, "").trim() || "sequence";
      const file = path.join(dir, `${safe} ${new Date().toISOString().replace(/[:.]/g, "-")}.srt`);
      fs.writeFileSync(file, "﻿" + captions.toSrt(caps), "utf8");
      const res = await host("pk_captions", file);
      result("cap-result", res.placed ? `Added ${plural(caps.length, "caption")} on a new caption track. Style them from the Text panel.` : res.message, "ok");
    }, ["transcribe", "add-captions"]),
  );

  // ── auto zoom ────────────────────────────────────────────
  $("zamt").addEventListener("input", () => ($("zamt-out").textContent = `${$("zamt").value}%`));

  $("zoom").addEventListener("click", () =>
    run("zoom-result", "Reading the sentences…", async () => {
      if (vIndex() < 0) throw new Error("Pick the camera track to zoom.");
      const t = await needTranscript();
      status("Adding zoom keyframes…", true);
      const keys = zoom.plan(t.segments, { style: $("zstyle").value, amount: +$("zamt").value, fps: fps() });
      if (!keys.length) throw new Error("No sentences long enough to zoom on.");
      const res = await host("pk_zoom", JSON.stringify(keys), vIndex());
      result("zoom-result", `Added ${plural(res.keys, "keyframe")} on ${plural(res.clips, "clip")}. Undo or “Remove zoom” to take them off.`, "ok");
    }, ["zoom", "zoom-clear"]),
  );

  $("zoom-clear").addEventListener("click", () =>
    run("zoom-result", "Removing zoom…", async () => {
      if (vIndex() < 0) throw new Error("Pick the camera track.");
      await host("pk_zoomClear", vIndex());
      result("zoom-result", "Zoom removed. Scale is back to 100%.", "ok");
    }, ["zoom", "zoom-clear"]),
  );

  // ── search & markers ─────────────────────────────────────
  $("search-form").addEventListener("submit", (e) => {
    e.preventDefault();
    run("search-result", "Searching…", async () => {
      const t = await needTranscript();
      const hits = chapters.search(t.words, $("search-q").value);
      const ul = $("search-hits");
      ul.innerHTML = "";
      hits.slice(0, 50).forEach((h) => {
        const li = document.createElement("li");
        const b = document.createElement("button");
        b.className = "hit";
        b.innerHTML = `<span class="hit-time"></span><span class="hit-text" dir="auto"></span>`;
        b.querySelector(".hit-time").textContent = chapters.stamp(h.time);
        b.querySelector(".hit-text").textContent = h.text;
        b.addEventListener("click", () => host("pk_seek", h.time).catch((err) => result("search-result", err.message, "err")));
        li.append(b);
        ul.append(li);
      });
      result("search-result", hits.length ? `${plural(hits.length, "match")}. Click one to jump there.` : "Not said in this sequence.", hits.length ? "ok" : "");
    });
  });

  $("chapters").addEventListener("click", () =>
    run("search-result", "Reading the transcript…", async () => {
      const t = await needTranscript();
      state.chapters = chapters.chapters(t.segments);
      if (state.chapters.length < 3) {
        state.chapters = null;
        throw new Error("This video is too short for chapters. YouTube needs at least three, each 10 seconds or longer.");
      }
      const box = $("chapters-text");
      box.value = chapters.toYouTube(state.chapters);
      box.hidden = false;
      box.select();
      result("search-result", `${plural(state.chapters.length, "chapter")}. Copy them into your YouTube description, and edit the titles.`, "ok");
    }, ["chapters"]),
  );

  $("chapters-mark").addEventListener("click", () =>
    run("search-result", "Adding markers…", async () => {
      if (!state.chapters) throw new Error("Make chapters first.");
      const res = await host("pk_markers", JSON.stringify(state.chapters.map((c) => ({ time: c.time, name: c.title, color: 1 }))));
      result("search-result", `Added ${plural(res.added, "chapter marker")}.`, "ok");
    }, ["chapters-mark"]),
  );

  $("beats").addEventListener("click", () =>
    run("search-result", "Listening for the beat…", async () => {
      const clips = await clipsOn("audio", mIndex(), "music");
      const bin = ffmpegBin();
      let times = [];
      for (const c of clips) times = times.concat(await beats.forClip(bin, c, { sensitivity: +$("beat-sens").value }));
      if (!times.length) throw new Error("No clear beats found. Try “Every hit”.");
      const res = await host("pk_markers", JSON.stringify(times.map((t) => ({ time: t, color: 4 }))));
      result("search-result", `Added ${plural(res.added, "beat marker")}. Snap cuts to them with S (snapping) on.`, "ok");
    }, ["beats"]),
  );

  // ── motion presets ───────────────────────────────────────
  (function renderPresets() {
    const grid = $("preset-grid");
    presets.list().forEach((p) => {
      const b = document.createElement("button");
      b.className = "secondary";
      b.textContent = p.name;
      b.addEventListener("click", () =>
        run("preset-result", `Adding “${p.name}”…`, async () => {
          const { clips } = await host("pk_selectedClips");
          if (!clips.length) throw new Error("Select one or more clips on the timeline first.");
          const strength = document.querySelector('input[name="strength"]:checked').value;
          const plans = clips.map((c) => presets.plan(p.id, c, { strength, fps: fps() }));
          const res = await host("pk_applyKeys", JSON.stringify(plans));
          result("preset-result", `“${p.name}” added to ${plural(res.clips, "clip")}. Undo with Cmd/Ctrl+Z.`, "ok");
        }),
      );
      grid.append(b);
    });
  })();

  // ── your library ─────────────────────────────────────────
  const libFolders = () => readJson("library.json", { folders: [] }).folders;

  function scanLibrary() {
    state.library = library.scan(libFolders());
  }

  function renderLibrary() {
    const folders = libFolders();
    $("lib-folders").textContent = folders.length ? folders.map((f) => path.basename(f)).join(" · ") : "Add the folders where you keep your sound effects, transitions and overlays.";
    if (!state.library.length && folders.length) scanLibrary();
    const cats = [...new Set(state.library.map((i) => i.category))];
    const chips = $("lib-cats");
    chips.innerHTML = "";
    ["", ...cats].forEach((c) => {
      const b = document.createElement("button");
      b.className = "chip";
      b.setAttribute("aria-pressed", String(state.libCat === c));
      b.textContent = c || "All";
      b.addEventListener("click", () => {
        state.libCat = c;
        renderLibrary();
      });
      chips.append(b);
    });
    const items = library.filter(state.library, { query: $("lib-q").value, category: state.libCat }).slice(0, 200);
    const ul = $("lib-list");
    ul.innerHTML = "";
    items.forEach((it) => {
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.className = "lib-row";
      b.title = "Add at the playhead";
      b.innerHTML = `<span class="lib-name"></span><span class="lib-cat"></span>`;
      b.querySelector(".lib-name").textContent = it.name;
      b.querySelector(".lib-cat").textContent = it.category;
      let audioEl = null;
      b.addEventListener("mouseenter", () => {
        if (it.type !== "audio") return;
        audioEl = new Audio("file://" + it.path.replace(/\\/g, "/"));
        audioEl.volume = 0.6;
        audioEl.play().catch(() => {});
      });
      b.addEventListener("mouseleave", () => audioEl && audioEl.pause());
      b.addEventListener("click", () =>
        run("lib-result", "Adding…", async () => {
          const toAudio = it.type === "audio";
          const res = await host("pk_insertFile", it.path, toAudio ? "audio" : "video", parseInt($(toAudio ? "lib-a" : "lib-v").value, 10));
          result("lib-result", `Added “${res.name}” at ${chapters.stamp(res.at)}.`, "ok");
        }),
      );
      li.append(b);
      ul.append(li);
    });
    if (!items.length && folders.length) ul.innerHTML = '<li class="muted">Nothing matches.</li>';
  }

  $("lib-q").addEventListener("input", renderLibrary);
  $("lib-rescan").addEventListener("click", () => {
    scanLibrary();
    renderLibrary();
    result("lib-result", `${plural(state.library.length, "item")} in your library.`, "ok");
  });
  $("lib-add").addEventListener("click", () => {
    const pick = window.cep && window.cep.fs && window.cep.fs.showOpenDialogEx ? window.cep.fs.showOpenDialogEx(false, true, "Choose a library folder") : null;
    const folder = pick && pick.data && pick.data[0];
    if (!folder) return;
    const data = readJson("library.json", { folders: [] });
    if (!data.folders.includes(folder)) data.folders.push(folder);
    writeJson("library.json", data);
    scanLibrary();
    renderLibrary();
    result("lib-result", `${plural(state.library.length, "item")} in your library.`, "ok");
  });

  // ── safe zones ───────────────────────────────────────────
  (function renderPlatforms() {
    const box = $("safe-platforms");
    safezones.platforms().forEach((p, i) => {
      const l = document.createElement("label");
      l.innerHTML = `<input type="radio" name="platform" value="${p.id}"${i === 0 ? " checked" : ""} /> `;
      l.append(p.name);
      l.querySelector("input").addEventListener("change", () => {
        state.platform = p.id;
        if (state.frame) drawSafe();
      });
      box.append(l);
    });
  })();

  function drawSafe() {
    const img = state.frame;
    const canvas = $("safe-canvas");
    const w = img.naturalWidth, h = img.naturalHeight;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const areas = safezones.forFrame(state.platform, w, h);
    // The canvas is shown at panel width, so size labels for that, not for the full frame.
    const shownWidth = Math.min(canvas.parentElement.clientWidth || 300, w);
    const fontPx = Math.round((12 * w) / shownWidth);
    ctx.font = `600 ${fontPx}px system-ui, sans-serif`;
    for (const a of areas) {
      ctx.fillStyle = "rgba(234, 90, 60, 0.38)";
      ctx.fillRect(a.x, a.y, a.w, a.h);
      ctx.strokeStyle = "rgba(255, 140, 110, 0.9)";
      ctx.lineWidth = Math.max(2, w / 400);
      ctx.strokeRect(a.x, a.y, a.w, a.h);
      if (ctx.measureText(a.label).width < a.w - fontPx) {
        ctx.fillStyle = "#fff";
        ctx.fillText(a.label, a.x + fontPx / 2, a.y + fontPx * 1.3);
      }
    }
    canvas.hidden = false;
  }

  $("safe-check").addEventListener("click", () =>
    run("safe-result", "Grabbing the frame…", async () => {
      const out = path.join(os.tmpdir(), `postkit-frame-${Date.now()}.png`);
      const res = await host("pk_exportFrame", out);
      const img = new Image();
      await new Promise((ok, bad) => {
        img.onload = ok;
        img.onerror = () => bad(new Error("Premiere didn't export the frame. Move the playhead onto a clip and try again."));
        img.src = "file://" + res.path.replace(/\\/g, "/") + "?" + Date.now();
      });
      state.frame = img;
      drawSafe();
      result("safe-result", "Keep text and faces out of the red areas.", "ok");
    }, ["safe-check"]),
  );

  // ── project cleanup ──────────────────────────────────────
  $("clean-scan").addEventListener("click", () =>
    run("clean-result", "Reading the project…", async () => {
      const { items } = await host("pk_projectItems");
      state.cleanPlan = cleanup.plan(items);
      const ul = $("clean-plan");
      ul.innerHTML = "";
      cleanup.summary(state.cleanPlan).forEach((line) => {
        const li = document.createElement("li");
        li.textContent = line;
        ul.append(li);
      });
      result("clean-result", state.cleanPlan.length ? `${plural(state.cleanPlan.length, "item")} to file.` : "Already tidy — nothing loose in the project.", "ok");
    }, ["clean-scan", "clean-apply"]),
  );

  $("clean-apply").addEventListener("click", () =>
    run("clean-result", "Tidying…", async () => {
      if (!state.cleanPlan || !state.cleanPlan.length) throw new Error("Show the plan first.");
      const res = await host("pk_cleanup", JSON.stringify(state.cleanPlan));
      state.cleanPlan = null;
      $("clean-plan").innerHTML = "";
      result("clean-result", `Filed ${plural(res.moved, "item")} into bins.`, "ok");
    }, ["clean-scan", "clean-apply"]),
  );

  // Segmented controls: mark the chosen option (no :has() in Premiere 2022's browser).
  function syncSegmented() {
    document.querySelectorAll(".segmented label").forEach((l) => l.classList.toggle("on", l.querySelector("input").checked));
  }
  document.addEventListener("change", (e) => e.target.closest && e.target.closest(".segmented") && syncSegmented());
  document.addEventListener("focusin", (e) => e.target.closest && e.target.closest(".segmented label") && e.target.closest("label").classList.add("focus"));
  document.addEventListener("focusout", (e) => e.target.closest && e.target.closest(".segmented label") && e.target.closest("label").classList.remove("focus"));
  syncSegmented();

  // ── start ────────────────────────────────────────────────
  async function openHome() {
    show("home");
    await loadSequence();
  }

  renderTools();
  (async function start() {
    status("Checking your licence…", true);
    try {
      state.session = await licence.current();
    } catch (err) {
      status(err.message);
    }
    status("");
    if (state.session) await openHome();
    else show("signin");
  })();
})();
