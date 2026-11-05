/* Matrimonial biodata: data model, sections and card rendering.
 * Uses the invitation templates' palettes (applyPalette) so a biodata can match its invitation.
 * Field keys are short because the whole biodata travels in the share link.
 */

const BIO_SECTIONS = [
  { id: "personal",  icon: "user",    f: [["dob", "date"], ["tob", "time"], ["pob"], ["ht"], ["rel"], ["cs"], ["mt"]] },
  { id: "horoscope", icon: "star",    f: [["ra"], ["nk"], ["go"], ["mg"]] },
  { id: "education", icon: "cap",     f: [["ed"], ["oc"], ["co"], ["inc"], ["wl"]] },
  { id: "family",    icon: "family",  f: [["fa"], ["fo"], ["mo"], ["moo"], ["sib", "text"], ["ft"], ["np"]] },
  { id: "about",     icon: "heart",   f: [["ab", "text"], ["ex", "text"]] },
  { id: "contact",   icon: "contact", f: [["cp"], ["ph", "tel"], ["em", "email"], ["ad", "text"]] },
];

const BIO_SAMPLE = {
  t: "ivory", l: "en",
  inv: "",
  n: "Ananya Sharma", tg: "Software engineer · Bengaluru",
  dob: "1997-08-21", tob: "06:40", pob: "Jaipur, Rajasthan", ht: "5′ 5″", rel: "Hindu", cs: "Brahmin", mt: "Hindi",
  ra: "Simha (Leo)", nk: "Magha", go: "Bharadwaj", mg: "No",
  ed: "B.Tech, IIT Delhi", oc: "Senior software engineer", co: "A product company", inc: "", wl: "Bengaluru",
  fa: "Rajesh Sharma", fo: "Retired bank manager", mo: "Meera Sharma", moo: "School principal",
  sib: "One younger brother, studying medicine", ft: "Nuclear, values-driven", np: "Jaipur",
  ab: "Warm, curious and close to family. Enjoys Hindustani music, long walks and cooking for friends.",
  ex: "",
  cp: "Rajesh Sharma (father)", ph: "+91 98765 43210", em: "", ad: "",
};

const BIO_TYPES = {};
BIO_SECTIONS.forEach((s) => s.f.forEach(([k, ty]) => { BIO_TYPES[k] = ty || "line"; }));
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

/* The layout is data.lay: [{ i: section id, ti: title (custom sections), f: [field keys] }].
 * Built-in fields use their own keys; custom fields are "x1", "x2"… with labels in data.cl.
 * Without data.lay the default order is used. Anything unknown is dropped, since links are untrusted. */
function bioDefaultLayout() {
  return BIO_SECTIONS.map((s) => ({ i: s.id, f: s.f.map(([k]) => k) }));
}

function bioLayout(data) {
  if (!Array.isArray(data.lay)) return bioDefaultLayout();
  const cl = data.cl && typeof data.cl === "object" ? data.cl : {};
  const used = new Set();
  const seen = new Set();
  const out = [];
  data.lay.slice(0, 30).forEach((s) => {
    if (!s || typeof s !== "object") return;
    const id = String(s.i || "");
    const builtin = BIO_SECTIONS.some((b) => b.id === id);
    const ti = typeof s.ti === "string" ? s.ti.slice(0, 60) : "";
    if (seen.has(id) || (!builtin && !(/^s\d+$/.test(id) && ti))) return;
    seen.add(id);
    const f = (Array.isArray(s.f) ? s.f : []).slice(0, 60).filter((k) => {
      const ok = typeof k === "string" && !used.has(k) &&
        (has(BIO_TYPES, k) || (/^x\d+$/.test(k) && has(cl, k) && typeof cl[k] === "string" && cl[k]));
      if (ok) used.add(k);
      return ok;
    });
    out.push(builtin ? { i: id, f } : { i: id, ti, f });
  });
  return out;
}

function bioFieldLabel(data, lang, k) {
  return has(BIO_TYPES, k) ? t(lang, `bio_f_${k}`) : String((data.cl && data.cl[k]) || "");
}

function bioSectionTitle(sec, lang) {
  return sec.ti || t(lang, `bio_sec_${sec.i}`);
}

/* Only what belongs in a shared link: no photo, no unknown keys, no blanks, no removed fields. */
function bioPublic(data) {
  const out = {};
  ["t", "l", "inv", "n", "tg"].forEach((k) => { if (data[k]) out[k] = String(data[k]); });
  const lay = bioLayout(data);
  const cl = {};
  lay.forEach((s) => s.f.forEach((k) => {
    if (data[k]) out[k] = String(data[k]).slice(0, 400);
    if (!has(BIO_TYPES, k)) cl[k] = String(data.cl[k]).slice(0, 60);
  }));
  if (Array.isArray(data.lay)) {
    out.lay = lay;
    if (Object.keys(cl).length) out.cl = cl;
  }
  return out;
}

function bioUrl(data) {
  const base = location.href.replace(/[^/]*([?#].*)?$/, "");
  return `${base}biodata.html#d=${encodeInvite(bioPublic(data))}`;
}

function bioValue(lang, key, type, v) {
  if (type === "date") {
    const d = new Date(`${v}T00:00:00`);
    if (isNaN(d)) return v;
    try { return new Intl.DateTimeFormat(LANGS[lang].locale, { day: "numeric", month: "long", year: "numeric" }).format(d); } catch (_) { return v; }
  }
  if (type === "time") return fmtTime(lang, v);
  return v;
}

/* Render the biodata card into `el`. */
function renderBiodata(el, data, lang = data.l || "en") {
  if (!LANGS[lang]) lang = "en";
  const L = (k) => esc(t(lang, k));
  const p = tpl(data.t);
  loadFont(lang);
  el.className = "biodata";
  el.lang = lang;
  el.dir = LANGS[lang].dir;
  el.style.setProperty("--script-font", `"${LANGS[lang].font}"`);
  applyPalette(el, data.t);

  const sections = bioLayout(data).map((s) => {
    const rows = s.f.filter((k) => data[k]).map((k) => {
      const type = BIO_TYPES[k] || "text";
      const val = esc(bioValue(lang, k, type, data[k]));
      return `<dt>${esc(bioFieldLabel(data, lang, k))}</dt><dd>${type === "tel" || type === "date" || type === "time" ? `<bdi>${val}</bdi>` : val}</dd>`;
    });
    if (!rows.length) return "";
    const ic = (BIO_SECTIONS.find((b) => b.id === s.i) || {}).icon || "star";
    return `<section class="bd-sec"><h3>${icon(ic)}<span>${esc(bioSectionTitle(s, lang))}</span></h3><dl>${rows.join("")}</dl></section>`;
  }).join("");

  el.innerHTML = `
    <div class="bd-frame">
      <header class="bd-head">
        ${data.inv ? `<p class="bd-invocation">${esc(data.inv)}</p>` : ""}
        <p class="bd-kicker">${L("bio_kicker")}</p>
        ${data.photo ? `<div class="bd-photo"><img src="${esc(data.photo)}" alt=""></div>` : ""}
        <h2 class="bd-name">${esc(data.n) || "&nbsp;"}</h2>
        ${data.tg ? `<p class="bd-tagline">${esc(data.tg)}</p>` : ""}
        ${ornamentSvg(p.orn)}
      </header>
      <div class="bd-sections">${sections}</div>
    </div>`;
}

/* Capture the biodata (print version) for JPG / PNG / PDF downloads. */
async function exportBiodata(fmt, data, lang) {
  const p = tpl(data.t);
  loadFont(lang);
  const c = await captureCanvas((el) => renderBiodata(el, data, lang),
    { families: [LANGS[lang].font, p.latin, p.names], bg: p.bg, pixelRatio: fmt === "jpg" ? 2 : 3 });
  const name = `biodata-${data.n || "profile"}`.replace(/[\s/\\?%*:|"<>]+/g, "-").replace(/-{2,}/g, "-");
  await saveCanvas(c, fmt, name, `${t(lang, "bio_kicker")} · ${data.n || ""}`);
}
