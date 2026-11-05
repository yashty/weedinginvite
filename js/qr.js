/* Location link + styled QR codes (qr-code-styling, MIT).
 * QR colours come from the invitation's design, but always as dark dots on a
 * light tile so phone cameras scan them reliably.
 */

const QR_STYLES = {
  rounded:  { name: "Rounded",  dots: "rounded",        sq: "extra-rounded", dot: "dot" },
  classic:  { name: "Classic",  dots: "square",         sq: "square",        dot: "square" },
  dots:     { name: "Dots",     dots: "dots",           sq: "dot",           dot: "dot" },
  classy:   { name: "Classy",   dots: "classy-rounded", sq: "extra-rounded", dot: "square" },
  gradient: { name: "Gradient", dots: "rounded",        sq: "extra-rounded", dot: "dot", gradient: true },
  emblem:   { name: "Emblem",   dots: "extra-rounded",  sq: "extra-rounded", dot: "dot", logo: true },
};

/* A Google Maps link: exact pin when set, otherwise a search for the venue text. */
function locationUrl(v, a, ll) {
  if (Array.isArray(ll) && ll.length === 2) return `https://www.google.com/maps/search/?api=1&query=${ll[0]},${ll[1]}`;
  const q = [v, a].filter(Boolean).join(", ");
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : "";
}

function hexLum(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); })
    .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
}

function qrColors(tplId) {
  const p = tpl(tplId);
  const dark = hexLum(p.bg) < 0.2;
  return dark
    ? { tile: p.ink, dots: p.bg2, corners: p.bg, accent: p.bg }
    : { tile: "#ffffff", dots: p.ink, corners: p.accent, accent: p.accent };
}

function emblemDataUrl(color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS.mark}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function makeQR(url, tplId, styleId = "rounded", size = 240, type = "svg") {
  const s = QR_STYLES[styleId] || QR_STYLES.rounded;
  const c = qrColors(tplId);
  return new QRCodeStyling({
    width: size,
    height: size,
    type,
    data: url,
    margin: Math.round(size * 0.04),
    qrOptions: { errorCorrectionLevel: s.logo ? "H" : "Q" },
    image: s.logo ? emblemDataUrl(c.accent) : undefined,
    imageOptions: { hideBackgroundDots: true, imageSize: 0.32, margin: Math.round(size * 0.012) },
    backgroundOptions: { color: c.tile },
    dotsOptions: s.gradient
      ? { type: s.dots, gradient: { type: "linear", rotation: Math.PI / 4, colorStops: [{ offset: 0, color: c.dots }, { offset: 1, color: c.corners }] } }
      : { type: s.dots, color: c.dots },
    cornersSquareOptions: { type: s.sq, color: c.corners },
    cornersDotOptions: { type: s.dot, color: c.corners },
  });
}

/* Render a QR into every [data-qr] slot inside root. */
function hydrateQR(root) {
  if (!window.QRCodeStyling) return;
  root.querySelectorAll("[data-qr]").forEach((slot) => {
    slot.innerHTML = "";
    slot.style.background = qrColors(slot.dataset.tpl).tile;
    makeQR(slot.dataset.qr, slot.dataset.tpl, slot.dataset.style, 240, "svg").append(slot);
  });
}

/* PNG of the QR as an ImageBitmap, for drawing on the video canvas. */
async function qrBitmap(url, tplId, styleId, size = 480) {
  if (!window.QRCodeStyling || !url) return null;
  const blob = await makeQR(url, tplId, styleId, size, "canvas").getRawData("png");
  return blob ? createImageBitmap(blob) : null;
}
