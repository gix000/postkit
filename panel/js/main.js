/* PostKit panel — start-up, sign-in and navigation between the AI editor and the tools. */
(function () {
  "use strict";
  const PK = window.PK;
  const { h, ICONS, trackSelect } = PK.ui;
  const { $, L, state } = PK;
  const VERSION = "1.0.0";
  const GROUPS = ["Edit", "Text & graphics", "Audio", "Colour", "Library"];

  // ── views ────────────────────────────────────────────────
  let currentTool = null;
  function show(view) {
    ["signin", "home", "tool", "taste", "account"].forEach((v) => ($("view-" + v).hidden = v !== view));
    $("account-btn").hidden = view === "signin" || view === "account";
    $("home-btn").hidden = view === "home" || view === "signin";
    $("credits").hidden = view === "signin" || !state.session;
    if (view !== "tool" && currentTool && currentTool.hide) currentTool.hide();
    window.scrollTo(0, 0);
  }
  $("home-btn").addEventListener("click", () => show("home"));

  // ── credits in the header ────────────────────────────────
  function showCredits(n) {
    const el = $("credits");
    if (typeof n !== "number") return (el.hidden = true);
    el.innerHTML = `${ICONS.ai}<span>${n.toLocaleString()}</span>`;
    el.title = `${n.toLocaleString()} AI credits`;
  }
  PK.on("credits", (n) => { showCredits(n); L.licence.update({ credits: n }); });
  PK.on("session", (s) => showCredits(s && s.credits));
  PK.on("signedout", () => show("signin"));

  // ── sign in ──────────────────────────────────────────────
  $("form-email").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("email").value.trim();
    PK.status("Sending your code…", true);
    try {
      await L.licence.requestCode(email);
      $("code-sent").textContent = `We sent a code to ${email}.`;
      $("form-email").hidden = true;
      $("form-code").hidden = false;
      $("code").value = "";
      $("code").focus();
      PK.status("");
    } catch (err) {
      PK.status(err.message);
    }
  });
  $("form-code").addEventListener("submit", async (e) => {
    e.preventDefault();
    PK.status("Signing in…", true);
    try {
      state.session = await L.licence.signIn($("email").value.trim(), $("code").value.replace(/\D/g, ""));
      PK.emit("session", state.session);
      PK.status("");
      await openHome();
    } catch (err) {
      PK.status(err.message);
    }
  });
  $("change-email").addEventListener("click", () => { $("form-code").hidden = true; $("form-email").hidden = false; });

  // ── account ──────────────────────────────────────────────
  let returnTo = "home";
  $("account-btn").addEventListener("click", () => {
    returnTo = !$("view-tool").hidden ? "tool" : "home";
    const s = state.session || {};
    $("acc-email").textContent = s.email || "";
    $("acc-until").textContent = s.planExpires ? new Date(s.planExpires).toLocaleDateString() : "";
    $("acc-credits").textContent = typeof s.credits === "number" ? s.credits.toLocaleString() : "—";
    $("acc-version").textContent = VERSION;
    $("codec").value = PK.readJson("settings.json", {}).codec === "qtrle" ? "qtrle" : "prores";
    show("account");
  });
  $("codec").addEventListener("change", () => PK.writeJson("settings.json", { ...PK.readJson("settings.json", {}), codec: $("codec").value }));
  $("back").addEventListener("click", () => show(returnTo));
  $("sign-out").addEventListener("click", () => {
    L.licence.signOut();
    state.session = null;
    $("form-code").hidden = true;
    $("form-email").hidden = false;
    show("signin");
  });

  // ── taste ────────────────────────────────────────────────
  PK.on("open:taste", () => {
    const body = $("taste-body");
    body.innerHTML = "";
    body.append(PK.ai.tasteView());
    show("taste");
  });

  // ── the tool grid ────────────────────────────────────────
  function renderTools() {
    const root = $("tool-groups");
    root.innerHTML = "";
    for (const g of GROUPS) {
      const tools = PK.tools.filter((t) => t.group === g);
      if (!tools.length) continue;
      const grid = h("div.tool-grid");
      tools.forEach((t) => grid.append(h("button.tool-tile", { type: "button", on: { click: () => openTool(t.id) } }, h("span.tool-icon", { html: ICONS[t.id] || ICONS.ai }), h("span.tool-name", t.name), h("span.tool-note", t.note))));
      root.append(h("h2.group-title", g), grid);
    }
  }

  const mounted = {};
  function openTool(id) {
    const tool = PK.tools.find((t) => t.id === id);
    currentTool = tool;
    $("tool-title").textContent = tool.name;
    const source = $("source");
    source.innerHTML = "";
    const needs = tool.needs || [];
    if (needs.length) source.append(h("div.grid2", ...needs.map((k) => trackSelect(k))));
    source.hidden = !needs.length;
    const body = $("tool-body");
    for (const el of body.children) el.hidden = true;
    if (!mounted[id]) {
      mounted[id] = h("div.tool-view", { "data-tool": id });
      body.append(mounted[id]);
      tool.mount(mounted[id]);
    }
    mounted[id].hidden = false;
    show("tool");
    if (tool.show) tool.show();
  }

  // ── sequence line ────────────────────────────────────────
  PK.on("sequence", (info) => { $("seq-name").textContent = info ? info.name : "No sequence open — open one in Premiere"; });
  $("refresh").addEventListener("click", () => PK.loadSequence());
  window.addEventListener("focus", () => state.session && PK.loadSequence());

  // ── start ────────────────────────────────────────────────
  async function openHome() {
    show("home");
    await PK.loadSequence();
  }

  async function loadFonts() {
    try {
      const dir = PK.path.join(PK.ROOT, "assets", "fonts");
      const faces = JSON.parse(PK.fs.readFileSync(PK.path.join(dir, "fonts.json"), "utf8"));
      await window.PKFonts.load(faces, PK.fileUrl(dir));
    } catch (e) {
      console.warn("fonts", e);
    }
  }

  PK.ai.mountHome($("ai-home"));
  renderTools();
  (async function start() {
    PK.status("Starting…", true);
    const fonts = loadFonts();
    try {
      const stored = await L.licence.current();
      // Ask the server once for what's switched on when this copy hasn't heard yet.
      state.session = stored && !stored.features ? (await L.licence.current({ force: true })) || stored : stored;
    } catch (err) {
      PK.status(err.message);
    }
    await fonts;
    PK.status("");
    if (state.session) {
      PK.emit("session", state.session);
      await openHome();
    } else show("signin");
  })();
})();
