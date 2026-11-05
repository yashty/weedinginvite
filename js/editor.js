/* Invitation editor: form <-> data <-> live preview + share link. */
(function () {
  const form = document.getElementById("form");
  const uiSelect = document.getElementById("ui-lang");
  const langSelect = document.getElementById("inv-lang");
  const tplSelect = document.getElementById("inv-tpl");
  const eventsBox = document.getElementById("events");
  const preview = document.getElementById("preview");
  const DRAFT_KEY = "invite-draft";

  const qs = new URLSearchParams(location.search);
  let uiLang = LANGS[qs.get("l")] ? qs.get("l") : preferredLang();

  let data;
  try { data = JSON.parse(localStorage.getItem(DRAFT_KEY)); } catch (_) { data = null; }
  if (!data || typeof data !== "object") data = { ...SAMPLE, l: uiLang, e: SAMPLE.e.map((e) => ({ ...e })) };
  if (TEMPLATES[qs.get("t")]) data.t = qs.get("t");
  if (LANGS[qs.get("l")]) data.l = qs.get("l");
  data.e = Array.isArray(data.e) ? data.e : [];

  fillLangSelect(uiSelect, uiLang);
  fillLangSelect(langSelect, data.l);
  tplSelect.innerHTML = Object.entries(TEMPLATES).map(([id, x]) => `<option value="${id}">${x.name}</option>`).join("");

  function eventRow(ev, i) {
    const opts = EVENT_KEYS.map((k) => `<option value="${k}"${ev.k === k ? " selected" : ""}>${esc(t(uiLang, `ev_${k}`))}</option>`).join("")
      + `<option value="custom"${ev.k === "custom" ? " selected" : ""}>${esc(t(uiLang, "ed_custom"))}</option>`;
    return `<div class="event-row" data-i="${i}">
      <select data-f="k" aria-label="${esc(t(uiLang, "ed_event_name"))}">${opts}</select>
      ${ev.k === "custom" ? `<input data-f="n" value="${esc(ev.n)}" placeholder="${esc(t(uiLang, "ed_event_name"))}">` : ""}
      <input type="date" data-f="d" value="${esc(ev.d)}">
      <input type="time" data-f="tm" value="${esc(ev.tm)}">
      <input data-f="v" value="${esc(ev.v)}" placeholder="${esc(t(uiLang, "ed_venue"))}">
      <button type="button" class="link-btn" data-remove="${i}">${esc(t(uiLang, "ed_remove"))}</button>
    </div>`;
  }

  function renderEvents() { eventsBox.innerHTML = data.e.map(eventRow).join(""); }

  function fillForm() {
    for (const el of form.elements) if (el.name && el.name in data) el.value = data[el.name] || "";
    tplSelect.value = data.t;
    langSelect.value = data.l;
  }

  function update() {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch (_) { /* ignore */ }
    renderInvite(preview, data, data.l);
    const url = inviteUrl(data);
    document.getElementById("share-url").value = url;
    document.getElementById("open").href = url;
    const msg = `${data.b || ""} & ${data.g || ""}\n${url}`;
    document.getElementById("wa").href = `https://wa.me/?text=${encodeURIComponent(msg)}`;
  }

  function applyUi() {
    setPageLang(uiLang);
    applyI18n(uiLang);
    renderEvents();
    loadFont(data.l);
  }

  form.addEventListener("input", (e) => {
    const el = e.target;
    const row = el.closest(".event-row");
    if (row) {
      const ev = data.e[row.dataset.i];
      ev[el.dataset.f] = el.value;
      if (el.dataset.f === "k") renderEvents();
    } else if (el.name) {
      data[el.name] = el.value;
      if (el.name === "l") loadFont(el.value);
    }
    update();
  });

  eventsBox.addEventListener("click", (e) => {
    const i = e.target.dataset.remove;
    if (i === undefined) return;
    data.e.splice(Number(i), 1);
    renderEvents();
    update();
  });

  document.getElementById("add-event").addEventListener("click", () => {
    data.e.push({ k: "reception", d: data.d || "", tm: "", v: "" });
    renderEvents();
    update();
  });

  uiSelect.addEventListener("change", () => { uiLang = uiSelect.value; rememberLang(uiLang); applyUi(); });

  document.getElementById("copy").addEventListener("click", async (e) => {
    const input = document.getElementById("share-url");
    try { await navigator.clipboard.writeText(input.value); } catch (_) { input.select(); document.execCommand("copy"); }
    e.target.textContent = t(uiLang, "ed_copied");
    setTimeout(() => { e.target.textContent = t(uiLang, "ed_copy"); }, 1800);
  });

  document.getElementById("download").addEventListener("click", async () => {
    if (!window.html2canvas) return;
    await document.fonts.ready;
    const canvas = await html2canvas(preview, { scale: 2, backgroundColor: null, useCORS: true });
    const a = document.createElement("a");
    a.download = `invitation-${(data.b || "bride")}-${(data.g || "groom")}.png`.replace(/\s+/g, "-");
    a.href = canvas.toDataURL("image/png");
    a.click();
  });

  fillForm();
  applyUi();
  update();
})();
