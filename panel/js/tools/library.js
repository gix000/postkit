/* Colour looks, and the Library group: b-roll, your library, search & markers, project cleanup. */
(function () {
  "use strict";
  const PK = window.PK;
  const { h, slider, segmented, select, button, resultLine, note, progress } = PK.ui;
  const { L, host, state, plural, run, result, fs, path } = PK;

  // ── colour looks ─────────────────────────────────────────
  const NEUTRAL = { Saturation: 100 };
  /** Lumetri values for a look at an intensity (1 = as designed). */
  function lookValues(id, k = 1) {
    const l = L.looks.LOOKS[id].lumetri;
    const out = {};
    for (const [name, v] of Object.entries(l)) {
      const base = NEUTRAL[name] === undefined ? 0 : NEUTRAL[name];
      out[name] = +(base + (v - base) * k).toFixed(3);
    }
    return out;
  }
  /** Preview images of looks on a frame (approximate), as file paths. */
  async function lookPreviews(framePath, ids) {
    const dir = path.join(PK.os.tmpdir(), "postkit-looks");
    fs.mkdirSync(dir, { recursive: true });
    const out = {};
    for (const id of ids) {
      const file = path.join(dir, `${id}-${Date.now()}.jpg`);
      await L.ffmpeg.run(PK.ffmpegBin(), ["-y", "-i", framePath, "-vf", `scale=360:-2,${L.looks.previewFilter(id)}`, "-q:v", "4", file]);
      out[id] = file;
    }
    return out;
  }
  PK.looks = { lookValues, lookPreviews };

  PK.tool({
    id: "looks", name: "Colour looks", group: "Colour", note: "10 grades, previewed on your shot", needs: ["camera"],
    mount(el) {
      let chosen = null;
      const grid = h("div.tiles.looks-grid");
      const amount = slider("Strength", { min: 0.25, max: 1.5, step: 0.05, value: 1, fmt: (v) => `${Math.round(v * 100)}%` });
      const res = resultLine();
      const show = button("Show looks on this frame", "secondary", () =>
        run(res, "Grading previews…", async () => {
          const f = await PK.grabFrame();
          const ids = L.looks.list().map((l) => l.id);
          const files = await lookPreviews(f.path, ids);
          grid.innerHTML = "";
          const orig = h("button.tile", { type: "button", disabled: true }, h("img.look-img", { src: PK.fileUrl(f.path), alt: "" }), h("span.tile-name", "Original"));
          grid.append(orig);
          L.looks.list().forEach((l) => {
            const t = h("button.tile", { type: "button", title: l.note, "aria-pressed": "false" }, h("img.look-img", { src: PK.fileUrl(files[l.id]), alt: "" }), h("span.tile-name", l.name));
            t.addEventListener("click", () => { chosen = l.id; grid.querySelectorAll(".tile").forEach((x) => x.setAttribute("aria-pressed", String(x === t))); apply.disabled = false; result(res, l.note, ""); });
            grid.append(t);
          });
          result(res, "Previews are close to the final grade. Pick one.", "ok");
        }, [show]));
      const apply = button("Apply to the camera track", "primary", () =>
        run(res, "Grading…", async () => {
          if (!chosen) throw new Error("Pick a look first.");
          const r = await host("pk_look", JSON.stringify(lookValues(chosen, amount.value)), state.tracks.camera);
          result(res, `“${L.looks.LOOKS[chosen].name}” on ${plural(r.clips, "clip")}. Fine-tune it in Lumetri Color.`, "ok");
        }, [apply]), { disabled: true });
      el.append(note("Each look is a Lumetri Color grade you can keep adjusting. Preview them on the frame under the playhead first."), show, grid, amount.el, apply, res);
    },
  });

  // ── b-roll ───────────────────────────────────────────────
  PK.tool({
    id: "broll", name: "B-roll", group: "Library", note: "Free stock video and photos", needs: ["camera"],
    mount(el) {
      const q = h("input", { type: "search", placeholder: "Search b-roll — e.g. coffee pouring, city at night" });
      const kind = segmented([["videos", "Videos"], ["photos", "Photos"]], "videos");
      const len = slider("Length on the timeline", { min: 1, max: 10, step: 0.5, value: 3, fmt: (v) => `${v} s` });
      const grid = h("div.tiles.broll-grid");
      const res = resultLine();
      const prog = progress();
      const off = note("B-roll search needs a Pexels key on the server.");
      async function search(e) {
        if (e) e.preventDefault();
        await run(res, "Searching…", async () => {
          const orientation = PK.ui.aspect() > 1.1 ? "portrait" : PK.ui.aspect() < 0.9 ? "landscape" : "square";
          const data = await PK.api("/api/panel/broll", { q: q.value, kind: kind.value, orientation });
          grid.innerHTML = "";
          data.items.forEach((it) => {
            const t = h("button.tile", { type: "button", title: `By ${it.by} on Pexels` }, h("img.look-img", { src: it.thumb, alt: "", loading: "lazy" }), h("span.tile-name", it.kind === "video" ? `${it.duration}s · ${it.by}` : it.by));
            t.addEventListener("click", () => add(it));
            grid.append(t);
          });
          result(res, data.items.length ? "Click one to add it at the playhead, above the camera." : "Nothing found. Try other words in English.", data.items.length ? "ok" : "");
        });
      }
      async function add(it) {
        await run(res, "Downloading…", async () => {
          const ext = it.kind === "video" ? ".mp4" : ".jpg";
          const file = path.join(PK.outDir("B-roll"), `${it.id}${ext}`);
          if (!fs.existsSync(file)) {
            const r = await fetch(it.file);
            if (!r.ok) throw new Error("The download failed. Try another clip.");
            const total = +r.headers.get("content-length") || 0;
            const reader = r.body.getReader();
            const chunks = [];
            let got = 0;
            for (;;) {
              const { done, value } = await reader.read();
              if (done) break;
              chunks.push(value);
              got += value.length;
              if (total) prog.set(got / total);
            }
            fs.writeFileSync(file, Buffer.concat(chunks.map((c) => Buffer.from(c))));
            prog.set(null);
          }
          const at = await PK.playhead();
          const dur = it.kind === "video" ? Math.min(len.value, it.duration || len.value) : len.value;
          const item = { path: file, start: at, dur, type: "video", bin: "B-roll", from: state.tracks.camera + 1 };
          if (it.kind === "video") { item.srcIn = Math.max(0, ((it.duration || dur) - dur) / 2); item.srcOut = item.srcIn + dur; }
          const r = await host("pk_place", JSON.stringify([item]));
          result(res, `Added b-roll by ${it.by} (Pexels) on V${r.placed[0].track + 1}.`, "ok");
        });
        prog.set(null);
      }
      const form = h("form.search-row", { on: { submit: search } }, q, button("Search", "secondary", search));
      PK.on("session", () => { const on = PK.features().broll !== false; form.hidden = !on; off.hidden = on; });
      const on = PK.features().broll !== false;
      form.hidden = !on; off.hidden = on;
      el.append(note("Cutaways and stills from Pexels, free to use. Placed above your camera track for the length you set."), off, form, kind.el, len.el, grid, prog.el, res);
    },
  });

  // ── your library ─────────────────────────────────────────
  PK.tool({
    id: "library", name: "Your library", group: "Library", note: "Your own SFX, transitions, overlays", needs: [],
    mount(el) {
      let items = [], cat = "";
      const folders = () => PK.readJson("library.json", { folders: [] }).folders;
      const info = note("");
      const q = h("input", { type: "search", placeholder: "Search your library" });
      const chips = h("div.chips");
      const list = h("ul.lib");
      const res = resultLine();
      const scan = () => (items = L.library.scan(folders()));
      function render() {
        const f = folders();
        info.textContent = f.length ? f.map((x) => path.basename(x)).join(" · ") : "Add the folders where you keep your sound effects, transitions and overlays.";
        if (!items.length && f.length) scan();
        chips.innerHTML = "";
        ["", ...new Set(items.map((i) => i.category))].forEach((c) => chips.append(h("button.chip", { type: "button", "aria-pressed": String(cat === c), on: { click: () => { cat = c; render(); } } }, c || "All")));
        list.innerHTML = "";
        let audioEl = null;
        L.library.filter(items, { query: q.value, category: cat }).slice(0, 200).forEach((it) => {
          const row = h("button.lib-row", { type: "button", title: "Add at the playhead" }, h("span.lib-name", it.name), h("span.lib-cat", it.category));
          row.addEventListener("mouseenter", () => { if (it.type !== "audio") return; audioEl = new Audio(PK.fileUrl(it.path)); audioEl.volume = 0.6; audioEl.play().catch(() => {}); });
          row.addEventListener("mouseleave", () => audioEl && audioEl.pause());
          row.addEventListener("click", () =>
            run(res, "Adding…", async () => {
              const at = await PK.playhead();
              const audio = it.type === "audio";
              const r = await host("pk_place", JSON.stringify([{ path: it.path, start: at, dur: 2, type: audio ? "audio" : "video", bin: "Library", from: audio ? state.tracks.speech + 1 : 0 }]));
              result(res, `Added “${it.name}” at ${L.chapters.stamp(at)} on ${audio ? "A" : "V"}${r.placed[0].track + 1}.`, "ok");
            }));
          list.append(h("li", row));
        });
        if (!list.children.length && f.length) list.append(h("li.muted", "Nothing matches."));
      }
      q.addEventListener("input", render);
      const addF = button("Add a folder", "secondary", () => {
        const pick = window.cep && window.cep.fs && window.cep.fs.showOpenDialogEx ? window.cep.fs.showOpenDialogEx(false, true, "Choose a library folder") : null;
        const folder = pick && pick.data && pick.data[0];
        if (!folder) return;
        const data = PK.readJson("library.json", { folders: [] });
        if (!data.folders.includes(folder)) data.folders.push(folder);
        PK.writeJson("library.json", data);
        scan();
        render();
        result(res, `${plural(items.length, "item")} in your library.`, "ok");
      });
      const rescan = button("Rescan", "secondary", () => { scan(); render(); result(res, `${plural(items.length, "item")} in your library.`, "ok"); });
      el.append(h("div.actions", addF, rescan), info, q, chips, list, res);
      render();
    },
  });

  // ── search & markers ─────────────────────────────────────
  PK.tool({
    id: "search", name: "Search & markers", group: "Library", note: "Find a word, chapters, beats", needs: ["speech", "music"],
    mount(el) {
      const q = h("input", { type: "search", placeholder: "Any word or phrase", dir: "auto" });
      const hits = h("ul.hits");
      const res = resultLine();
      const chaptersText = h("textarea", { rows: 5, readonly: true, hidden: true });
      let chapters = null;
      const find = (e) => {
        e.preventDefault();
        run(res, "Searching…", async () => {
          const t = await PK.needTranscript();
          const found = L.chapters.search(t.words, q.value);
          hits.innerHTML = "";
          found.slice(0, 50).forEach((hit) => {
            const b = h("button.hit", { type: "button" }, h("span.hit-time", L.chapters.stamp(hit.time)), h("span.hit-text", { dir: "auto" }, hit.text));
            b.addEventListener("click", () => host("pk_seek", hit.time).catch((err) => result(res, err.message, "err")));
            hits.append(h("li", b));
          });
          result(res, found.length ? `${plural(found.length, "match", "matches")}. Click one to jump there.` : "Not said in this sequence.", found.length ? "ok" : "");
        });
      };
      const make = button("Make chapters", "secondary", () =>
        run(res, "Reading the transcript…", async () => {
          const t = await PK.needTranscript();
          chapters = L.chapters.chapters(t.segments);
          if (chapters.length < 3) { chapters = null; throw new Error("This video is too short for chapters. YouTube needs at least three, each 10 seconds or longer."); }
          chaptersText.value = L.chapters.toYouTube(chapters);
          chaptersText.hidden = false;
          chaptersText.select();
          mark.disabled = false;
          result(res, `${plural(chapters.length, "chapter")}. Copy them into your YouTube description, and edit the titles.`, "ok");
        }, [make]));
      const mark = button("Add as markers", "secondary", () =>
        run(res, "Adding markers…", async () => {
          const r = await host("pk_markers", JSON.stringify(chapters.map((c) => ({ time: c.time, name: c.title, color: 1 }))));
          result(res, `Added ${plural(r.added, "chapter marker")}.`, "ok");
        }, [mark]), { disabled: true });
      const sens = select("Sensitivity", [["0.7", "Main beats only"], ["1", "Normal"], ["1.5", "Every hit"]], "1");
      const beats = button("Mark the beats", "primary block", () =>
        run(res, "Listening for the beat…", async () => {
          const clips = await PK.clipsOn("audio", state.tracks.music, "music");
          let times = [];
          for (const c of clips) times = times.concat(await L.beats.forClip(PK.ffmpegBin(), c, { sensitivity: +sens.value }));
          if (!times.length) throw new Error("No clear beats found. Try “Every hit”.");
          const r = await host("pk_markers", JSON.stringify(times.map((t) => ({ time: t, color: 4 }))));
          result(res, `Added ${plural(r.added, "beat marker")}. Snap cuts to them with snapping on.`, "ok");
        }, [beats]));
      el.append(h("h2", "Find a word"), h("form.search-row", { on: { submit: find } }, q, h("button.secondary", { type: "submit" }, "Find")), hits, h("h2", "YouTube chapters"), h("div.actions", make, mark), chaptersText, h("h2", "Beat markers"), sens.el, beats, res);
    },
  });

  // ── project cleanup ──────────────────────────────────────
  PK.tool({
    id: "cleanup", name: "Project cleanup", group: "Library", note: "File everything into bins", needs: [],
    mount(el) {
      let plan = null;
      const list = h("ul.plain");
      const res = resultLine();
      const scan = button("Show the plan", "secondary", () =>
        run(res, "Reading the project…", async () => {
          const { items } = await host("pk_projectItems");
          plan = L.cleanup.plan(items);
          list.innerHTML = "";
          L.cleanup.summary(plan).forEach((line) => list.append(h("li", line)));
          apply.disabled = !plan.length;
          result(res, plan.length ? `${plural(plan.length, "item")} to file.` : "Already tidy — nothing loose in the project.", "ok");
        }, [scan]));
      const apply = button("Tidy the project", "primary", () =>
        run(res, "Tidying…", async () => {
          const r = await host("pk_cleanup", JSON.stringify(plan));
          plan = null;
          list.innerHTML = "";
          apply.disabled = true;
          result(res, `Filed ${plural(r.moved, "item")} into bins.`, "ok");
        }, [scan, apply]), { disabled: true });
      el.append(note("Files every loose item into a bin by type: Video, Audio, Images, Graphics, Sequences. Your own bins stay as they are."), h("div.actions", scan, apply), list, res);
    },
  });
})();
