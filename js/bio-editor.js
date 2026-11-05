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

  /* ---------- form sections, generated from BIO_SECTIONS ---------- */
  const inputType = { date: "date", time: "time", tel: "tel", email: "email" };
  $("sections").innerHTML = BIO_SECTIONS.map((s) => `
    <section class="group">
      <h2 data-i18n="bio_sec_${s.id}"></h2>
      <div class="row">${s.f.filter(([, ty]) => ty !== "text").map(([k, ty]) => `
        <label class="field"><span data-i18n="bio_f_${k}"></span><input name="${k}" type="${inputType[ty] || "text"}" maxlength="120"${ty === "tel" ? ' inputmode="tel" autocomplete="tel"' : ""}${ty === "email" ? ' autocomplete="email"' : ""}></label>`).join("")}
      </div>
      ${s.f.filter(([, ty]) => ty === "text").map(([k]) => `
        <label class="field"><span data-i18n="bio_f_${k}"></span><textarea name="${k}" rows="2" maxlength="400"></textarea></label>`).join("")}
    </section>`).join("");

  function fillForm() {
    [...form.elements].forEach((el) => { if (el.name && el.name in data && el.type !== "file") el.value = data[el.name] || ""; });
    if (!data.l) $("bio-lang").value = "en";
  }

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
  }
  uiSelect.addEventListener("change", () => {
    uiLang = uiSelect.value;
    rememberLang(uiLang);
    applyUi();
  });

  fillForm();
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
