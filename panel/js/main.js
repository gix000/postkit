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

  // ── ui helpers ───────────────────────────────────────────
  const $ = (id) => document.getElementById(id);
  const state = { session: null, info: null, cutPlan: null, transcript: null };

  function show(view) {
    ["signin", "main", "account"].forEach((v) => ($("view-" + v).hidden = v !== view));
    $("account-btn").hidden = view !== "main";
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
  /** Runs a task with buttons disabled and errors shown in place. */
  async function run(resultId, label, fn, buttons) {
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
    }
  }

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
      await openMain();
    } catch (err) {
      status(err.message);
    }
  });

  $("change-email").addEventListener("click", () => {
    $("form-code").hidden = true;
    $("form-email").hidden = false;
  });

  $("account-btn").addEventListener("click", () => {
    $("acc-email").textContent = state.session ? state.session.email : "";
    $("acc-until").textContent = state.session && state.session.planExpires ? new Date(state.session.planExpires).toLocaleDateString() : "";
    show("account");
  });
  $("back").addEventListener("click", () => show("main"));
  $("sign-out").addEventListener("click", () => {
    licence.signOut();
    state.session = null;
    $("form-code").hidden = true;
    $("form-email").hidden = false;
    show("signin");
  });

  // ── sequence ─────────────────────────────────────────────
  function fillTracks(select, tracks, prefix, allowNone) {
    const prev = select.value;
    select.innerHTML = "";
    if (allowNone) select.add(new Option("None (audio only)", "-1"));
    tracks.forEach((t) => select.add(new Option(`${prefix}${t.index + 1}${t.clips ? "" : " (empty)"}`, String(t.index))));
    const firstWithClips = tracks.find((t) => t.clips);
    select.value = [...select.options].some((o) => o.value === prev) ? prev : String(firstWithClips ? firstWithClips.index : allowNone ? -1 : 0);
  }

  async function loadSequence() {
    try {
      const info = await host("pk_info");
      state.info = info;
      $("seq-name").textContent = info.name;
      fillTracks($("a-track"), info.tracks.audio, "A", false);
      fillTracks($("v-track"), info.tracks.video, "V", true);
    } catch (err) {
      state.info = null;
      $("seq-name").textContent = err.message;
    }
  }
  $("refresh").addEventListener("click", loadSequence);

  const aIndex = () => parseInt($("a-track").value, 10);
  const vIndex = () => parseInt($("v-track").value, 10);
  const fps = () => (state.info && state.info.fps) || 30;

  function ffmpegBin() {
    const bin = ffmpeg.find(ROOT);
    if (!bin) throw new Error("ffmpeg wasn't found. Reinstall PostKit to restore it.");
    return bin;
  }

  async function speechClips() {
    if (!state.info) await loadSequence();
    if (!state.info) throw new Error("Open a sequence in Premiere first.");
    const { clips } = await host("pk_clips", "audio", aIndex());
    if (!clips.length) throw new Error("The speech track has no clips. Pick the track your voice is on.");
    return clips;
  }

  // ── tabs ─────────────────────────────────────────────────
  document.querySelectorAll(".tabs button").forEach((btn) =>
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tabs button").forEach((b) => b.setAttribute("aria-selected", String(b === btn)));
      document.querySelectorAll(".tab").forEach((p) => (p.hidden = p.dataset.panel !== btn.dataset.tab));
    }),
  );

  // ── smart cut ────────────────────────────────────────────
  const cutSettings = () => ({
    thresholdDb: +$("thr").value,
    minSilence: +$("min").value,
    padding: +$("pad").value,
  });
  [["thr", "thr-out", (v) => `${v} dB`], ["min", "min-out", (v) => `${(+v).toFixed(2)} s`], ["pad", "pad-out", (v) => `${(+v).toFixed(2)} s`]].forEach(
    ([input, out, fmt]) =>
      $(input).addEventListener("input", () => {
        $(out).textContent = fmt($(input).value);
        state.cutPlan = null; // settings changed: find again
        $("cut").disabled = true;
      }),
  );

  $("find").addEventListener("click", () =>
    run("cut-result", "Listening for pauses…", async () => {
      const clips = await speechClips();
      const bin = ffmpegBin();
      const s = cutSettings();
      let found = [];
      for (let i = 0; i < clips.length; i++) {
        status(`Listening for pauses… clip ${i + 1} of ${clips.length}`, true);
        found = found.concat(await silence.detectInClip(bin, clips[i], s));
      }
      state.cutPlan = silence.planCuts(found, { padding: s.padding, minSilence: s.minSilence, fps: fps() });
      const total = silence.totalSeconds(state.cutPlan);
      result(
        "cut-result",
        state.cutPlan.length ? `Found ${state.cutPlan.length} pauses — ${secs(total)} to remove.` : "No pauses found with these settings. Try a higher silence level.",
        state.cutPlan.length ? "ok" : "",
      );
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
      let msg = `Removed ${secs(res.removedSeconds)} in ${res.cuts} cuts on “${dup.name}”. Your original sequence is untouched.`;
      if (res.skipped) msg += ` ${res.skipped} pause${res.skipped === 1 ? " was" : "s were"} skipped where the camera track had a gap.`;
      result("cut-result", msg, "ok");
    }, ["find", "cut"]),
  );

  // ── captions ─────────────────────────────────────────────
  function renderTranscript(t) {
    const el = $("transcript");
    el.innerHTML = "";
    t.segments.forEach((s) => {
      const time = document.createElement("span");
      time.textContent = `${Math.floor(s.start / 60)}:${String(Math.floor(s.start % 60)).padStart(2, "0")}`;
      el.append(time, document.createTextNode(s.text + "\n"));
    });
    el.hidden = !t.segments.length;
  }

  $("transcribe").addEventListener("click", () =>
    run("cap-result", "Preparing the audio…", async () => {
      const clips = await speechClips();
      const { file, map, dir } = await audio.extractSpeech(ffmpegBin(), clips);
      try {
        const bytes = fs.readFileSync(file);
        if (bytes.length > 4 * 1024 * 1024) throw new Error("This sequence is too long to transcribe in one go. Try a section of up to about 20 minutes.");
        status("Transcribing…", true);
        const form = new FormData();
        form.append("file", new Blob([bytes], { type: "audio/ogg" }), "speech.ogg");
        form.append("language", $("lang").value);
        const res = await fetch(config.apiBase + "/api/panel/transcribe", {
          method: "POST",
          headers: { Authorization: "Bearer " + state.session.token },
          body: form,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Transcription failed. Try again.");
        const toSeq = (t) => audio.toSequenceTime(map, t);
        state.transcript = {
          language: data.language,
          words: data.words.map((w) => ({ word: w.word, start: toSeq(w.start), end: toSeq(w.end) })),
          segments: data.segments.map((s) => ({ text: s.text, start: toSeq(s.start), end: toSeq(s.end) })),
        };
        renderTranscript(state.transcript);
        result("cap-result", `Transcribed ${state.transcript.words.length} words. Check the text, then add captions.`, "ok");
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
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
      result(
        "cap-result",
        res.placed ? `Added ${caps.length} captions on a new caption track. Style them from the Text panel.` : res.message,
        "ok",
      );
    }, ["transcribe", "add-captions"]),
  );

  // ── auto zoom ────────────────────────────────────────────
  $("zamt").addEventListener("input", () => ($("zamt-out").textContent = `${$("zamt").value}%`));

  $("zoom").addEventListener("click", () =>
    run("zoom-result", "Adding zoom keyframes…", async () => {
      if (vIndex() < 0) throw new Error("Pick the camera track to zoom.");
      if (!state.transcript) throw new Error("Transcribe in the Captions tab first — zoom follows the sentences.");
      const keys = zoom.plan(state.transcript.segments, { style: $("zstyle").value, amount: +$("zamt").value, fps: fps() });
      if (!keys.length) throw new Error("No sentences long enough to zoom on.");
      const res = await host("pk_zoom", JSON.stringify(keys), vIndex());
      result("zoom-result", `Added ${res.keys} keyframes on ${res.clips} clip${res.clips === 1 ? "" : "s"}. Undo or “Remove zoom” to take them off.`, "ok");
    }, ["zoom", "zoom-clear"]),
  );

  $("zoom-clear").addEventListener("click", () =>
    run("zoom-result", "Removing zoom…", async () => {
      if (vIndex() < 0) throw new Error("Pick the camera track.");
      await host("pk_zoomClear", vIndex());
      result("zoom-result", "Zoom removed. Scale is back to 100%.", "ok");
    }, ["zoom", "zoom-clear"]),
  );

  // ── start ────────────────────────────────────────────────
  async function openMain() {
    show("main");
    await loadSequence();
  }

  (async function start() {
    status("Checking your licence…", true);
    try {
      state.session = await licence.current();
    } catch (err) {
      status(err.message);
    }
    status("");
    if (state.session) await openMain();
    else show("signin");
  })();
})();
