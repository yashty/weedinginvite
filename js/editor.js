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
  if (!data || typeof data !== "object") data = { ...SAMPLE, l: uiLang, e: SAMPLE.e.map((e) => ({ ...e })) };
  if (TEMPLATES[qs.get("t")]) data.t = qs.get("t");
  if (LANGS[qs.get("l")]) data.l = qs.get("l");
  if (!TEMPLATES[data.t]) data.t = "royal";
  if (!LANGS[data.l]) data.l = "en";
  data.e = Array.isArray(data.e) ? data.e : [];

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
  function renderEvents() { eventsBox.innerHTML = data.e.map(eventRow).join(""); }

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
    video.set({ ...data }, data.l);
    if (view !== "video") return;
    video.prepare().then(() => { if (FX.reduce) video.still(); else if (!recording) video.play({ loop: true }); });
  }

  function update() {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch (_) { /* storage unavailable */ }
    renderInvite(preview, data, data.l);
    const url = inviteUrl(data);
    $("share-url").value = url;
    $("open").href = url;
    $("wa").href = `https://wa.me/?text=${encodeURIComponent(`${data.b || ""} & ${data.g || ""}\n${url}`)}`;
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
    const row = el.closest(".event-row");
    if (row) {
      data.e[row.dataset.i][el.dataset.f] = el.value;
      if (el.dataset.f === "k") renderEvents();
    } else if (el.name) {
      data[el.name] = el.value;
      if (el.name === "l") { loadFont(el.value); FX.swap(preview, update); return; }
    }
    update();
  });

  eventsBox.addEventListener("click", (e) => {
    const b = e.target.closest("[data-remove]");
    if (!b) return;
    data.e.splice(Number(b.dataset.remove), 1);
    renderEvents();
    update();
  });

  $("add-event").addEventListener("click", () => {
    data.e.push({ k: "reception", d: data.d || "", tm: "", v: "" });
    renderEvents();
    update();
    FX.pop(eventsBox.lastElementChild);
  });

  uiSelect.addEventListener("change", () => { uiLang = uiSelect.value; rememberLang(uiLang); applyUi(); });

  /* ---------- sharing ---------- */
  $("copy").addEventListener("click", async (e) => {
    const input = $("share-url");
    try { await navigator.clipboard.writeText(input.value); } catch (_) { input.select(); document.execCommand("copy"); }
    const label = e.currentTarget.querySelector("span");
    label.textContent = t(uiLang, "ed_copied");
    setTimeout(() => { label.textContent = t(uiLang, "ed_copy"); }, 1800);
  });

  const fileBase = () => `invitation-${data.b || "bride"}-${data.g || "groom"}`.replace(/\s+/g, "-");

  bindDownloads($("downloads"), () => ({ data: { ...data }, lang: data.l }), {
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
      video.set({ ...data }, data.l);
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
