/* Download formats: PNG, JPG, PDF, and a 9:16 status/story image.
 * The card is rendered off-screen without interactive parts (no countdown,
 * map link or RSVP buttons) and captured with html-to-image, which uses the
 * browser's own text rendering, so every script is shaped correctly.
 */

const EXPORT_WIDTH = 600; // CSS px; captured at 2x or 3x

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function exportName(data, ext) {
  const base = `invitation-${data.b || "bride"}-${data.g || "groom"}`.replace(/[\s/\\?%*:|"<>]+/g, "-");
  return `${base}.${ext}`;
}

const canvasBlob = (canvas, type, q) => new Promise((r) => canvas.toBlob(r, type, q));

/* Build @font-face CSS with the font files inlined, for just the subsets this text needs.
 * (Browsers block reading Google's stylesheets cross-origin, so html-to-image can't do it.) */
const fontFileCache = new Map();
async function embeddedFontCss(families, text) {
  const cps = [...new Set([...text].map((c) => c.codePointAt(0)))];
  const covers = (range) => range.split(",").some((part) => {
    const [a, b] = part.trim().replace(/^U\+/i, "").split("-");
    if (a.includes("?")) { const lo = parseInt(a.replace(/\?/g, "0"), 16), hi = parseInt(a.replace(/\?/g, "F"), 16); return cps.some((c) => c >= lo && c <= hi); }
    const lo = parseInt(a, 16), hi = b ? parseInt(b, 16) : lo;
    return cps.some((c) => c >= lo && c <= hi);
  });
  const toDataUrl = async (url) => {
    if (!fontFileCache.has(url)) {
      fontFileCache.set(url, fetch(url).then((r) => r.blob()).then((blob) => new Promise((res) => {
        const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob);
      })));
    }
    return fontFileCache.get(url);
  };
  const out = [];
  for (const fam of families) {
    const spec = fam === "Manrope" ? "Manrope:wght@400;500;600" : `${fam.replace(/ /g, "+")}:wght@400;600;700`;
    let css;
    try { css = await (await fetch(`https://fonts.googleapis.com/css2?family=${spec.replace(/ /g, "+")}&display=swap`)).text(); } catch (_) { continue; }
    for (const face of css.match(/@font-face\s*{[^}]*}/g) || []) {
      const range = (face.match(/unicode-range:\s*([^;]+);/) || [])[1];
      if (range && !covers(range)) continue;
      const url = (face.match(/url\(([^)]+)\)/) || [])[1];
      if (!url) continue;
      try { out.push(face.replace(url, await toDataUrl(url.replace(/["']/g, "")))); } catch (_) { /* skip this file */ }
    }
  }
  return out.join("\n");
}

/* Render the print version of the card and capture it to a canvas. */
async function cardCanvas(data, lang, pixelRatio = 2) {
  if (!window.htmlToImage) throw new Error("html-to-image missing");
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = `position:fixed;left:-${EXPORT_WIDTH * 3}px;top:0;width:${EXPORT_WIDTH}px;pointer-events:none;`;
  const card = document.createElement("div");
  host.appendChild(card);
  document.body.appendChild(host);
  try {
    loadFont(lang);
    renderInvite(card, data, lang, { interactive: false });
    card.style.borderRadius = "0";
    const fams = [LANGS[lang].font, tpl(data.t).latin];
    await Promise.all(fams.flatMap((f) => ["400", "600", "700"].map((w) => document.fonts.load(`${w} 20px "${f}"`, card.textContent.slice(0, 200)).catch(() => null))));
    await document.fonts.ready;
    const families = [...new Set([LANGS[lang].font, tpl(data.t).latin, "Manrope"])];
    const fontEmbedCSS = await embeddedFontCss(families, card.textContent + "0123456789:·“”");
    const opts = { pixelRatio, skipAutoScale: true, backgroundColor: tpl(data.t).bg, fontEmbedCSS };
    // Safari sometimes paints web fonts only on the second pass.
    await htmlToImage.toCanvas(card, { ...opts, pixelRatio: 1 }).catch(() => null);
    return await htmlToImage.toCanvas(card, opts);
  } finally {
    host.remove();
  }
}

/* A 1080x1920 still of the video's closing scene. */
async function storyCanvas(data, lang) {
  const scale = 1.5;
  const canvas = document.createElement("canvas");
  const v = new InviteVideo(canvas, data, lang);
  canvas.width = VIDEO_W * scale;
  canvas.height = VIDEO_H * scale;
  await v.prepare();
  v.ctx.setTransform(scale, 0, 0, scale, 0, 0);
  v.draw(v.duration - 0.05);
  return canvas;
}

/* ---------- minimal PDF writer: one page, one JPEG image filling it ---------- */
function pdfFromJpeg(jpeg, imgW, imgH, title = "") {
  const enc = new TextEncoder();
  const pageW = 419.53; // A5 width in points (148 mm)
  const pageH = +(pageW * (imgH / imgW)).toFixed(2);
  const utf16 = (s) => {
    let hex = "FEFF";
    for (const ch of s) {
      const cp = ch.codePointAt(0);
      const units = cp > 0xffff ? [0xd800 + ((cp - 0x10000) >> 10), 0xdc00 + ((cp - 0x10000) & 0x3ff)] : [cp];
      units.forEach((u) => { hex += u.toString(16).padStart(4, "0").toUpperCase(); });
    }
    return `<${hex}>`;
  };
  const content = `q ${pageW} 0 0 ${pageH} 0 0 cm /Im0 Do Q`;
  const parts = [];
  const offsets = [];
  let length = 0;
  const push = (chunk) => { const b = typeof chunk === "string" ? enc.encode(chunk) : chunk; parts.push(b); length += b.length; };
  const obj = (n, body) => { offsets[n] = length; push(`${n} 0 obj\n`); body(); push("\nendobj\n"); };

  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  obj(1, () => push("<< /Type /Catalog /Pages 2 0 R >>"));
  obj(2, () => push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"));
  obj(3, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`));
  obj(4, () => {
    push(`<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
    push(jpeg);
    push("\nendstream");
  });
  obj(5, () => push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`));
  obj(6, () => push(`<< /Title ${utf16(title)} /Producer (Shubh Nimantran) >>`));
  const xref = length;
  push(`xref\n0 7\n0000000000 65535 f \n${offsets.slice(1).map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`);
  push(`trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts, { type: "application/pdf" });
}

/* Run one export by format id. */
async function exportInvite(fmt, data, lang) {
  const title = `${data.b || ""} & ${data.g || ""}`;
  if (fmt === "png") {
    const c = await cardCanvas(data, lang, 3);
    saveBlob(await canvasBlob(c, "image/png"), exportName(data, "png"));
  } else if (fmt === "jpg") {
    const c = await cardCanvas(data, lang, 2);
    saveBlob(await canvasBlob(c, "image/jpeg", 0.9), exportName(data, "jpg"));
  } else if (fmt === "pdf") {
    const c = await cardCanvas(data, lang, 3);
    const jpeg = new Uint8Array(await (await canvasBlob(c, "image/jpeg", 0.92)).arrayBuffer());
    saveBlob(pdfFromJpeg(jpeg, c.width, c.height, title), exportName(data, "pdf"));
  } else if (fmt === "story") {
    const c = await storyCanvas(data, lang);
    saveBlob(await canvasBlob(c, "image/jpeg", 0.92), exportName(data, "story.jpg"));
  }
}

/* Wire up a row of [data-fmt] buttons. getState() returns { data, lang }. */
function bindDownloads(root, getState, { onVideo, uiLang = () => getState().lang } = {}) {
  root.addEventListener("click", async (e) => {
    const b = e.target.closest("button[data-fmt]");
    if (!b || b.disabled) return;
    if (b.dataset.fmt === "video") { if (onVideo) onVideo(); return; }
    const label = b.querySelector("span");
    const prev = label.textContent;
    root.querySelectorAll("button[data-fmt]").forEach((x) => { x.disabled = true; });
    label.textContent = t(uiLang(), "dl_working");
    try {
      const { data, lang } = getState();
      await exportInvite(b.dataset.fmt, data, lang);
    } catch (err) {
      console.error(err);
    } finally {
      label.textContent = prev;
      root.querySelectorAll("button[data-fmt]").forEach((x) => { x.disabled = false; });
    }
  });
}
