/* Invitation editor: form <-> data <-> live card / video preview, sharing and video export. */
(function () {
  hydrateIcons();
  const $ = (id) => document.getElementById(id);
  const form = $("form");
  const uiSelect = $("ui-lang");
  const langSelect = $("inv-lang");
  const eventsBox = $("events");
  const preview = $("preview");
  const DRAFT_KEY = "invite-draft";

  const qs = new URLSearchParams(location.search);
  let uiLang = LANGS[qs.get("l")] ? qs.get("l") : preferredLang();

  let data;
  try { data = JSON.parse(localStorage.getItem(DRAFT_KEY)); } catch (_) { data = null; }
  if (!data || typeof data !== "object") {
    data = { ...SAMPLE, l: uiLang, e: [
      { k: "engagement", d: "2027-02-12", tm: "18:00", v: "Hotel Lakeview" },
      { k: "haldi", d: "2027-02-13", tm: "10:00", v: "Family residence" },
      { k: "mehndi", d: "2027-02-13", tm: "15:00", v: "Family residence" },
      { k: "sangeet", d: "2027-02-13", tm: "19:00", v: "Palace lawns" },
      { k: "wedding", d: "2027-02-14", tm: "19:00", v: "The Leela Palace" },
    ] };
  }
  if (TEMPLATES[qs.get("t")]) data.t = qs.get("t");
  if (LANGS[qs.get("l")]) data.l = qs.get("l");
  if (!TEMPLATES[data.t]) data.t = "royal";
  if (!LANGS[data.l]) data.l = "en";
  data.e = Array.isArray(data.e) ? data.e : [];
  const uid = () => Math.random().toString(36).slice(2, 8);
  data.e.forEach((ev) => { if (!ev.id) ev.id = uid(); });
  data.vs = Array.isArray(data.vs) ? data.vs : [];       // guest versions: { id, n: name, x: [excluded event ids] }
  if (data.av !== "all" && !data.vs.some((v) => v.id === data.av)) data.av = "all";

  /* ---------- guest versions ---------- */
  const version = (id = data.av) => data.vs.find((v) => v.id === id) || null;
  const versionName = (v) => (v ? v.n || t(uiLang, "ver_new") : t(uiLang, "ver_all"));
  /* What a guest of this version receives: only its ceremonies, no editor-only fields. */
  function publicData(v = version()) {
    const { vs, av, e, ...rest } = data;
    return { ...rest, e: e.filter((ev) => !v || !v.x.includes(ev.id)).map(({ id, ...ev }) => ev) };
  }
  const linkFor = (v) => inviteUrl(publicData(v));
  const waFor = (v) => { const pd = publicData(v); return `https://wa.me/?text=${encodeURIComponent(`${nameOrder(pd)[0] || ""} & ${nameOrder(pd)[1] || ""}\n${linkFor(v)}`)}`; };

  fillLangSelect(uiSelect, uiLang);
  fillLangSelect(langSelect, data.l);

  /* ---------- design swatches ---------- */
  function renderSwatches() {
    $("swatches").innerHTML = Object.entries(TEMPLATES).map(([id, p]) => `
      <button type="button" class="swatch" data-tpl="${id}" aria-pressed="${id === data.t}">
        <span class="chip" style="background:linear-gradient(160deg, ${p.bg}, ${p.bg2}); --chip-accent:${p.accent}"><i></i></span>
        <span>${p.name}</span>
      </button>`).join("");
  }
  $("swatches").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tpl]");
    if (!b || b.dataset.tpl === data.t) return;
    data.t = b.dataset.tpl;
    $("swatches").querySelectorAll(".swatch").forEach((s) => s.setAttribute("aria-pressed", s === b));
    FX.swap(preview, update);
  });

  /* ---------- ceremonies ---------- */
  function eventRow(ev, i) {
    const opts = EVENT_KEYS.map((k) => `<option value="${k}"${ev.k === k ? " selected" : ""}>${esc(t(uiLang, `ev_${k}`))}</option>`).join("")
      + `<option value="custom"${ev.k === "custom" ? " selected" : ""}>${esc(t(uiLang, "ed_custom"))}</option>`;
    return `<div class="event-row" data-i="${i}">
      <select data-f="k" aria-label="${esc(t(uiLang, "ed_event_name"))}">${opts}</select>
      <input type="date" data-f="d" value="${esc(ev.d)}" aria-label="${esc(t(uiLang, "ed_date"))}">
      <input type="time" data-f="tm" value="${esc(ev.tm)}" aria-label="${esc(t(uiLang, "ed_time"))}">
      <div class="row-actions">
        <button type="button" class="link-btn pin${Array.isArray(ev.ll) ? " on" : ""}" data-pin="${i}" aria-label="${esc(t(uiLang, "loc_pick"))}" aria-pressed="${Array.isArray(ev.ll)}">${icon("pin")}</button>
        <button type="button" class="link-btn" data-remove="${i}" aria-label="${esc(t(uiLang, "ed_remove"))}">${icon("trash")}</button>
      </div>
      ${ev.k === "custom" ? `<input class="wide" data-f="n" value="${esc(ev.n)}" placeholder="${esc(t(uiLang, "ed_event_name"))}">` : ""}
      <input class="wide" data-f="v" value="${esc(ev.v)}" placeholder="${esc(t(uiLang, "ed_venue"))}">
    </div>`;
  }
  function renderEvents() {
    eventsBox.innerHTML = data.e.map(eventRow).join("");
    $("events-empty").hidden = data.e.length > 0;
    renderVersions();
  }

  const TICK = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.2l2.3 2.3l4.7-5"/></svg>';
  function countText(v) {
    const n = data.e.filter((ev) => !v.x.includes(ev.id)).length;
    return t(uiLang, "ver_count").replace("{n}", n).replace("{total}", data.e.length);
  }
  function renderVersions() {
    $("versions").innerHTML = data.vs.map((v) => `
      <div class="version${v.id === data.av ? " active" : ""}" data-vid="${v.id}">
        <div class="version-head">
          <input data-vf="n" value="${esc(v.n)}" placeholder="${esc(t(uiLang, "ver_name"))}" aria-label="${esc(t(uiLang, "ver_name"))}" maxlength="60">
          <span class="count">${esc(countText(v))}</span>
          <button type="button" class="link-btn" data-vremove aria-label="${esc(t(uiLang, "ed_remove"))}">${icon("trash")}</button>
        </div>
        <div class="checks">${data.e.map((ev) => `
          <label class="check"><input type="checkbox" data-vev="${ev.id}"${v.x.includes(ev.id) ? "" : " checked"}><span class="tick">${TICK}</span>${esc(eventName(uiLang, ev) || t(uiLang, "ed_event_name"))}</label>`).join("")}
        </div>
        <div class="version-actions">
          <button type="button" class="btn ghost small" data-vshow>${icon("eye")}<span>${esc(t(uiLang, "ver_show"))}</span></button>
          <button type="button" class="btn ghost small" data-vcopy>${icon("link")}<span>${esc(t(uiLang, "ed_copy"))}</span></button>
          <a class="btn small wa" data-vwa target="_blank" rel="noopener" href="${waFor(v)}">${icon("chat")}<span>${esc(t(uiLang, "ed_whatsapp"))}</span></a>
        </div>
      </div>`).join("");
    renderShowing();
  }
  function renderShowing() {
    $("showing").hidden = !data.vs.length;
    $("ver-private").hidden = !data.vs.length;
    $("active-version").innerHTML = [`<option value="all">${esc(t(uiLang, "ver_all"))}</option>`]
      .concat(data.vs.map((v) => `<option value="${v.id}">${esc(versionName(v))}</option>`)).join("");
    $("active-version").value = data.av;
  }
  /* Refresh links and counts without re-rendering (keeps focus while typing). */
  function refreshVersionBits() {
    document.querySelectorAll(".version").forEach((row) => {
      const v = version(row.dataset.vid);
      if (!v) return;
      row.querySelector(".count").textContent = countText(v);
      row.querySelector("[data-vwa]").href = waFor(v);
      row.classList.toggle("active", v.id === data.av);
    });
  }
  function showVersion(id) {
    data.av = id;
    renderShowing();
    refreshVersionBits();
    FX.swap(preview, update);
  }

  function fillForm() {
    for (const el of form.elements) if (el.name && el.name in data) el.value = data[el.name] || "";
    langSelect.value = data.l;
    syncNameOrder();
  }
  /* The name fields follow the card: groom's card shows the groom field first. */
  function syncNameOrder() {
    const [first, second] = $("name-row").children;
    first.style.order = data.o === "g" ? 2 : 0; second.style.order = data.o === "g" ? 0 : 1;
  }

  /* ---------- location pin ---------- */
  if (data.qr === undefined) data.qr = true;
  if (data.o === undefined) data.o = "";
  if (data.f === undefined) data.f = "";
  if (!QR_STYLES[data.qs]) data.qs = "rounded";

  function renderLoc() {
    const on = Array.isArray(data.ll);
    $("loc-status").hidden = !on;
    if (on) {
      $("loc-coords").textContent = `${data.ll[0].toFixed(5)}, ${data.ll[1].toFixed(5)}`;
      $("loc-coords").href = locationUrl("", "", data.ll);
    }
  }
  $("pick-loc").addEventListener("click", () => openMapPicker({
    lang: data.l, ui: uiLang, initial: data.ll || null, query: [data.v, data.a].filter(Boolean).join(", "),
    onPick: (r) => {
      data.ll = r.ll;
      if (!data.v && r.name) data.v = r.name;
      if (!data.a && r.address) data.a = r.address;
      fillForm(); renderLoc(); update();
    },
  }));
  $("unpin").addEventListener("click", () => {
    const old = data.ll;
    delete data.ll;
    renderLoc(); update();
    toast(t(uiLang, "toast_removed"), { action: t(uiLang, "toast_undo"), onAction: () => { data.ll = old; renderLoc(); update(); } });
  });

  /* ---------- QR code ---------- */
  let qrTplShown = null;
  const qrUrl = () => locationUrl(data.v, data.a, data.ll) || "https://www.openstreetmap.org";
  function renderQrStyles() {
    qrTplShown = data.t;
    const box = $("qr-styles");
    box.innerHTML = Object.entries(QR_STYLES).map(([id, st]) => `
      <button type="button" class="qr-style" data-qs="${id}" aria-pressed="${id === data.qs}"><span class="qr-mini"></span><span>${st.name}</span></button>`).join("");
    if (!window.QRCodeStyling) return;
    // Previews encode a short sample so each style's shapes are visible at thumbnail size.
    box.querySelectorAll(".qr-style").forEach((b) => makeQR("https://osm.org", data.t, b.dataset.qs, 128, "svg").append(b.querySelector(".qr-mini")));
  }
  $("qr-styles").addEventListener("click", (e) => {
    const b = e.target.closest("[data-qs]");
    if (!b) return;
    data.qs = b.dataset.qs;
    $("qr-styles").querySelectorAll(".qr-style").forEach((x) => x.setAttribute("aria-pressed", x === b));
    update();
  });
  $("qr-show").addEventListener("input", (e) => { data.qr = e.target.checked; });
  $("qr-dl").addEventListener("click", (e) => {
    const b = e.target.closest("[data-qrfmt]");
    if (!b || !window.QRCodeStyling) return;
    makeQR(qrUrl(), data.t, data.qs, 1024, "svg").download({ name: exportName(data, "x").slice(0, -2) + "-location-qr", extension: b.dataset.qrfmt });
  });

  /* ---------- previews ---------- */
  const video = new InviteVideo($("video-canvas"), data, data.l);
  let view = location.hash === "#video" ? "video" : "card";
  let lastVideoUrl = null;

  function refreshVideo() {
    if (recording) return;
    video.set(publicData(), data.l);
    if (view !== "video") return;
    video.prepare().then(() => { if (FX.reduce) video.still(); else if (!recording) video.play({ loop: true }); });
  }

  function update() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
      const saved = $("saved");
      saved.classList.add("on");
      clearTimeout(saved._t);
      saved._t = setTimeout(() => saved.classList.remove("on"), 1600);
    } catch (_) { /* storage unavailable */ }
    const pd = publicData();
    renderInvite(preview, pd, data.l);
    const url = inviteUrl(pd);
    $("share-url").value = url;
    $("open").href = url;
    $("wa").href = waFor(version());
    refreshVersionBits();
    if (qrTplShown !== data.t) renderQrStyles();
    refreshVideo();
  }

  function setView(v) {
    view = v;
    document.querySelectorAll("[data-view]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.view === v));
    $("card-view").hidden = v !== "card";
    $("video-view").hidden = v !== "video";
    if (v === "video") { refreshVideo(); FX.pop($("video-view")); }
    else { if (!recording) video.stop(); FX.pop($("card-view")); }
  }
  document.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));

  function applyUi() {
    setPageLang(uiLang);
    applyI18n(uiLang);
    renderEvents();
    loadFont(data.l);
    document.querySelector(".jump span").textContent = t(uiLang, "ed_card");
  }

  /* ---------- input handling ---------- */
  form.addEventListener("input", (e) => {
    const el = e.target;
    const vrow = el.closest(".version");
    if (vrow) {
      const v = version(vrow.dataset.vid);
      if (el.dataset.vf === "n") { v.n = el.value; renderShowing(); }
      if (el.dataset.vev) {
        v.x = el.checked ? v.x.filter((id) => id !== el.dataset.vev) : [...new Set([...v.x, el.dataset.vev])];
        if (v.id !== data.av) { showVersion(v.id); return; }
      }
      update();
      return;
    }
    const row = el.closest(".event-row");
    if (row) {
      data.e[row.dataset.i][el.dataset.f] = el.value;
      if (el.dataset.f === "k") renderEvents();
      else if (el.dataset.f === "n") renderVersions();
    } else if (el.name) {
      data[el.name] = el.value;
      if (el.name === "o") syncNameOrder();
      if (el.name === "l") { loadFont(el.value); FX.swap(preview, update); return; }
    }
    update();
  });

  eventsBox.addEventListener("click", (e) => {
    const pin = e.target.closest("[data-pin]");
    if (pin) {
      const ev = data.e[Number(pin.dataset.pin)];
      openMapPicker({
        lang: data.l, ui: uiLang, initial: ev.ll || null, query: ev.v || [data.v, data.a].filter(Boolean).join(", "),
        onPick: (r) => { ev.ll = r.ll; if (!ev.v && r.name) ev.v = r.name; renderEvents(); update(); },
      });
      return;
    }
    const b = e.target.closest("[data-remove]");
    if (!b) return;
    const at = Number(b.dataset.remove);
    const [gone] = data.e.splice(at, 1);
    const hadIn = data.vs.filter((v) => v.x.includes(gone.id)).map((v) => v.id);
    data.vs.forEach((v) => { v.x = v.x.filter((id) => id !== gone.id); });
    renderEvents();
    update();
    toast(`${t(uiLang, "toast_removed")}: ${eventName(uiLang, gone) || t(uiLang, "ed_event_name")}`, {
      action: t(uiLang, "toast_undo"),
      onAction: () => {
        data.e.splice(at, 0, gone);
        data.vs.forEach((v) => { if (hadIn.includes(v.id)) v.x.push(gone.id); });
        renderEvents();
        update();
      },
    });
  });

  $("add-event").addEventListener("click", () => {
    data.e.push({ id: uid(), k: "reception", d: data.d || "", tm: "", v: "" });
    renderEvents();
    update();
    FX.pop(eventsBox.lastElementChild);
  });

  /* version actions */
  $("versions").addEventListener("click", async (e) => {
    const row = e.target.closest(".version");
    if (!row) return;
    const v = version(row.dataset.vid);
    if (e.target.closest("[data-vremove]")) {
      const at = data.vs.indexOf(v);
      const wasActive = data.av === v.id;
      data.vs = data.vs.filter((x) => x !== v);
      if (wasActive) data.av = "all";
      renderVersions();
      update();
      toast(`${t(uiLang, "toast_removed")}: ${versionName(v)}`, {
        action: t(uiLang, "toast_undo"),
        onAction: () => {
          data.vs.splice(at, 0, v);
          if (wasActive) data.av = v.id;
          renderVersions();
          update();
        },
      });
    } else if (e.target.closest("[data-vshow]")) {
      showVersion(v.id);
      if (matchMedia("(max-width: 960px)").matches) $("side").scrollIntoView({ behavior: FX.reduce ? "auto" : "smooth" });
    } else if (e.target.closest("[data-vcopy]")) {
      const btn = e.target.closest("[data-vcopy]");
      try { await navigator.clipboard.writeText(linkFor(v)); } catch (_) { prompt("", linkFor(v)); }
      const label = btn.querySelector("span");
      label.textContent = t(uiLang, "ed_copied");
      announce(t(uiLang, "ed_copied"));
      setTimeout(() => { label.textContent = t(uiLang, "ed_copy"); }, 1800);
    }
  });

  $("add-version").addEventListener("click", () => {
    const v = { id: uid(), n: `${t(uiLang, "ver_new")} ${data.vs.length + 1}`, x: [] };
    data.vs.push(v);
    data.av = v.id;
    renderVersions();
    update();
    const row = $("versions").lastElementChild;
    FX.pop(row);
    const input = row.querySelector('[data-vf="n"]');
    input.focus();
    input.select();
  });

  $("active-version").addEventListener("change", (e) => showVersion(e.target.value));

  uiSelect.addEventListener("change", () => { uiLang = uiSelect.value; rememberLang(uiLang); applyUi(); });

  /* ---------- sharing ---------- */
  $("copy").addEventListener("click", async (e) => {
    const input = $("share-url");
    try { await navigator.clipboard.writeText(input.value); } catch (_) { input.select(); document.execCommand("copy"); }
    const label = e.currentTarget.querySelector("span");
    label.textContent = t(uiLang, "ed_copied");
    announce(t(uiLang, "ed_copied"));
    setTimeout(() => { label.textContent = t(uiLang, "ed_copy"); }, 1800);
  });

  /* phone: validate when the field is left, not on every keystroke */
  const phone = form.elements.p;
  const phoneOk = (v) => !v || /^\+?\d[\d\s-]{8,15}$/.test(v.trim()) && v.replace(/\D/g, "").length >= 10;
  phone.addEventListener("blur", () => {
    const bad = !phoneOk(phone.value);
    phone.setAttribute("aria-invalid", bad);
    $("p-err").hidden = !bad;
  });
  phone.addEventListener("input", () => {
    if (phone.getAttribute("aria-invalid") === "true" && phoneOk(phone.value)) { phone.setAttribute("aria-invalid", "false"); $("p-err").hidden = true; }
  });

  const fileBase = () => exportName(data, "x", version() ? versionName(version()) : "").slice(0, -2);

  bindDownloads($("downloads"), () => ({ data: publicData(), lang: data.l, label: version() ? versionName(version()) : "" }), {
    uiLang: () => uiLang,
    onVideo: () => { setView("video"); $("side").scrollIntoView({ behavior: FX.reduce ? "auto" : "smooth", block: "start" }); FX.pop($("make-video")); },
  });

  /* ---------- video export ---------- */
  let recording = false;
  let lastVideo = null;
  if (!pickVideoMime()) {
    $("make-video").disabled = true;
    $("video-note").dataset.i18n = "ed_video_unsupported";
  }

  $("make-video").addEventListener("click", async () => {
    if (recording) return;
    recording = true;
    const btn = $("make-video");
    const label = btn.querySelector("span");
    btn.disabled = true;
    label.textContent = t(uiLang, "ed_video_making");
    $("video-result").hidden = true;
    $("progress").hidden = false;
    const bar = $("progress").firstElementChild;
    try {
      video.set(publicData(), data.l);
      lastVideo = await video.record({ music: $("music").checked, onProgress: (p) => { bar.style.width = `${Math.round(p * 100)}%`; } });
      if (lastVideoUrl) URL.revokeObjectURL(lastVideoUrl);
      lastVideoUrl = URL.createObjectURL(lastVideo.blob);
      const dl = $("video-download");
      dl.href = lastVideoUrl;
      dl.download = `${fileBase()}.${lastVideo.ext}`;
      const file = new File([lastVideo.blob], dl.download, { type: lastVideo.mime });
      $("video-share").hidden = !(navigator.canShare && navigator.canShare({ files: [file] }));
      $("video-share").onclick = () => navigator.share({ files: [file], title: nameOrder(data).join(" & ") }).catch(() => {});
      $("video-result").hidden = false;
      FX.pop($("video-result"));
      label.textContent = t(uiLang, "ed_video_ready");
      announce(t(uiLang, "ed_video_ready"));
    } catch (err) {
      $("video-note").textContent = t(uiLang, "ed_video_unsupported");
      label.textContent = t(uiLang, "ed_video");
    } finally {
      recording = false;
      btn.disabled = false;
      setTimeout(() => { $("progress").hidden = true; bar.style.width = "0"; label.textContent = t(uiLang, "ed_video"); }, 2500);
      if (view === "video" && !FX.reduce) video.play({ loop: true });
    }
  });


  /* ---------- steps: one part of the form at a time; the preview stays beside it ---------- */
  const steps = [...document.querySelectorAll("#stepper button")];
  const groups = [...form.querySelectorAll("[data-step]")];
  let step = 1;
  function goStep(n, scroll) {
    step = Math.min(4, Math.max(1, n));
    groups.forEach((g) => g.classList.toggle("step-off", Number(g.dataset.step) !== step));
    steps.forEach((b, i) => {
      b.classList.toggle("done", i + 1 < step);
      if (i + 1 === step) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
    });
    $("step-back").hidden = step === 1;
    $("step-next").hidden = step === 4;
    if (scroll) form.scrollIntoView({ behavior: FX.reduce ? "auto" : "smooth", block: "start" });
  }
  $("stepper").addEventListener("click", (e) => { const b = e.target.closest("[data-go]"); if (b) goStep(Number(b.dataset.go), true); });
  $("step-next").addEventListener("click", () => goStep(step + 1, true));
  $("step-back").addEventListener("click", () => goStep(step - 1, true));
  goStep(1);

  renderSwatches();
  $("qr-show").checked = data.qr !== false;
  renderLoc();
  fillForm();
  applyUi();
  update();
  setView(view);
})();
