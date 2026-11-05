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
  const waFor = (v) => { const pd = publicData(v); return `https://wa.me/?text=${encodeURIComponent(`${pd.b || ""} & ${pd.g || ""}\n${linkFor(v)}`)}`; };

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
      <button type="button" class="link-btn" data-remove="${i}" aria-label="${esc(t(uiLang, "ed_remove"))}">${icon("trash")}</button>
      ${ev.k === "custom" ? `<input class="wide" data-f="n" value="${esc(ev.n)}" placeholder="${esc(t(uiLang, "ed_event_name"))}">` : ""}
      <input class="wide" data-f="v" value="${esc(ev.v)}" placeholder="${esc(t(uiLang, "ed_venue"))}">
    </div>`;
  }
  function renderEvents() { eventsBox.innerHTML = data.e.map(eventRow).join(""); renderVersions(); }

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
  }

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
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch (_) { /* storage unavailable */ }
    const pd = publicData();
    renderInvite(preview, pd, data.l);
    const url = inviteUrl(pd);
    $("share-url").value = url;
    $("open").href = url;
    $("wa").href = waFor(version());
    refreshVersionBits();
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
      if (el.name === "l") { loadFont(el.value); FX.swap(preview, update); return; }
    }
    update();
  });

  eventsBox.addEventListener("click", (e) => {
    const b = e.target.closest("[data-remove]");
    if (!b) return;
    const [gone] = data.e.splice(Number(b.dataset.remove), 1);
    data.vs.forEach((v) => { v.x = v.x.filter((id) => id !== gone.id); });
    renderEvents();
    update();
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
      data.vs = data.vs.filter((x) => x !== v);
      if (data.av === v.id) data.av = "all";
      renderVersions();
      update();
    } else if (e.target.closest("[data-vshow]")) {
      showVersion(v.id);
      if (matchMedia("(max-width: 960px)").matches) $("side").scrollIntoView({ behavior: FX.reduce ? "auto" : "smooth" });
    } else if (e.target.closest("[data-vcopy]")) {
      const btn = e.target.closest("[data-vcopy]");
      try { await navigator.clipboard.writeText(linkFor(v)); } catch (_) { prompt("", linkFor(v)); }
      const label = btn.querySelector("span");
      label.textContent = t(uiLang, "ed_copied");
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
    setTimeout(() => { label.textContent = t(uiLang, "ed_copy"); }, 1800);
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
      $("video-share").onclick = () => navigator.share({ files: [file], title: `${data.b} & ${data.g}` }).catch(() => {});
      $("video-result").hidden = false;
      FX.pop($("video-result"));
      label.textContent = t(uiLang, "ed_video_ready");
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

  renderSwatches();
  fillForm();
  applyUi();
  update();
  setView(view);
})();
