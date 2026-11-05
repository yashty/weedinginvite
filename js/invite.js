/* Invitation data model, templates, ornaments, URL encoding and card rendering.
 * Templates are defined once here; the card (CSS variables) and the video
 * (canvas) both read the same palette, frame and ornament.
 */

const TEMPLATES = {
  royal:      { name: "Royal Maroon",   bg: "#6b0f1a", bg2: "#3d0610", ink: "#f8e7c4", accent: "#e2b35a", soft: "rgba(248,231,196,.78)", frame: "double",  orn: "paisley", fx: "sparkle", latin: "Cormorant Garamond" },
  marigold:   { name: "Marigold",       bg: "#fff3d6", bg2: "#ffe1a6", ink: "#4f2405", accent: "#a33f09", soft: "#7a4a22",               frame: "corners", orn: "lotus",   fx: "petals",  latin: "Cormorant Garamond", petal: "#f28c1b" },
  emerald:    { name: "Emerald Garden", bg: "#0f3d2e", bg2: "#06231a", ink: "#eaf5ec", accent: "#d8b867", soft: "rgba(234,245,236,.78)", frame: "arch",    orn: "leaf",    fx: "leaves",  latin: "Marcellus", petal: "#6fae7c" },
  ivory:      { name: "Ivory Blush",    bg: "#fffaf6", bg2: "#f6e4e0", ink: "#463535", accent: "#94434e", soft: "#7d6464",               frame: "line",    orn: "line",    fx: "petals",  latin: "Playfair Display", names: "Great Vibes", petal: "#e7a9b0" },
  midnight:   { name: "Midnight Gold",  bg: "#101a33", bg2: "#070d1d", ink: "#f1e9d8", accent: "#d9b46a", soft: "rgba(241,233,216,.75)", frame: "arch",    orn: "mandala", fx: "sparkle", latin: "Cormorant Garamond" },
  peacock:    { name: "Peacock",        bg: "#0b4f5c", bg2: "#05303a", ink: "#eef8f6", accent: "#e8c15a", soft: "rgba(238,248,246,.78)", frame: "double",  orn: "mandala", fx: "sparkle", latin: "Marcellus" },
  lotus:      { name: "Lotus",          bg: "#fde9ec", bg2: "#f7cdd5", ink: "#4e1a28", accent: "#a52a45", soft: "#7c4453",               frame: "arch",    orn: "lotus",   fx: "petals",  latin: "Playfair Display", names: "Great Vibes", petal: "#e87d93" },
  kanjivaram: { name: "Temple Silk",    bg: "#8a1020", bg2: "#560711", ink: "#fff1d6", accent: "#f0b429", soft: "rgba(255,241,214,.8)",  frame: "temple",  orn: "mandala", fx: "sparkle", latin: "Marcellus" },
  henna:      { name: "Mehndi",         bg: "#f4ecd8", bg2: "#e4d4ad", ink: "#353216", accent: "#515d12", soft: "#5f5a36",               frame: "corners", orn: "leaf",    fx: "leaves",  latin: "Cormorant Garamond", petal: "#8a9a3a" },
  minimal:    { name: "Sindoor Minimal",bg: "#ffffff", bg2: "#f5f1ec", ink: "#1c1917", accent: "#b3261e", soft: "#57534e",               frame: "line",    orn: "line",    fx: "none",    latin: "Playfair Display" },
};

/* Whose card it is decides who is named first: o === "g" puts the groom first. */
const nameOrder = (d) => (d.o === "g" ? [d.g, d.b] : [d.b, d.g]);

const SAMPLE = {
  t: "royal", l: "en",
  b: "Ananya", g: "Arjun", h: "The Sharma & Iyer families",
  d: "2027-02-14", tm: "19:00",
  v: "The Leela Palace", a: "Udaipur, Rajasthan",
  m: "", p: "",
  e: [
    { k: "haldi", d: "2027-02-13", tm: "10:00", v: "Family residence" },
    { k: "sangeet", d: "2027-02-13", tm: "19:00", v: "Palace lawns" },
    { k: "wedding", d: "2027-02-14", tm: "19:00", v: "The Leela Palace" },
  ],
};

/* ---------- ornaments: one definition, drawn as SVG on cards and Path2D on video ---------- */
const circ = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
const ORNAMENTS = {
  paisley: [
    { d: "M0 16H92M148 16H240", s: 1 },
    { d: circ(120, 16, 5), s: 1 },
    { d: "M120 6c4 5 4 15 0 20c-4-5-4-15 0-20zM104 16c5-4 11-4 16 0c-5 4-11 4-16 0zM136 16c-5-4-11-4-16 0c5 4 11 4 16 0z", f: 0.55 },
    { d: circ(96, 16, 2) + circ(144, 16, 2), f: 1 },
  ],
  lotus: [
    { d: "M0 22H96M144 22H240", s: 1 },
    { d: "M120 3C127 10 127 19 120 26C113 19 113 10 120 3Z", f: 0.75 },
    { d: "M120 26C111 25 103 19 99 10C109 12 117 18 120 26ZM120 26C129 25 137 19 141 10C131 12 123 18 120 26Z", f: 0.5 },
    { d: "M104 29H136", s: 1 },
  ],
  mandala: [
    { d: "M0 16H96M144 16H240", s: 1 },
    { d: circ(120, 16, 11), s: 1 },
    { d: circ(120, 16, 4), f: 1 },
    { d: [0, 45, 90, 135, 180, 225, 270, 315].map((a) => circ(120 + 7.5 * Math.cos(a * Math.PI / 180), 16 + 7.5 * Math.sin(a * Math.PI / 180), 1.3)).join(""), f: 0.8 },
    { d: circ(90, 16, 2) + circ(150, 16, 2), f: 1 },
  ],
  leaf: [
    { d: "M10 16C50 10 80 22 120 16C160 10 190 22 230 16", s: 1 },
    { d: "M60 14c6-8 14-9 18-8c-3 6-10 9-18 8zM180 18c-6 8-14 9-18 8c3-6 10-9 18-8zM100 18c-4 7-11 9-15 8c2-6 8-9 15-8zM140 14c4-7 11-9 15-8c-2 6-8 9-15 8z", f: 0.7 },
    { d: circ(120, 16, 3.5), f: 1 },
  ],
  line: [
    { d: "M40 16H108M132 16H200", s: 1 },
    { d: "M120 10L126 16L120 22L114 16Z", f: 1 },
  ],
};

function ornamentSvg(name) {
  const parts = (ORNAMENTS[name] || ORNAMENTS.line).map((p) =>
    p.s ? `<path d="${p.d}" fill="none" stroke="currentColor" stroke-width="${p.s}"/>`
        : `<path d="${p.d}" fill="currentColor" opacity="${p.f}"/>`).join("");
  return `<svg class="ornament" viewBox="0 0 240 32" aria-hidden="true">${parts}</svg>`;
}

/* ---------- link encoding (UTF-8 safe base64url, so any script survives) ---------- */
function encodeInvite(data) {
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  let bin = "";
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeInvite(str) {
  try {
    const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64 + "===".slice((b64.length + 3) % 4));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch (_) {
    return null;
  }
}

function inviteUrl(data) {
  const base = location.href.replace(/[^/]*([?#].*)?$/, "");
  return `${base}invite.html#d=${encodeInvite(data)}`;
}

/* ---------- formatting ---------- */
function esc(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function fmtDate(lang, iso, style = "long") {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d)) return iso;
  const opts = style === "short"
    ? { weekday: "short", day: "numeric", month: "short" }
    : { weekday: "long", day: "numeric", month: "long", year: "numeric" };
  try { return new Intl.DateTimeFormat(LANGS[lang].locale, opts).format(d); } catch (_) { return iso; }
}

function fmtTime(lang, hhmm) {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  try {
    return new Intl.DateTimeFormat(LANGS[lang].locale, { hour: "numeric", minute: "2-digit" }).format(new Date(2000, 0, 1, h, m));
  } catch (_) { return hhmm; }
}

function eventName(lang, ev) {
  return ev.k && ev.k !== "custom" ? t(lang, `ev_${ev.k}`) : ev.n || "";
}

function mapLink(v, a, ll) {
  if (typeof locationUrl === "function") return locationUrl(v, a, ll);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([v, a].filter(Boolean).join(", "))}`;
}

function tpl(id) { return TEMPLATES[id] || TEMPLATES.royal; }

/* Apply a template's palette as CSS variables on any element. */
function applyPalette(el, id) {
  const p = tpl(id);
  el.style.setProperty("--c-bg", p.bg);
  el.style.setProperty("--c-bg2", p.bg2);
  el.style.setProperty("--c-ink", p.ink);
  el.style.setProperty("--c-accent", p.accent);
  el.style.setProperty("--c-soft", p.soft);
  el.style.setProperty("--c-latin", `"${p.latin}"`);
  el.style.setProperty("--c-names", `"${p.names || p.latin}"`);
  el.style.setProperty("--c-names-w", p.names ? "400" : "700");
}

/* Font weights available per Google family (script faces ship a single weight). */
const fontSpec = (f) => (f === "Great Vibes" ? "Great+Vibes" : `${f.replace(/ /g, "+")}:wght@400;600;700`);

/* Latin display fonts used by templates (loaded once). */
(function loadLatinFonts() {
  if (typeof document === "undefined") return;
  const fams = [...new Set(Object.values(TEMPLATES).flatMap((x) => [x.latin, x.names].filter(Boolean)))]
    .map((f) => `family=${fontSpec(f)}`).join("&");
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?${fams}&display=swap`;
  document.head.appendChild(link);
})();

/* Render the invitation card into `el`. `lang` overrides data.l (guest's choice). */
function renderInvite(el, data, lang = data.l || "en", { interactive = true, compact = false } = {}) {
  const L = (k) => esc(t(lang, k));
  const p = tpl(data.t);
  const events = compact ? [] : (data.e || []).filter((ev) => eventName(lang, ev));
  const rsvp = (yes) => {
    const text = `${t(lang, yes ? "rsvp_yes" : "rsvp_no")} ${nameOrder(data)[0] || ""} & ${nameOrder(data)[1] || ""}`;
    return `https://wa.me/${(data.p || "").replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
  };
  const orn = ornamentSvg(p.orn);
  const showQR = !compact && data.qr !== false && !!window.QRCodeStyling && !!(data.ll || data.v || data.a);

  el.className = `invite frame-${p.frame}${compact ? " compact" : ""}`;
  el.lang = lang;
  el.dir = LANGS[lang].dir;
  el.style.setProperty("--script-font", `"${LANGS[lang].font}"`);
  applyPalette(el, data.t);
  /* "A page for each ceremony": a cover page, then one page per ceremony. Guests swipe; exports stack them. */
  const paged = !compact && data.f === "p" && events.length > 0;
  const [n1, n2] = nameOrder(data);
  const mapA = (ev) => (interactive && (Array.isArray(ev.ll) || ev.v) ? `<a class="inv-link" target="_blank" rel="noopener" href="${mapLink(ev.v, ev.v ? "" : data.a, ev.ll)}">${L("inv_map")}</a>` : "");
  const rsvpHtml = data.p && interactive ? `<h2 class="inv-section">${L("inv_rsvp")}</h2>
    <div class="inv-rsvp">
      <a class="inv-btn" target="_blank" rel="noopener" href="${rsvp(true)}">${L("inv_yes")}</a>
      <a class="inv-btn ghost" target="_blank" rel="noopener" href="${rsvp(false)}">${L("inv_no")}</a>
    </div>` : "";
  const cover = `<section class="inv-page">
      <p class="inv-small">${L("inv_blessing")}</p>
      ${orn}
      <p class="inv-host">${data.h ? esc(data.h) : L("inv_together")}</p>
      <p class="inv-small">${L("inv_invite")}</p>
      <h1 class="inv-names"><span>${esc(n1) || "&nbsp;"}</span><span class="inv-and">${L("inv_and")}</span><span>${esc(n2) || "&nbsp;"}</span></h1>
      ${orn}
      ${data.d ? `<p class="inv-label">${L("inv_save")}</p><p class="inv-date">${esc(fmtDate(lang, data.d))}</p>${data.tm ? `<p class="inv-time"><bdi>${esc(fmtTime(lang, data.tm))}</bdi></p>` : ""}` : ""}
      ${data.v ? `<p class="inv-label">${L("inv_venue")}</p><p class="inv-venue">${esc(data.v)}</p>${data.a ? `<p class="inv-address">${esc(data.a)}</p>` : ""}${mapA({ v: data.v, ll: data.ll })}` : ""}
      ${showQR ? `<figure class="inv-qr"><div class="qr-tile" data-qr="${esc(mapLink(data.v, data.a, data.ll))}" data-tpl="${esc(data.t)}" data-style="${esc(data.qs || "rounded")}"></div><figcaption>${L("qr_scan")}</figcaption></figure>` : ""}
      ${data.m ? `<p class="inv-message">“${esc(data.m)}”</p>` : ""}
    </section>`;
  const evPages = events.map((ev, i) => `<section class="inv-page">
      <p class="inv-small">${esc(n1)} ${L("inv_and")} ${esc(n2)}</p>
      ${orn}
      <h2 class="inv-ev-name">${esc(eventName(lang, ev))}</h2>
      ${ev.d ? `<p class="inv-date">${esc(fmtDate(lang, ev.d))}</p>` : ""}
      ${ev.tm ? `<p class="inv-time"><bdi>${esc(fmtTime(lang, ev.tm))}</bdi></p>` : ""}
      ${ev.v || data.v ? `<p class="inv-label">${L("inv_venue")}</p><p class="inv-venue">${esc(ev.v || data.v)}</p>${!ev.v && data.a ? `<p class="inv-address">${esc(data.a)}</p>` : ""}${mapA(ev)}` : ""}
      ${i === events.length - 1 ? rsvpHtml : ""}
    </section>`).join("");
  const pagedHtml = `<div class="invite-frame">
      <div class="inv-pages${interactive ? "" : " stack"}">${cover}${evPages}</div>
      ${interactive ? `<div class="inv-dots" role="group">${[0, ...events.map((_, i) => i + 1)].map((i) => `<button type="button" aria-label="${i + 1}"${i === 0 ? ' class="on"' : ""}></button>`).join("")}</div>` : ""}
      ${interactive ? "" : orn}
    </div>`;

  el.innerHTML = paged ? pagedHtml : `
    <div class="invite-frame">
      <p class="inv-small">${L("inv_blessing")}</p>
      ${orn}
      <p class="inv-host">${data.h ? esc(data.h) : L("inv_together")}</p>
      <p class="inv-small">${L("inv_invite")}</p>
      <h1 class="inv-names">
        <span>${esc(nameOrder(data)[0]) || "&nbsp;"}</span>
        <span class="inv-and">${L("inv_and")}</span>
        <span>${esc(nameOrder(data)[1]) || "&nbsp;"}</span>
      </h1>
      ${orn}
      ${data.d ? `<p class="inv-label">${L("inv_save")}</p>
        <p class="inv-date">${esc(fmtDate(lang, data.d))}</p>
        ${data.tm ? `<p class="inv-time"><bdi>${esc(fmtTime(lang, data.tm))}</bdi></p>` : ""}` : ""}
      ${data.v ? `<p class="inv-label">${L("inv_venue")}</p>
        <p class="inv-venue">${esc(data.v)}</p>
        ${data.a ? `<p class="inv-address">${esc(data.a)}</p>` : ""}
        ${interactive ? `<a class="inv-link" target="_blank" rel="noopener" href="${mapLink(data.v, data.a, data.ll)}">${L("inv_map")}</a>` : ""}` : ""}
      ${showQR ? `<figure class="inv-qr"><div class="qr-tile" data-qr="${esc(mapLink(data.v, data.a, data.ll))}" data-tpl="${esc(data.t)}" data-style="${esc(data.qs || "rounded")}"></div><figcaption>${L("qr_scan")}</figcaption></figure>` : ""}
      ${data.m && !compact ? `<p class="inv-message">“${esc(data.m)}”</p>` : ""}
      ${data.d && interactive ? `<div class="countdown" data-date="${esc(data.d)}T${esc(data.tm || "00:00")}">
        <div><b data-cd="d">0</b><span>${L("inv_days")}</span></div>
        <div><b data-cd="h">0</b><span>${L("inv_hours")}</span></div>
        <div><b data-cd="m">0</b><span>${L("inv_mins")}</span></div>
      </div>` : ""}
      ${events.length ? `<h2 class="inv-section">${L("inv_events")}</h2>
        <ul class="inv-events">${events.map((ev) => `
          <li>
            <strong>${esc(eventName(lang, ev))}</strong>
            <span>${[fmtDate(lang, ev.d), fmtTime(lang, ev.tm)].filter(Boolean).map((x) => `<bdi>${esc(x)}</bdi>`).join(" · ")}</span>
            ${ev.v ? `<span>${esc(ev.v)}</span>` : ""}
            ${interactive && Array.isArray(ev.ll) ? `<a class="inv-link" target="_blank" rel="noopener" href="${mapLink(ev.v, "", ev.ll)}">${L("inv_map")}</a>` : ""}
          </li>`).join("")}
        </ul>` : ""}
      ${data.p && interactive ? `<h2 class="inv-section">${L("inv_rsvp")}</h2>
        <div class="inv-rsvp">
          <a class="inv-btn" target="_blank" rel="noopener" href="${rsvp(true)}">${L("inv_yes")}</a>
          <a class="inv-btn ghost" target="_blank" rel="noopener" href="${rsvp(false)}">${L("inv_no")}</a>
        </div>` : ""}
      ${compact ? "" : orn}
    </div>`;
  startCountdown(el);
  if (showQR) hydrateQR(el);
  if (paged && interactive) wirePager(el);
}

/* Dots follow the swipe; tapping a dot jumps to that page. */
function wirePager(el) {
  const box = el.querySelector(".inv-pages"), dots = [...el.querySelectorAll(".inv-dots button")];
  const rtl = el.dir === "rtl";
  const index = () => Math.round(Math.abs(box.scrollLeft) / box.clientWidth);
  box.addEventListener("scroll", () => { const i = index(); dots.forEach((d, k) => d.classList.toggle("on", k === i)); }, { passive: true });
  dots.forEach((d, k) => d.addEventListener("click", () => box.scrollTo({ left: (rtl ? -1 : 1) * k * box.clientWidth, behavior: "smooth" })));
}

function startCountdown(el) {
  const box = el.querySelector(".countdown");
  if (!box) return;
  const target = new Date(box.dataset.date);
  const nf = new Intl.NumberFormat(LANGS[el.lang].locale);
  const tick = () => {
    if (!box.isConnected) return;
    const diff = Math.max(0, target - Date.now());
    box.querySelector('[data-cd="d"]').textContent = nf.format(Math.floor(diff / 864e5));
    box.querySelector('[data-cd="h"]').textContent = nf.format(Math.floor(diff / 36e5) % 24);
    box.querySelector('[data-cd="m"]').textContent = nf.format(Math.floor(diff / 6e4) % 60);
    setTimeout(tick, 30000);
  };
  tick();
}
