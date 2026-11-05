/* Location picker: Leaflet + OpenStreetMap tiles, place search via Nominatim.
 * Leaflet is loaded only when the picker first opens.
 * Nominatim's usage policy allows light use; searches run on submit only, never per keystroke.
 */

let leafletReady = null;
function loadLeaflet() {
  if (window.L) return Promise.resolve();
  if (leafletReady) return leafletReady;
  leafletReady = new Promise((resolve, reject) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "js/vendor/leaflet/leaflet.css";
    document.head.appendChild(css);
    const js = document.createElement("script");
    js.src = "js/vendor/leaflet/leaflet.js";
    js.onload = () => { L.Icon.Default.imagePath = "js/vendor/leaflet/images/"; resolve(); };
    js.onerror = reject;
    document.head.appendChild(js);
  });
  return leafletReady;
}

const NOMINATIM = "https://nominatim.openstreetmap.org";
const round6 = (n) => Math.round(n * 1e6) / 1e6;

function shortAddress(item) {
  const a = item.address || {};
  const parts = [a.road || a.neighbourhood || a.suburb, a.city || a.town || a.village || a.county, a.state].filter(Boolean);
  return parts.length ? [...new Set(parts)].join(", ") : (item.display_name || "").split(",").slice(1, 4).join(",").trim();
}

/* Open the picker. onPick({ ll: [lat, lng], name, address }) runs when the user confirms. */
async function openMapPicker({ lang = "en", ui = "en", initial = null, query = "", onPick }) {
  const T = (k) => esc(t(ui, k));
  const opener = document.activeElement;
  const dlg = document.createElement("div");
  dlg.className = "mapdlg";
  dlg.setAttribute("role", "dialog");
  dlg.setAttribute("aria-modal", "true");
  dlg.setAttribute("aria-label", t(ui, "loc_title"));
  dlg.innerHTML = `
    <div class="mapdlg-card">
      <form class="map-search" role="search">
        <input type="search" name="q" value="${esc(query)}" placeholder="${T("loc_search")}" aria-label="${T("loc_search")}" autocomplete="off" enterkeyhint="search">
        <button type="submit" class="btn small" aria-label="${T("loc_search")}">${icon("search")}</button>
        <button type="button" class="link-btn" data-close aria-label="${T("loc_cancel")}">${icon("close")}</button>
      </form>
      <ul class="map-results" role="listbox" hidden></ul>
      <div class="map-box"><div class="map" aria-label="${T("loc_title")}"></div></div>
      <p class="note map-note" aria-live="polite">${T("loc_hint")}</p>
      <div class="map-foot">
        <button type="button" class="btn ghost small" data-here>${icon("locate")}<span>${T("loc_here")}</span></button>
        <span class="map-spacer"></span>
        <button type="button" class="btn ghost small" data-close>${T("loc_cancel")}</button>
        <button type="button" class="btn small" data-use disabled>${icon("pin")}<span>${T("loc_use")}</span></button>
      </div>
    </div>`;
  document.body.appendChild(dlg);
  document.body.style.overflow = "hidden";
  FX.pop(dlg.querySelector(".mapdlg-card"));
  const $q = (s) => dlg.querySelector(s);
  const note = $q(".map-note");
  const results = $q(".map-results");
  const useBtn = $q("[data-use]");
  let picked = initial ? { ll: initial, name: "", address: "" } : null;

  const close = () => {
    document.removeEventListener("keydown", onKey);
    document.body.style.overflow = "";
    dlg.remove();
    if (opener && opener.focus) opener.focus();
  };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", onKey);
  dlg.addEventListener("click", (e) => { if (e.target === dlg || e.target.closest("[data-close]")) close(); });
  $q('input[name="q"]').focus();

  try { await loadLeaflet(); } catch (_) { note.textContent = t(ui, "loc_noresult"); return; }

  const map = L.map($q(".map"), { zoomControl: true, attributionControl: true })
    .setView(initial || [22.6, 79.0], initial ? 16 : 5);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
  }).addTo(map);
  map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
  let marker = null;

  async function reverse(ll) {
    try {
      const r = await fetch(`${NOMINATIM}/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${ll[0]}&lon=${ll[1]}&accept-language=${lang}`);
      const j = await r.json();
      if (picked && picked.ll === ll) { picked.name = j.name || ""; picked.address = shortAddress(j); note.textContent = j.display_name || t(ui, "loc_hint"); }
    } catch (_) { /* offline: keep coordinates only */ }
  }

  function place(ll, info = null, zoom = null) {
    ll = [round6(ll[0]), round6(ll[1])];
    if (!marker) {
      marker = L.marker(ll, { draggable: true, autoPan: true, keyboard: true }).addTo(map);
      marker.on("dragend", () => { const p = marker.getLatLng(); place([p.lat, p.lng]); });
    } else marker.setLatLng(ll);
    picked = { ll, name: info ? info.name : "", address: info ? info.address : "" };
    if (zoom) map.setView(ll, zoom); else map.panTo(ll);
    useBtn.disabled = false;
    if (!info) reverse(picked.ll);
  }
  if (initial) place(initial, { name: "", address: "" });
  map.on("click", (e) => place([e.latlng.lat, e.latlng.lng]));
  setTimeout(() => map.invalidateSize(), 60);

  $q(".map-search").addEventListener("submit", async (e) => {
    e.preventDefault();
    const q = $q('input[name="q"]').value.trim();
    if (!q) return;
    results.hidden = true;
    note.textContent = "…";
    try {
      const r = await fetch(`${NOMINATIM}/search?format=jsonv2&addressdetails=1&limit=6&q=${encodeURIComponent(q)}&accept-language=${lang}`);
      const items = await r.json();
      if (!items.length) { note.textContent = t(ui, "loc_noresult"); return; }
      note.textContent = t(ui, "loc_hint");
      results.innerHTML = items.map((it, i) => `<li><button type="button" role="option" data-i="${i}"><strong>${esc(it.name || it.display_name.split(",")[0])}</strong><span>${esc(it.display_name)}</span></button></li>`).join("");
      results.hidden = false;
      results.onclick = (ev) => {
        const b = ev.target.closest("button[data-i]");
        if (!b) return;
        const it = items[b.dataset.i];
        place([+it.lat, +it.lon], { name: it.name || "", address: shortAddress(it) }, 17);
        results.hidden = true;
        note.textContent = it.display_name;
      };
      results.querySelector("button").focus();
    } catch (_) {
      note.textContent = t(ui, "loc_noresult");
    }
  });

  $q("[data-here]").addEventListener("click", () => {
    if (!navigator.geolocation) { note.textContent = t(ui, "loc_denied"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => place([pos.coords.latitude, pos.coords.longitude], null, 17),
      () => { note.textContent = t(ui, "loc_denied"); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });

  useBtn.addEventListener("click", () => {
    if (!picked) return;
    const result = { ...picked };
    close();
    onPick && onPick(result);
  });
}
