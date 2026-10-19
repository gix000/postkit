/* Edit tools: smart cut, auto zoom, multicam, motion presets, curve editor, tracking. */
(function () {
  "use strict";
  const PK = window.PK;
  const { h, slider, segmented, select, button, resultLine, note, progress } = PK.ui;
  const { L, host, state, plural, secs, run, result } = PK;

  // ── smart cut ────────────────────────────────────────────
  PK.tool({
    id: "cut", name: "Smart cut", group: "Edit", note: "Remove pauses, close the gaps", needs: ["speech", "camera"],
    mount(el) {
      let plan = null;
      const thr = slider("Silence below", { min: -55, max: -20, value: -35, fmt: (v) => `${v} dB` });
      const min = slider("Pauses longer than", { min: 0.2, max: 1.5, step: 0.05, value: 0.4, fmt: (v) => `${(+v).toFixed(2)} s` });
      const pad = slider("Keep around speech", { min: 0, max: 0.3, step: 0.01, value: 0.12, fmt: (v) => `${(+v).toFixed(2)} s` });
      const fade = h("input", { type: "checkbox", checked: true });
      const res = resultLine();
      const find = button("Find pauses", "secondary", () =>
        run(res, "Listening for pauses…", async () => {
          const clips = await PK.clipsOn("audio", state.tracks.speech, "speech");
          const bin = PK.ffmpegBin();
          let found = [];
          for (let i = 0; i < clips.length; i++) {
            PK.status(`Listening for pauses… clip ${i + 1} of ${clips.length}`, true);
            found = found.concat(await L.silence.detectInClip(bin, clips[i], { thresholdDb: thr.value, minSilence: min.value }));
          }
          plan = L.silence.planCuts(found, { padding: pad.value, minSilence: min.value, fps: PK.fps() });
          cut.disabled = !plan.length;
          result(res, plan.length ? `Found ${plural(plan.length, "pause")} — ${secs(L.silence.totalSeconds(plan))} to remove.` : "No pauses found with these settings. Try a higher silence level.", plan.length ? "ok" : "");
        }, [find]));
      const cut = button("Cut on a copy", "primary", () =>
        run(res, "Cutting…", async () => {
          if (!plan || !plan.length) throw new Error("Find pauses first.");
          const dup = await host("pk_duplicate", "PostKit cut");
          const r = await host("pk_cut", JSON.stringify(plan), state.tracks.speech, state.tracks.camera);
          if (fade.checked) await host("pk_crossfades", state.tracks.speech, 2).catch(() => null);
          plan = null;
          state.transcript = null;
          await PK.loadSequence();
          let msg = `Removed ${secs(r.removedSeconds)} in ${plural(r.cuts, "cut")} on “${dup.name}”. Your original sequence is untouched.`;
          if (r.skipped) msg += ` ${plural(r.skipped, "pause")} skipped where the camera track had a gap.`;
          result(res, msg, "ok");
        }, [find, cut]), { disabled: true });
      [thr, min, pad].forEach((s) => s.input.addEventListener("input", () => { plan = null; cut.disabled = true; }));
      el.append(note("Finds the pauses on the speech track and removes them from a copy of the sequence."), thr.el, min.el, pad.el, h("label.check", fade, " Soft audio crossfade on each cut"), h("div.actions", find, cut), res);
    },
  });

  // ── auto zoom ────────────────────────────────────────────
  PK.tool({
    id: "zoom", name: "Auto zoom", group: "Edit", note: "Framing changes with each sentence", needs: ["speech", "camera"],
    mount(el) {
      const style = segmented([["punch", "Punch-in cut"], ["push", "Slow push"]], "punch");
      const amt = slider("Zoom", { min: 4, max: 30, value: 12, fmt: (v) => `${v}%` });
      const res = resultLine();
      const apply = button("Apply zoom", "primary", () =>
        run(res, "Reading the sentences…", async () => {
          if (state.tracks.camera < 0) throw new Error("Pick the camera track to zoom.");
          const t = await PK.needTranscript();
          PK.status("Adding zoom keyframes…", true);
          const keys = L.zoom.plan(t.segments, { style: style.value, amount: amt.value, fps: PK.fps() });
          if (!keys.length) throw new Error("No sentences long enough to zoom on.");
          const r = await host("pk_zoom", JSON.stringify(keys), state.tracks.camera);
          result(res, `Added ${plural(r.keys, "keyframe")} on ${plural(r.clips, "clip")}. “Remove zoom” takes them off.`, "ok");
        }, [apply, clear]));
      const clear = button("Remove zoom", "secondary", () =>
        run(res, "Removing zoom…", async () => {
          await host("pk_zoomClear", state.tracks.camera);
          result(res, "Zoom removed. Scale is back to 100%.", "ok");
        }, [apply, clear]));
      el.append(note("Changes the framing with each sentence, as keyframes on the camera track you can still edit."), style.el, amt.el, h("div.actions", clear, apply), res);
    },
  });

  // ── multicam ─────────────────────────────────────────────
  PK.tool({
    id: "multicam", name: "Multicam", group: "Edit", note: "Cut to whoever is speaking", needs: [],
    mount(el) {
      const box = h("div.cams");
      const minShot = slider("Shortest shot", { min: 0.8, max: 5, step: 0.1, value: 1.8, fmt: (v) => `${(+v).toFixed(1)} s` });
      const list = h("ul.plain.plan-list");
      const res = resultLine();
      let plan = null, cams = [];
      function rows() {
        box.innerHTML = "";
        const info = state.info;
        if (!info) return box.append(note("Open a sequence first."));
        const vids = info.tracks.video.filter((t) => t.clips);
        if (vids.length < 2) return box.append(note("Put each camera on its own video track (V1, V2, …), lined up in sync, with each camera's own sound on its own audio track."));
        vids.forEach((v, i) => {
          const on = h("input", { type: "checkbox", checked: i < 4 });
          const a = h("select");
          info.tracks.audio.forEach((t) => a.add(new Option(`A${t.index + 1}`, String(t.index))));
          a.value = String(info.tracks.audio[Math.min(i, info.tracks.audio.length - 1)].index);
          box.append(h("div.cam-row", h("label.check", on, ` Camera V${v.index + 1}`), h("label.inline", "its sound ", a)));
          box.lastChild.dataset.v = v.index;
          box.lastChild._on = on;
          box.lastChild._a = a;
        });
      }
      PK.on("sequence", rows);
      const analyze = button("Find who's speaking", "secondary", () =>
        run(res, "Listening to each camera…", async () => {
          cams = [...box.querySelectorAll(".cam-row")].filter((r) => r._on.checked).map((r) => ({ v: +r.dataset.v, a: +r._a.value }));
          if (cams.length < 2) throw new Error("Pick at least two cameras.");
          const bin = PK.ffmpegBin();
          const envs = [];
          let from = Infinity, to = 0;
          for (const c of cams) {
            const clips = (await host("pk_clips", "audio", c.a)).clips;
            if (!clips.length) throw new Error(`A${c.a + 1} has no audio.`);
            const e = [];
            for (const clip of clips) { e.push(await L.motion.envelope(bin, clip, 0.1)); from = Math.min(from, clip.start); to = Math.max(to, clip.end); }
            envs.push(e);
          }
          // Lowest track first: pk_multicam disables the tracks above the chosen one.
          const order = cams.map((c, i) => ({ c, i })).sort((x, y) => x.c.v - y.c.v);
          const sortedEnvs = order.map((o) => envs[o.i]);
          cams = order.map((o) => o.c);
          plan = L.motion.multicamPlan(sortedEnvs, { from, to, minShot: minShot.value });
          list.innerHTML = "";
          plan.slice(0, 60).forEach((p) => list.append(h("li", `${L.chapters.stamp(p.start)} – ${L.chapters.stamp(p.end)}  ·  Camera V${cams[p.cam].v + 1}`)));
          apply.disabled = plan.length < 2;
          result(res, plan.length > 1 ? `${plural(plan.length - 1, "switch", "switches")} planned. Check them, then apply.` : "Only one camera speaks — nothing to switch.", "ok");
        }, [analyze, apply]));
      const apply = button("Switch on a copy", "primary", () =>
        run(res, "Switching cameras…", async () => {
          const dup = await host("pk_duplicate", "PostKit multicam");
          const r = await host("pk_multicam", JSON.stringify(cams.map((c) => c.v)), JSON.stringify(plan));
          result(res, `${plural(r.switches, "switch", "switches")} made on “${dup.name}”. Disabled pieces are still there — re-enable any you like.`, "ok");
        }, [analyze, apply]), { disabled: true });
      el.append(note("Listens to each camera's microphone and shows the camera of whoever is talking. You check the plan first; it works on a copy."), box, minShot.el, h("div.actions", analyze, apply), list, res);
      rows();
    },
  });

  // ── motion presets ───────────────────────────────────────
  PK.tool({
    id: "presets", name: "Motion presets", group: "Edit", note: "29 moves as real keyframes", needs: [],
    mount(el) {
      const strength = segmented([["subtle", "Subtle"], ["medium", "Medium"], ["strong", "Strong"]], "medium");
      const grid = h("div.preset-grid");
      const res = resultLine();
      L.presets.list().forEach((p) => {
        const b = button(p.name, "secondary", () =>
          run(res, `Adding “${p.name}”…`, async () => {
            const { clips } = await host("pk_selectedClips");
            if (!clips.length) throw new Error("Select one or more clips on the timeline first.");
            const plans = clips.map((c) => L.presets.plan(p.id, c, { strength: strength.value, fps: PK.fps() }));
            const r = await host("pk_applyKeys", JSON.stringify(plans));
            result(res, `“${p.name}” added to ${plural(r.clips, "clip")}. Undo with Cmd/Ctrl+Z.`, "ok");
          }));
        grid.append(b);
      });
      el.append(note("Select clips on the timeline, then pick a motion. It's written as keyframes you can still change."), strength.el, grid, res);
    },
  });

  // ── curve editor ─────────────────────────────────────────
  PK.tool({
    id: "curves", name: "Curve editor", group: "Edit", note: "Reshape a move between keyframes", needs: [],
    mount(el) {
      let keys = null;
      let curve = L.motion.CURVES.easeInOut.slice();
      const canvas = h("canvas.curve", { width: 520, height: 420 });
      const paramSel = h("select");
      const res = resultLine();
      const chips = h("div.chips");
      const NAMES = { easeInOut: "Ease in & out", easeOut: "Ease out", easeIn: "Ease in", smooth: "Smooth", snap: "Snap", overshoot: "Overshoot", anticipate: "Anticipate", linear: "Linear" };
      Object.keys(L.motion.CURVES).forEach((id) => chips.append(h("button.chip", { type: "button", on: { click: () => { curve = L.motion.CURVES[id].slice(); draw(); } } }, NAMES[id])));
      const pad = 40;
      const W = canvas.width, H = canvas.height;
      // Values from -0.6 to 1.6 fit, so overshoot and anticipation handles stay in view.
      const LO = -0.6, SPAN = 2.2;
      const toXY = (x, y) => [pad + x * (W - 2 * pad), H - pad - ((y - LO) / SPAN) * (H - 2 * pad)];
      const fromXY = (px, py) => [Math.min(1, Math.max(0, (px - pad) / (W - 2 * pad))), LO + ((H - pad - py) / (H - 2 * pad)) * SPAN];
      function draw() {
        const g = canvas.getContext("2d");
        g.clearRect(0, 0, W, H);
        g.strokeStyle = "#3d3a33"; g.lineWidth = 1;
        const [x0, y0] = toXY(0, 0), [x1, y1] = toXY(1, 1);
        g.strokeRect(x0, y1, x1 - x0, y0 - y1);
        const f = L.motion.bezierY(...curve);
        g.strokeStyle = "#f2c230"; g.lineWidth = 3; g.beginPath();
        for (let i = 0; i <= 60; i++) { const p = i / 60; const [x, y] = toXY(p, f(p)); i ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.stroke();
        const h1 = toXY(curve[0], curve[1]), h2 = toXY(curve[2], curve[3]);
        g.strokeStyle = "#a7a294"; g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(...h1); g.moveTo(x1, y1); g.lineTo(...h2); g.stroke();
        for (const [x, y] of [h1, h2]) { g.fillStyle = "#efebdf"; g.beginPath(); g.arc(x, y, 9, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = "#a7a294"; g.font = "20px system-ui";
        g.fillText(curve.map((v) => v.toFixed(2)).join(", "), pad, pad - 12);
      }
      let drag = -1;
      const pos = (e) => { const r = canvas.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]; };
      canvas.addEventListener("pointerdown", (e) => {
        const [px, py] = pos(e);
        const d = [toXY(curve[0], curve[1]), toXY(curve[2], curve[3])].map(([x, y]) => Math.hypot(x - px, y - py));
        drag = d[0] < d[1] ? 0 : 1;
        if (Math.min(...d) > 40) drag = -1;
        if (drag >= 0) canvas.setPointerCapture(e.pointerId);
      });
      canvas.addEventListener("pointermove", (e) => {
        if (drag < 0) return;
        const [x, y] = fromXY(...pos(e));
        curve[drag * 2] = +x.toFixed(3);
        curve[drag * 2 + 1] = +Math.max(LO, Math.min(LO + SPAN, y)).toFixed(3);
        draw();
      });
      canvas.addEventListener("pointerup", () => (drag = -1));
      const read = button("Read keyframes", "secondary", () =>
        run(res, "Reading keyframes…", async () => {
          const r = await host("pk_selectedKeys");
          keys = r.params;
          paramSel.innerHTML = "";
          const names = Object.keys(keys);
          if (!names.length) throw new Error("That clip has no moves yet (it needs two or more keyframes on Scale, Position, Rotation or Opacity).");
          names.forEach((n) => paramSel.add(new Option(`${n[0].toUpperCase() + n.slice(1)} · ${keys[n].length} keys`, n)));
          apply.disabled = false;
          result(res, `“${r.clip.name}”: pick a curve and apply.`, "ok");
        }, [read]));
      const apply = button("Apply curve", "primary", () =>
        run(res, "Shaping the move…", async () => {
          const name = paramSel.value;
          const baked = L.motion.bake(keys[name], curve, { fps: PK.fps() });
          await host("pk_setKeys", name, JSON.stringify(baked));
          result(res, `Curve applied to ${name} (${plural(baked.length, "keyframe")}). Undo with Cmd/Ctrl+Z.`, "ok");
        }, [apply]), { disabled: true });
      el.append(note("Select a clip with keyframes, read them, then drag the handles or pick a shape. The curve is written between every pair of keyframes."), read, h("label", "Parameter", paramSel), chips, canvas, apply, res);
      draw();
    },
  });

  // ── tracking ─────────────────────────────────────────────
  PK.tool({
    id: "tracking", name: "Tracking", group: "Edit", note: "Make a title or sticker follow something", needs: ["camera"],
    mount(el) {
      const canvas = h("canvas.track-canvas");
      const res = resultLine();
      const prog = progress();
      let frame = null, box = null, startT = 0;
      const grab = button("1 · Grab the frame", "secondary", () =>
        run(res, "Grabbing the frame…", async () => {
          startT = await PK.playhead();
          frame = (await PK.grabFrame()).img;
          canvas.width = frame.naturalWidth; canvas.height = frame.naturalHeight;
          box = null;
          draw();
          canvas.hidden = false;
          result(res, "2 · Drag a box around what should be followed.", "ok");
        }, [grab]));
      function draw() {
        const g = canvas.getContext("2d");
        g.drawImage(frame, 0, 0);
        if (box) {
          g.strokeStyle = "#f2c230"; g.lineWidth = Math.max(3, canvas.width / 300);
          g.strokeRect(box.x, box.y, box.w, box.h);
        }
      }
      let down = null;
      const pt = (e) => { const r = canvas.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * canvas.width, y: ((e.clientY - r.top) / r.height) * canvas.height }; };
      canvas.addEventListener("pointerdown", (e) => { down = pt(e); canvas.setPointerCapture(e.pointerId); });
      canvas.addEventListener("pointermove", (e) => {
        if (!down) return;
        const p = pt(e);
        box = { x: Math.min(down.x, p.x), y: Math.min(down.y, p.y), w: Math.abs(p.x - down.x), h: Math.abs(p.y - down.y) };
        draw();
      });
      canvas.addEventListener("pointerup", () => { down = null; if (box && box.w > 8) result(res, "3 · Select the title or sticker clip on the timeline, then press Track.", "ok"); });
      const go = button("Track and attach", "primary", () =>
        run(res, "Tracking…", async () => {
          if (!box || box.w < 8) throw new Error("Draw a box first.");
          const sel = await host("pk_selectedKeys").catch(() => null);
          if (!sel) throw new Error("Select the clip that should follow (a title, sticker or logo).");
          const base = sel.values.position || [0.5, 0.5];
          const until = sel.clip.end;
          const dur = Math.max(0.2, until - startT);
          const clips = (await host("pk_clips", "video", state.tracks.camera)).clips;
          const segs = clips.map((c) => ({ seqStart: c.start, seqEnd: c.end, mediaPath: c.mediaPath, inPoint: c.inPoint }));
          // Track at a small size: fast, and plenty accurate after smoothing.
          const k = Math.min(1, 480 / canvas.width);
          const w = Math.round(canvas.width * k), hh = Math.round(canvas.height * k);
          const bd = new L.render.Backdrop(PK.ffmpegBin(), segs, { width: w, height: hh, fps: PK.fps() });
          const n = Math.round(dur * PK.fps());
          async function* frames() {
            for (let i = 0; i < n; i++) {
              const f = await bd.frameAt(startT + i / PK.fps());
              if (!f) return;
              if (i % 10 === 0) { prog.set(i / n); PK.status(`Tracking… ${Math.round((i / n) * 100)}%`, true); }
              yield L.motion.grey(f, w, hh);
            }
          }
          let pts;
          try {
            pts = await L.motion.track(frames(), w, hh, { x: box.x * k, y: box.y * k, w: box.w * k, h: box.h * k });
          } finally {
            bd.close();
            prog.set(null);
          }
          pts = L.motion.smooth(pts, 2);
          const lost = pts.findIndex((p) => p.score < 0.35);
          if (lost > 0) pts = pts.slice(0, lost);
          const c0 = pts[0];
          const keys = pts.map((p, i) => ({ time: +(startT + i / PK.fps()).toFixed(4), value: [base[0] + (p.x - c0.x) / w, base[1] + (p.y - c0.y) / hh] }));
          await host("pk_setKeys", "position", JSON.stringify(keys));
          result(res, `Followed for ${secs(keys.length / PK.fps())}${lost > 0 ? " (lost it after that — draw a new box from there)" : ""}. ${plural(keys.length, "keyframe")} on Position.`, "ok");
        }, [go]));
      canvas.hidden = true;
      el.append(note("Follows something that moves in the camera shot and makes your selected clip move with it. Runs on your computer, no credits."), grab, canvas, go, prog.el, res);
    },
  });
})();
