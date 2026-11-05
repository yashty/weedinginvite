/* Invitation data model, templates, URL encoding and rendering. */

const TEMPLATES = {
  royal:    { name: "Royal Maroon" },
  marigold: { name: "Marigold" },
  emerald:  { name: "Emerald Garden" },
  ivory:    { name: "Ivory Blush" },
};

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

/* UTF-8 safe base64url so names in any script survive the URL. */
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

function esc(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function fmtDate(lang, iso) {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d)) return iso;
  try {
    return new Intl.DateTimeFormat(LANGS[lang].locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
  } catch (_) { return iso; }
}

function fmtTime(lang, hhmm) {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(2000, 0, 1, h, m);
  try {
    return new Intl.DateTimeFormat(LANGS[lang].locale, { hour: "numeric", minute: "2-digit" }).format(d);
  } catch (_) { return hhmm; }
}

function eventName(lang, ev) {
  return ev.k && ev.k !== "custom" ? t(lang, `ev_${ev.k}`) : ev.n || "";
}

function mapLink(v, a) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([v, a].filter(Boolean).join(", "))}`;
}

const ORNAMENT = `<svg class="ornament" viewBox="0 0 240 24" aria-hidden="true">
  <path d="M0 12h92M148 12h92" stroke="currentColor" stroke-width="1"/>
  <circle cx="120" cy="12" r="5" fill="none" stroke="currentColor"/>
  <path d="M120 2c4 5 4 15 0 20c-4-5-4-15 0-20zM104 12c5-4 11-4 16 0c-5 4-11 4-16 0zM136 12c-5-4-11-4-16 0c5 4 11 4 16 0z" fill="currentColor" opacity=".55"/>
  <circle cx="96" cy="12" r="2" fill="currentColor"/><circle cx="144" cy="12" r="2" fill="currentColor"/>
</svg>`;

/* Render the invitation card into `el`. `lang` overrides data.l (guest's choice). */
function renderInvite(el, data, lang = data.l || "en", { interactive = true } = {}) {
  const L = (k) => esc(t(lang, k));
  const events = (data.e || []).filter((ev) => eventName(lang, ev));
  const rsvp = (yes) => {
    const text = `${t(lang, yes ? "rsvp_yes" : "rsvp_no")} ${data.b || ""} & ${data.g || ""}`;
    const num = (data.p || "").replace(/\D/g, "");
    return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
  };

  el.className = `invite tpl-${TEMPLATES[data.t] ? data.t : "royal"}`;
  el.lang = lang;
  el.dir = LANGS[lang].dir;
  el.style.setProperty("--script-font", `"${LANGS[lang].font}"`);
  el.innerHTML = `
    <div class="invite-frame">
      <p class="inv-small">${L("inv_blessing")}</p>
      ${ORNAMENT}
      ${data.h ? `<p class="inv-host">${esc(data.h)}</p>` : `<p class="inv-host">${L("inv_together")}</p>`}
      <p class="inv-small">${L("inv_invite")}</p>
      <h1 class="inv-names">
        <span>${esc(data.b) || "&nbsp;"}</span>
        <span class="inv-and">${L("inv_and")}</span>
        <span>${esc(data.g) || "&nbsp;"}</span>
      </h1>
      ${ORNAMENT}
      ${data.d ? `<p class="inv-label">${L("inv_save")}</p>
        <p class="inv-date">${esc(fmtDate(lang, data.d))}</p>
        ${data.tm ? `<p class="inv-time"><bdi>${esc(fmtTime(lang, data.tm))}</bdi></p>` : ""}` : ""}
      ${data.v ? `<p class="inv-label">${L("inv_venue")}</p>
        <p class="inv-venue">${esc(data.v)}</p>
        ${data.a ? `<p class="inv-address">${esc(data.a)}</p>` : ""}
        ${interactive ? `<a class="inv-link" target="_blank" rel="noopener" href="${mapLink(data.v, data.a)}">${L("inv_map")}</a>` : ""}` : ""}
      ${data.m ? `<p class="inv-message">“${esc(data.m)}”</p>` : ""}
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
          </li>`).join("")}
        </ul>` : ""}
      ${data.p && interactive ? `<h2 class="inv-section">${L("inv_rsvp")}</h2>
        <div class="inv-rsvp">
          <a class="btn btn-inv" target="_blank" rel="noopener" href="${rsvp(true)}">${L("inv_yes")}</a>
          <a class="btn btn-inv ghost" target="_blank" rel="noopener" href="${rsvp(false)}">${L("inv_no")}</a>
        </div>` : ""}
      ${ORNAMENT}
    </div>`;
  startCountdown(el);
}

function startCountdown(el) {
  const box = el.querySelector(".countdown");
  if (!box) return;
  const target = new Date(box.dataset.date);
  const nf = new Intl.NumberFormat(el.lang === "en" ? "en-IN" : LANGS[el.lang].locale);
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
