/* PostKit panel — shared core: Premiere bridge, state, sequence, files, server calls,
 * transcription and the graphics renderer. Every tool and the AI editor build on this. */
(function () {
  "use strict";

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
  function fileUrl(p) {
    let s = String(p).replace(/\\/g, "/");
    if (!s.startsWith("/")) s = "/" + s; // C:/… → /C:/…
    return "file://" + encodeURI(s).replace(/#/g, "%23").replace(/\?/g, "%3F");
  }

  const L = {
    licence: lib("licence.js"), ffmpeg: lib("ffmpeg.js"), silence: lib("silence.js"), audio: lib("audio.js"),
    captions: lib("captions.js"), zoom: lib("zoom.js"), beats: lib("beats.js"), chapters: lib("chapters.js"),
    presets: lib("presets.js"), cleanup: lib("cleanup.js"), library: lib("library.js"), safezones: lib("safezones.js"),
    config: lib("config.js"), render: lib("render.js"), voice: lib("voice.js"), looks: lib("looks.js"),
    motion: lib("motion.js"), edl: lib("edl.js"), footage: lib("footage.js"),
  };

  // ── Premiere bridge ──────────────────────────────────────
  /** Calls a host.jsx function and parses its JSON reply. */
  function host(fn, ...args) {
    const call = `${fn}(${args.map((a) => JSON.stringify(a === undefined ? null : a)).join(",")})`;
    return new Promise((resolve, reject) => {
      if (!cep) return reject(new Error("Open PostKit from Premiere Pro (Window → Extensions → PostKit)."));
      cep.evalScript(call, (raw) => {
        let res;
        try {
          res = JSON.parse(raw);
        } catch (e) {
          return reject(new Error(raw === "EvalScript error." ? "Premiere couldn't run that step." : String(raw)));
        }
        res.ok ? resolve(res) : reject(new Error(res.error));
      });
    });
  }

  // ── state ────────────────────────────────────────────────
  const state = {
    session: null, info: null, transcript: null, transcriptSeq: null,
    tracks: { speech: 0, camera: 0, music: -1 },
    frame: null, // { img, path, time } — the frame under the playhead, for previews
  };

  // ── small helpers ────────────────────────────────────────
  const $ = (id) => document.getElementById(id);
  const plural = (n, word, many) => `${n} ${n === 1 ? word : many || word + "s"}`;
  function secs(n) {
    return n < 60 ? `${n.toFixed(1)} s` : `${Math.floor(n / 60)} min ${Math.round(n % 60)} s`;
  }
  const stamp = () => new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const safeName = (s) => String(s || "PostKit").replace(/[^\w\- ]+/g, "").trim().slice(0, 40) || "PostKit";

  function status(text, busy) {
    const el = $("status");
    if (!el) return;
    el.textContent = text || "";
    el.classList.toggle("busy", !!busy);
  }
  function result(el, text, kind) {
    if (typeof el === "string") el = $(el);
    if (!el) return;
    el.textContent = text || "";
    el.className = "result" + (kind ? " " + kind : "");
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
    } catch (e) {
      return fallback;
    }
  }
  const writeJson = (name, value) => fs.writeFileSync(dataFile(name), JSON.stringify(value, null, 2));

  /** A folder in Documents/PostKit for files PostKit makes. */
  function outDir(kind) {
    const dir = path.join(os.homedir(), "Documents", "PostKit", kind);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  // ── licence ──────────────────────────────────────────────
  async function requireLicence() {
    const s = await L.licence.current();
    if (!s) {
      PK.emit("signedout");
      throw new Error("Please sign in again.");
    }
    state.session = s;
    PK.emit("session", s);
    return s;
  }

  /** Runs a task with buttons disabled and errors shown in place. */
  async function run(resultEl, label, fn, buttons = []) {
    const els = buttons.map((b) => (typeof b === "string" ? $(b) : b)).filter(Boolean);
    els.forEach((b) => (b.disabled = true));
    status(label, true);
    if (resultEl) result(resultEl, "");
    try {
      await requireLicence();
      return await fn();
    } catch (err) {
      if (resultEl) result(resultEl, err.message || String(err), "err");
      else status(err.message || String(err));
      return undefined;
    } finally {
      if (document.getElementById("status").classList.contains("busy")) status("");
      els.forEach((b) => (b.disabled = false));
      PK.emit("idle");
    }
  }

  // ── server ───────────────────────────────────────────────
  async function api(pathname, body, { raw = false } = {}) {
    const res = await fetch(L.config.apiBase + pathname, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + state.session.token },
      body: JSON.stringify(body || {}),
    });
    if (raw && res.ok) return res;
    const data = await res.json().catch(() => ({}));
    if (data && typeof data.balance === "number") setCredits(data.balance);
    if (!res.ok) {
      const err = new Error(data.message || `The server said no (${res.status}).`);
      err.code = data.error;
      err.data = data;
      throw err;
    }
    return data;
  }
  function setCredits(n) {
    if (!state.session) return;
    state.session.credits = n;
    PK.emit("credits", n);
  }
  const features = () => (state.session && state.session.features) || {};

  // ── sequence ─────────────────────────────────────────────
  async function loadSequence() {
    try {
      const info = await host("pk_info");
      const changed = !state.info || state.info.id !== info.id;
      state.info = info;
      if (changed) {
        state.frame = null;
        if (state.transcriptSeq !== info.id) state.transcript = null;
        // Sensible track defaults: first audio with clips, first video with clips, a second audio track for music.
        const a = info.tracks.audio.filter((t) => t.clips), v = info.tracks.video.filter((t) => t.clips);
        state.tracks.speech = a[0] ? a[0].index : 0;
        state.tracks.camera = v[0] ? v[0].index : -1;
        state.tracks.music = a[1] ? a[1].index : -1;
      }
    } catch (err) {
      state.info = null;
    }
    PK.emit("sequence", state.info);
    return state.info;
  }
  const fps = () => (state.info && state.info.fps) || 30;

  function ffmpegBin() {
    const bin = L.ffmpeg.find(ROOT);
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
  async function playhead() {
    const r = await host("pk_playhead");
    return r.seconds;
  }

  // ── transcription ────────────────────────────────────────
  async function transcribe({ language = "" } = {}) {
    if (features().transcribe === false) throw new Error("Transcription isn't switched on on the server yet.");
    const clips = await clipsOn("audio", state.tracks.speech, "speech");
    status("Preparing the audio…", true);
    const { file, map, dir } = await L.audio.extractSpeech(ffmpegBin(), clips);
    try {
      const bytes = fs.readFileSync(file);
      if (bytes.length > 4 * 1024 * 1024) throw new Error("This sequence is too long to transcribe in one go. Try a section of up to about 20 minutes.");
      status("Transcribing…", true);
      const form = new FormData();
      form.append("file", new Blob([bytes], { type: "audio/ogg" }), "speech.ogg");
      form.append("language", language);
      const res = await fetch(L.config.apiBase + "/api/panel/transcribe", { method: "POST", headers: { Authorization: "Bearer " + state.session.token }, body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Transcription failed. Try again.");
      const toSeq = (t) => L.audio.toSequenceTime(map, t);
      state.transcript = {
        language: data.language,
        words: data.words.map((w) => ({ word: w.word, start: toSeq(w.start), end: toSeq(w.end) })),
        segments: data.segments.map((s, i) => ({ id: i, text: s.text, start: toSeq(s.start), end: toSeq(s.end) })),
      };
      state.transcriptSeq = state.info && state.info.id;
      PK.emit("transcript", state.transcript);
      return state.transcript;
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
  const needTranscript = () => (state.transcript && state.transcriptSeq === (state.info && state.info.id) ? state.transcript : transcribe());

  /** Words of a segment (by time overlap). */
  function wordsIn(words, seg) {
    return words.filter((w) => w.start >= seg.start - 0.05 && w.end <= seg.end + 0.05);
  }

  // ── frames ───────────────────────────────────────────────
  function loadImage(src) {
    return new Promise((ok, bad) => {
      const img = new Image();
      img.onload = () => ok(img);
      img.onerror = () => bad(new Error("Premiere didn't export the frame. Move the playhead onto a clip and try again."));
      img.src = src;
    });
  }
  /** Exports a frame of the active sequence (under the playhead, or at `seconds`). */
  async function grabFrame(seconds) {
    const out = path.join(os.tmpdir(), `postkit-frame-${Date.now()}-${Math.round(Math.random() * 1e4)}.png`);
    const res = await host("pk_exportFrame", out, seconds === undefined ? -1 : seconds);
    // Premiere writes the PNG a moment later on some versions.
    for (let i = 0; i < 40 && !fs.existsSync(res.path); i++) await new Promise((r) => setTimeout(r, 100));
    const img = await loadImage(fileUrl(res.path) + "?" + Date.now());
    return { img, path: res.path };
  }
  /** The frame used behind previews; falls back to a neutral gradient. */
  async function previewFrame(force) {
    if (state.frame && !force) return state.frame.img;
    try {
      state.frame = await grabFrame();
      return state.frame.img;
    } catch (e) {
      return fallbackFrame();
    }
  }
  let fallback = null;
  function fallbackFrame() {
    if (fallback) return fallback;
    const c = document.createElement("canvas");
    c.width = 270; c.height = 480;
    const g = c.getContext("2d");
    const gr = g.createLinearGradient(0, 0, 270, 480);
    gr.addColorStop(0, "#3b4a5a"); gr.addColorStop(0.5, "#7a6a58"); gr.addColorStop(1, "#2c2a30");
    g.fillStyle = gr; g.fillRect(0, 0, 270, 480);
    g.fillStyle = "rgba(255,255,255,0.12)";
    g.beginPath(); g.ellipse(135, 190, 60, 75, 0, 0, Math.PI * 2); g.fill();
    g.fillRect(55, 290, 160, 190);
    fallback = c;
    return c;
  }
  /** A small JPEG (base64) of an image, for the AI. */
  function jpegB64(img, maxSide = 640) {
    const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    const k = Math.min(1, maxSide / Math.max(w, h));
    const c = document.createElement("canvas");
    c.width = Math.round(w * k); c.height = Math.round(h * k);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.8).split(",")[1];
  }

  // ── graphics: render a scene to a transparent video and place it ──
  const imageCache = {};
  async function preloadImages(scene) {
    const out = {};
    for (const src of window.PKGfx.imagesOf(scene)) {
      if (!imageCache[src]) imageCache[src] = await loadImage(fileUrl(src)).catch(() => null);
      if (imageCache[src]) out[src] = imageCache[src];
    }
    return out;
  }

  /**
   * Renders a scene at the sequence's size and frame rate. For liquid glass, the camera
   * track's footage from `seqStart` is read and blurred behind the glass.
   */
  async function renderScene(scene, { seqStart = 0, label = "Graphic", onProgress, glass } = {}) {
    if (!state.info) await loadSequence();
    const W = (state.info && state.info.width) || 1080, H = (state.info && state.info.height) || 1920;
    const rate = fps();
    const bin = ffmpegBin();
    const frames = Math.max(1, Math.round(scene.duration * rate));
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const images = await preloadImages(scene);

    let backdrop = null, small = null, sctx = null, sdata = null;
    const useGlass = glass !== undefined ? glass : window.PKGfx.usesGlass(scene);
    if (useGlass && state.tracks.camera >= 0) {
      try {
        const clips = (await host("pk_clips", "video", state.tracks.camera)).clips;
        const segs = clips.map((c) => ({ seqStart: c.start, seqEnd: c.end, mediaPath: c.mediaPath, inPoint: c.inPoint }));
        const bw = Math.max(16, Math.round(W / 4)), bh = Math.max(16, Math.round(H / 4));
        backdrop = new L.render.Backdrop(bin, segs, { width: bw, height: bh, fps: rate });
        small = document.createElement("canvas");
        small.width = bw; small.height = bh;
        sctx = small.getContext("2d");
        sdata = sctx.createImageData(bw, bh);
      } catch (e) {
        backdrop = null;
      }
    }
    const out = path.join(outDir("Graphics"), `${safeName(label)} ${stamp()}.mov`);
    const codec = readJson("settings.json", {}).codec === "qtrle" ? "qtrle" : "prores";
    try {
      await L.render.encode(bin, {
        width: W, height: H, fps: rate, frames, out, codec, onProgress,
        drawFrame: async (i, t) => {
          let bg = null;
          if (backdrop) {
            const f = await backdrop.frameAt(seqStart + t);
            if (f) { sdata.data.set(f); sctx.putImageData(sdata, 0, 0); bg = small; }
          }
          window.PKGfx.render(ctx, scene, t, { bg: () => bg, images });
          return ctx.getImageData(0, 0, W, H).data;
        },
      });
    } finally {
      if (backdrop) backdrop.close();
    }
    return { file: out, duration: frames / rate };
  }

  /** Renders and places a scene on the timeline at `start` (seconds), above everything there. */
  async function addGraphic(scene, { start, label, onProgress, track } = {}) {
    const t0 = start === undefined ? await playhead() : start;
    const r = await renderScene(scene, { seqStart: t0, label, onProgress });
    status("Placing it on the timeline…", true);
    const placed = await host("pk_place", JSON.stringify([{ path: r.file, start: t0, dur: r.duration, type: "video", bin: "Graphics", track }]));
    return { ...r, start: t0, track: placed.placed[0].track };
  }

  // ── sound effects pack ───────────────────────────────────
  let sfxList = null;
  function sfxPack() {
    if (!sfxList) {
      try {
        sfxList = JSON.parse(fs.readFileSync(path.join(ROOT, "assets", "sfx", "sfx.json"), "utf8")).map((s) => ({ ...s, path: path.join(ROOT, "assets", "sfx", s.file) }));
      } catch (e) {
        sfxList = [];
      }
    }
    return sfxList;
  }
  const sfxById = (id) => sfxPack().find((s) => s.id === id);

  // ── tiny event bus ───────────────────────────────────────
  const listeners = {};
  const PK = {
    ROOT, L, path, fs, os, host, state, $, plural, secs, stamp, safeName, status, result, run, api, setCredits, features,
    dataFile, readJson, writeJson, outDir, fileUrl, requireLicence, loadSequence, fps, ffmpegBin, clipsOn, playhead,
    transcribe, needTranscript, wordsIn, grabFrame, previewFrame, fallbackFrame, loadImage, jpegB64, renderScene, addGraphic,
    sfxPack, sfxById, tools: [],
    on(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); },
    emit(ev, data) { (listeners[ev] || []).forEach((fn) => { try { fn(data); } catch (e) { console.error(e); } }); },
    /** Registers a tool: { id, name, group, note, icon, needs: ["speech","camera","music"], mount(el), show() } */
    tool(def) { PK.tools.push(def); },
  };
  window.PK = PK;
})();
