/* Biodata builder: form <-> data <-> live card, sharing and downloads.
 * Opening biodata.html#d=… shows the shared, read-only view instead.
 */
(function () {
  hydrateIcons();
  const $ = (id) => document.getElementById(id);
  const DRAFT_KEY = "biodata-draft";
  const uiSelect = $("ui-lang");
  let uiLang = preferredLang();

  const shared = decodeInvite(new URLSearchParams(location.hash.slice(1)).get("d") || "");
  if (shared && typeof shared === "object") { showShared(shared); return; }

  let data;
  try { data = JSON.parse(localStorage.getItem(DRAFT_KEY)); } catch (_) { data = null; }
  if (!data || typeof data !== "object") data = { ...BIO_SAMPLE, l: uiLang };
  if (!TEMPLATES[data.t]) data.t = "ivory";
  if (!LANGS[data.l]) data.l = "en";

  const form = $("form");
  fillLangSelect(uiSelect, uiLang);
  fillLangSelect($("bio-lang"), data.l);

  /* ---------- form sections, generated from the layout (add / delete / reorder) ---------- */
  const inputType = { date: "date", time: "time", tel: "tel", email: "email" };
  const ctl = (act, label, glyph) => `<button type="button" class="mini" data-act="${act}" aria-label="${esc(label)}" title="${esc(label)}">${glyph}</button>`;
  const fieldHtml = (k) => {
    const ty = BIO_TYPES[k] || "text";
    const label = esc(bioFieldLabel(data, uiLang, k));
    const control = ty === "text"
      ? `<textarea name="${k}" rows="2" maxlength="400" aria-label="${label}"></textarea>`
      : `<input name="${k}" type="${inputType[ty] || "text"}" maxlength="120" aria-label="${label}"${ty === "tel" ? ' inputmode="tel" autocomplete="tel"' : ""}${ty === "email" ? ' autocomplete="email"' : ""}>`;
    return `<div class="field bio-field${ty === "text" ? " wide" : ""}" data-k="${k}">
      <div class="bf-top"><span>${label}</span><span class="ctl">${ctl("up", t(uiLang, "bio_move_up"), "↑")}${ctl("down", t(uiLang, "bio_move_down"), "↓")}${ctl("del", t(uiLang, "bio_remove"), "✕")}</span></div>
      ${control}</div>`;
  };

  function renderSections() {
    const lay = bioLayout(data);
    const present = new Set(lay.flatMap((s) => s.f));
    const missing = Object.keys(BIO_TYPES).filter((k) => !present.has(k));
    $("sections").innerHTML = lay.map((s) => `
      <section class="group" data-s="${s.i}">
        <div class="sec-head"><h2>${esc(bioSectionTitle(s, uiLang))}</h2><span class="ctl">${ctl("sup", t(uiLang, "bio_move_up"), "↑")}${ctl("sdown", t(uiLang, "bio_move_down"), "↓")}${ctl("sdel", t(uiLang, "bio_remove_section"), "✕")}</span></div>
        <div class="row">${s.f.map(fieldHtml).join("")}</div>
        <select class="add-field" aria-label="${esc(t(uiLang, "bio_add_field"))}">
          <option value="">+ ${esc(t(uiLang, "bio_add_field"))}</option>
          ${missing.map((k) => `<option value="${k}">${esc(t(uiLang, `bio_f_${k}`))}</option>`).join("")}
          <option value="__custom">${esc(t(uiLang, "bio_custom_field"))}</option>
        </select>
      </section>`).join("") + `
      <div class="lay-actions">
        <button type="button" class="btn ghost small" data-act="addsec">+ ${esc(t(uiLang, "bio_add_section"))}</button>
        ${Array.isArray(data.lay) ? `<button type="button" class="link-btn" data-act="reset">${esc(t(uiLang, "bio_reset_layout"))}</button>` : ""}
      </div>`;
    fillForm();
  }

  function fillForm() {
    [...form.elements].forEach((el) => { if (el.name && el.name in data && el.type !== "file") el.value = data[el.name] || ""; });
    if (!data.l) $("bio-lang").value = "en";
  }

  /* Apply a change to a copy of the layout, then redraw, keep focus and refresh the preview. */
  function editLayout(fn, focus) {
    const lay = bioLayout(data).map((s) => ({ ...s, f: [...s.f] }));
    fn(lay);
    data.lay = lay;
    renderSections();
    update();
    const el = focus && $("sections").querySelector(focus);
    if (el) el.focus();
  }
  const nextId = (prefix, taken) => { let n = 1; while (taken.has(prefix + n)) n++; return prefix + n; };

  $("sections").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-act]");
    if (!b) return;
    const act = b.dataset.act;
    const fieldEl = b.closest("[data-k]");
    const secEl = b.closest("[data-s]");
    const k = fieldEl && fieldEl.dataset.k;
    const sid = secEl && secEl.dataset.s;
    if (act === "reset") { delete data.lay; delete data.cl; renderSections(); update(); return; }
    if (act === "addsec") {
      const title = (prompt(t(uiLang, "bio_section_prompt")) || "").trim().slice(0, 60);
      if (!title) return;
      editLayout((lay) => { lay.push({ i: nextId("s", new Set(lay.map((s) => s.i))), ti: title, f: [] }); });
      return;
    }
    if (["sup", "sdown", "sdel"].includes(act)) {
      editLayout((lay) => {
        const i = lay.findIndex((s) => s.i === sid);
        if (act === "sdel") { lay.splice(i, 1); return; }
        const j = act === "sup" ? i - 1 : i + 1;
        if (j >= 0 && j < lay.length) [lay[i], lay[j]] = [lay[j], lay[i]];
      }, `[data-s="${sid}"] [data-act="${act}"]`);
      return;
    }
    // Field actions. "Up" on the first field moves it to the end of the previous section, and so on.
    let focus = `[data-k="${k}"] [data-act="${act}"]`;
    editLayout((lay) => {
      const si = lay.findIndex((s) => s.i === sid);
      const fi = lay[si].f.indexOf(k);
      if (act === "del") {
        lay[si].f.splice(fi, 1);
        if (!has(BIO_TYPES, k)) { delete data[k]; if (data.cl) delete data.cl[k]; }
        focus = null;
      } else if (act === "up") {
        if (fi > 0) [lay[si].f[fi], lay[si].f[fi - 1]] = [lay[si].f[fi - 1], lay[si].f[fi]];
        else if (si > 0) { lay[si].f.splice(fi, 1); lay[si - 1].f.push(k); }
      } else if (act === "down") {
        if (fi < lay[si].f.length - 1) [lay[si].f[fi], lay[si].f[fi + 1]] = [lay[si].f[fi + 1], lay[si].f[fi]];
        else if (si < lay.length - 1) { lay[si].f.splice(fi, 1); lay[si + 1].f.unshift(k); }
      }
    }, null);
    const el = focus && $("sections").querySelector(focus);
    if (el) el.focus();
  });

  $("sections").addEventListener("change", (e) => {
    const sel = e.target.closest("select.add-field");
    if (!sel || !sel.value) return;
    const sid = sel.closest("[data-s]").dataset.s;
    let key = sel.value;
    let label = "";
    if (key === "__custom") {
      label = (prompt(t(uiLang, "bio_field_prompt")) || "").trim().slice(0, 60);
      if (!label) { sel.value = ""; return; }
    }
    editLayout((lay) => {
      if (key === "__custom") {
        key = nextId("x", new Set([...Object.keys(data.cl || {}), ...lay.flatMap((s) => s.f)]));
        data.cl = { ...(data.cl || {}), [key]: label };
      }
      lay.find((s) => s.i === sid).f.push(key);
    }, null);
    const el = $("sections").querySelector(`[name="${key}"]`);
    if (el) el.focus();
  });

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
    FX.swap($("preview"), update);
  });

  /* ---------- photo: downscaled, kept on this device only ---------- */
  function showPhoto() {
    $("photo-thumb").hidden = !data.photo;
    $("photo-remove").hidden = !data.photo;
    if (data.photo) $("photo-thumb").src = data.photo;
  }
  $("photo").addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const W = 360, H = 450; // 4:5, cropped to fill
      const c = document.createElement("canvas");
      c.width = W; c.height = H;
      const s = Math.max(W / img.width, H / img.height);
      const w = img.width * s, h = img.height * s;
      c.getContext("2d").drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
      data.photo = c.toDataURL("image/jpeg", 0.85);
      URL.revokeObjectURL(url);
      showPhoto();
      update();
    };
    img.src = url;
    e.target.value = "";
  });
  $("photo-remove").addEventListener("click", () => { delete data.photo; showPhoto(); update(); });

  /* ---------- live preview, saving, sharing ---------- */
  let saveTimer;
  function update() {
    renderBiodata($("preview"), data, data.l);
    const url = bioUrl(data);
    $("share-url").value = url;
    $("open").href = url;
    $("wa").href = `https://wa.me/?text=${encodeURIComponent(`${t(data.l, "bio_share_text")} ${data.n || ""}\n${url}`)}`;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
      } catch (_) {
        // Storage full (large photo): keep the text fields at least.
        try { const { photo, ...rest } = data; localStorage.setItem(DRAFT_KEY, JSON.stringify(rest)); } catch (__) { return; }
      }
      const saved = $("saved");
      saved.classList.add("on");
      clearTimeout(saved._t);
      saved._t = setTimeout(() => saved.classList.remove("on"), 1600);
    }, 400);
  }

  form.addEventListener("input", (e) => {
    const el = e.target;
    if (!el.name || el.type === "file") return;
    data[el.name] = el.value.trim();
    if (el.name === "l") FX.swap($("preview"), update); else update();
  });

  $("copy").addEventListener("click", async (e) => {
    const input = $("share-url");
    try { await navigator.clipboard.writeText(input.value); } catch (_) { input.select(); document.execCommand("copy"); }
    const label = e.currentTarget.querySelector("span");
    label.textContent = t(uiLang, "ed_copied");
    announce(t(uiLang, "ed_copied"));
    setTimeout(() => { label.textContent = t(uiLang, "ed_copy"); }, 1800);
  });

  bindBioDownloads($("downloads"), () => data);

  function applyUi() {
    setPageLang(uiLang);
    applyI18n(uiLang);
    renderSections();
  }
  uiSelect.addEventListener("change", () => {
    uiLang = uiSelect.value;
    rememberLang(uiLang);
    applyUi();
  });

  renderSwatches();
  showPhoto();
  applyUi();
  update();

  /* ---------- shared, read-only view ---------- */
  function showShared(d) {
    const bio = bioPublic(d);
    if (!TEMPLATES[bio.t]) bio.t = "ivory";
    const lang = LANGS[bio.l] ? bio.l : "en";
    $("main").remove();
    document.querySelector(".jump") && document.querySelector(".jump").remove();
    $("view").hidden = false;
    $("view").id = "main";
    fillLangSelect(uiSelect, lang);
    const render = (l) => {
      setPageLang(l);
      applyI18n(l);
      renderBiodata($("view-card"), bio, l);
      if (bio.n) document.title = `${t(l, "bio_kicker")} · ${bio.n}`;
    };
    let cur = lang;
    uiSelect.addEventListener("change", () => { cur = uiSelect.value; FX.swap($("view-card"), () => render(cur)); });
    bindBioDownloads($("view-dl"), () => ({ ...bio, l: cur }));
    render(cur);
    FX.pop($("view-card"));
  }

  function bindBioDownloads(root, getData) {
    root.addEventListener("click", async (e) => {
      const b = e.target.closest("button[data-bfmt]");
      if (!b || b.disabled) return;
      const label = b.querySelector("span");
      const prev = label.textContent;
      root.querySelectorAll("button[data-bfmt]").forEach((x) => { x.disabled = true; });
      label.textContent = t(uiLang, "dl_working");
      try {
        const d = getData();
        await exportBiodata(b.dataset.bfmt, d, d.l || "en");
      } catch (err) {
        console.error(err);
      } finally {
        label.textContent = prev;
        root.querySelectorAll("button[data-bfmt]").forEach((x) => { x.disabled = false; });
      }
    });
  }
})();
