/* Illustrated scenery for the "art" designs: a decorative top piece and a bottom piece
 * (usually the couple), drawn as SVG. The card uses them as CSS backgrounds and the
 * video draws them onto the canvas, so both show the same artwork.
 * Everything is generated here, with no image files.
 */

const SCENE_TOP_H = 170;   // top piece is 400 x 170
const SCENE_BOT_H = 300;   // bottom piece is 400 x 300

const _r = (seed) => { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
const _svg = (h, inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 ${h}">${inner}</svg>`;
const _uri = (s) => `url("data:image/svg+xml,${encodeURIComponent(s)}")`;
const _n = (v) => Math.round(v * 10) / 10;

/* ----- building blocks ----- */
function flower(cx, cy, r, c1, c2 = c1, petals = 6) {
  let o = "";
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    o += `<circle cx="${_n(cx + Math.cos(a) * r * 0.55)}" cy="${_n(cy + Math.sin(a) * r * 0.55)}" r="${_n(r * 0.5)}" fill="${c1}"/>`;
  }
  return o + `<circle cx="${cx}" cy="${cy}" r="${_n(r * 0.42)}" fill="${c2}"/><circle cx="${cx}" cy="${cy}" r="${_n(r * 0.16)}" fill="#fff" opacity=".55"/>`;
}
function rose(cx, cy, r, c1, c2) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c1}"/><circle cx="${cx}" cy="${cy}" r="${_n(r * 0.66)}" fill="${c2}"/>` +
    `<path d="M${cx - r * 0.4} ${cy}a${r * 0.4} ${r * 0.4} 0 1 1 ${r * 0.8} 0" fill="none" stroke="${c1}" stroke-width="${_n(r * 0.14)}"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${_n(r * 0.2)}" fill="${c1}"/>`;
}
function leaf(x, y, len, ang, col, w = 0.32) {
  const a = (ang * Math.PI) / 180, ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
  const nx = -Math.sin(a) * len * w, ny = Math.cos(a) * len * w;
  return `<path d="M${_n(x)} ${_n(y)}Q${_n((x + ex) / 2 + nx)} ${_n((y + ey) / 2 + ny)} ${_n(ex)} ${_n(ey)}Q${_n((x + ex) / 2 - nx)} ${_n((y + ey) / 2 - ny)} ${_n(x)} ${_n(y)}Z" fill="${col}"/>`;
}
function banana(x, y, s, ang, c1, c2) {
  let o = "";
  const a0 = (ang * Math.PI) / 180;
  o += `<path d="M${x} ${y}L${_n(x + Math.cos(a0) * 70 * s)} ${_n(y + Math.sin(a0) * 70 * s)}" stroke="${c2}" stroke-width="${_n(2 * s)}" fill="none"/>`;
  for (let i = 1; i <= 6; i++) {
    const px = x + Math.cos(a0) * i * 11 * s, py = y + Math.sin(a0) * i * 11 * s;
    o += leaf(px, py, 30 * s, ang + 78, i % 2 ? c1 : c2, 0.22) + leaf(px, py, 30 * s, ang - 78, i % 2 ? c2 : c1, 0.22);
  }
  return o;
}
function lantern(x, y, s, body, glow, drop = 0) {
  return `${drop ? `<path d="M${x} 0V${y}" stroke="${body}" stroke-width="1"/>` : ""}` +
    `<path d="M${x - 5 * s} ${y}h${10 * s}l${3 * s} ${5 * s}h${-16 * s}z" fill="${body}"/>` +
    `<path d="M${x - 8 * s} ${y + 5 * s}h${16 * s}q${5 * s} ${13 * s} 0 ${26 * s}h${-16 * s}q${-5 * s} ${-13 * s} 0 ${-26 * s}z" fill="${glow}" stroke="${body}" stroke-width="${_n(1.2 * s)}"/>` +
    `<path d="M${x - 6 * s} ${y + 31 * s}h${12 * s}l${-2 * s} ${5 * s}h${-8 * s}z" fill="${body}"/>` +
    `<ellipse cx="${x}" cy="${y + 18 * s}" rx="${3 * s}" ry="${6 * s}" fill="#fff" opacity=".6"/>`;
}
function chandelier(x, y, s, col, glow) {
  let o = `<path d="M${x} 0V${y}" stroke="${col}" stroke-width="1.2"/>`;
  o += `<path d="M${x - 5 * s} ${y}h${10 * s}l${-2 * s} ${8 * s}h${-6 * s}z" fill="${col}"/>`;
  o += `<path d="M${x - 24 * s} ${y + 26 * s}Q${x} ${y + 8 * s} ${x + 24 * s} ${y + 26 * s}" stroke="${col}" stroke-width="${_n(1.6 * s)}" fill="none"/>`;
  o += `<path d="M${x - 40 * s} ${y + 40 * s}Q${x} ${y + 12 * s} ${x + 40 * s} ${y + 40 * s}" stroke="${col}" stroke-width="${_n(1.6 * s)}" fill="none"/>`;
  for (let i = -4; i <= 4; i++) {
    const px = x + i * 9 * s, py = y + (40 - 18 * (1 - (i * i) / 16)) * s + 6 * s;
    o += `<path d="M${_n(px)} ${_n(py)}v${_n(10 * s + Math.abs(i % 3) * 5 * s)}" stroke="${col}" stroke-width="${_n(0.9 * s)}"/>` +
      `<path d="M${_n(px)} ${_n(py + 12 * s + Math.abs(i % 3) * 5 * s)}l${_n(2.6 * s)} ${_n(3 * s)}l${_n(-2.6 * s)} ${_n(3 * s)}l${_n(-2.6 * s)} ${_n(-3 * s)}z" fill="${glow}"/>`;
  }
  return o + `<circle cx="${x}" cy="${y + 20 * s}" r="${_n(5 * s)}" fill="${glow}" opacity=".9"/>`;
}
function swag(x1, x2, y, dip, col, bead, n = 14, r = 2.4) {
  let o = `<path d="M${x1} ${y}Q${(x1 + x2) / 2} ${y + dip * 2} ${x2} ${y}" fill="none" stroke="${col}" stroke-width="1"/>`;
  for (let i = 1; i < n; i++) {
    const t = i / n, px = x1 + (x2 - x1) * t, py = y + 2 * dip * t * (1 - t) * 2;
    o += `<circle cx="${_n(px)}" cy="${_n(py)}" r="${r}" fill="${bead}"/>`;
  }
  return o;
}
function garland(x1, x2, y, dip, cols, size, n, seed) {
  const R = _r(seed);
  let o = "";
  for (let i = 0; i <= n; i++) {
    const t = i / n, px = x1 + (x2 - x1) * t, py = y + 4 * dip * t * (1 - t);
    o += flower(_n(px), _n(py), size * (0.85 + R() * 0.3), cols[i % cols.length], cols[(i + 1) % cols.length], 7);
  }
  return o;
}
function bunting(x1, x2, y, dip, cols, n) {
  let o = `<path d="M${x1} ${y}Q${(x1 + x2) / 2} ${y + dip * 2} ${x2} ${y}" fill="none" stroke="#9a7b3b" stroke-width="1"/>`;
  for (let i = 1; i < n; i++) {
    const t = i / n, px = x1 + (x2 - x1) * t, py = y + 4 * dip * t * (1 - t);
    o += `<path d="M${_n(px - 5)} ${_n(py)}h10l-5 13z" fill="${cols[i % cols.length]}"/>`;
  }
  return o;
}
function umbrella(x, y, s, c1, c2) {
  let o = `<path d="M${x} ${y}V${y + 60 * s}" stroke="#8a6a2f" stroke-width="${_n(1.6 * s)}"/>`;
  o += `<path d="M${x - 34 * s} ${y + 18 * s}Q${x} ${y - 26 * s} ${x + 34 * s} ${y + 18 * s}Z" fill="${c1}"/>`;
  for (let i = 0; i < 4; i++) o += `<path d="M${_n(x - 34 * s + i * 17 * s)} ${_n(y + 18 * s)}Q${_n(x - 34 * s + i * 17 * s + 4 * s)} ${_n(y - 10 * s)} ${x} ${_n(y - 22 * s)}" stroke="${c2}" stroke-width="${_n(1 * s)}" fill="none"/>`;
  for (let i = 0; i <= 4; i++) o += `<circle cx="${_n(x - 34 * s + i * 17 * s)}" cy="${_n(y + 22 * s)}" r="${_n(2.2 * s)}" fill="${c2}"/>`;
  return o + `<circle cx="${x}" cy="${_n(y - 24 * s)}" r="${_n(2 * s)}" fill="${c2}"/>`;
}
function peacock(x, y, s, flip = 1) {
  const f = (v) => _n(x + v * s * flip);
  let o = "";
  for (let i = 0; i < 7; i++) {
    const a = -170 + i * 13;
    const ex = Math.cos((a * Math.PI) / 180) * 78, ey = Math.sin((a * Math.PI) / 180) * 62;
    o += `<path d="M${f(14)} ${_n(y - 14 * s)}Q${f(14 + ex * 0.4)} ${_n(y - 14 * s + ey * 0.8 * s)} ${f(14 + ex)} ${_n(y + ey * s)}" stroke="#2f7a64" stroke-width="${_n(2 * s)}" fill="none"/>`;
    o += `<ellipse cx="${f(14 + ex)}" cy="${_n(y + ey * s)}" rx="${_n(5 * s)}" ry="${_n(7 * s)}" fill="#1f6c8a"/><ellipse cx="${f(14 + ex)}" cy="${_n(y + ey * s)}" rx="${_n(2.4 * s)}" ry="${_n(3.6 * s)}" fill="#d8b44a"/>`;
  }
  o += `<ellipse cx="${f(0)}" cy="${_n(y - 6 * s)}" rx="${_n(15 * s)}" ry="${_n(10 * s)}" fill="#1b6f8f"/>`;
  o += `<path d="M${f(-8)} ${_n(y - 10 * s)}Q${f(-22)} ${_n(y - 34 * s)} ${f(-20)} ${_n(y - 46 * s)}" stroke="#1b6f8f" stroke-width="${_n(6 * s)}" fill="none" stroke-linecap="round"/>`;
  o += `<circle cx="${f(-20)}" cy="${_n(y - 48 * s)}" r="${_n(5 * s)}" fill="#1b6f8f"/><path d="M${f(-25)} ${_n(y - 49 * s)}l${_n(-6 * s * flip)} ${_n(1.5 * s)}l${_n(6 * s * flip)} ${_n(2 * s)}z" fill="#d8a53a"/>`;
  return o;
}
function dome(cx, y, w, h, col, edge) {
  return `<path d="M${cx - w / 2} ${y}Q${cx - w / 2} ${y - h} ${cx} ${y - h * 1.12}Q${cx + w / 2} ${y - h} ${cx + w / 2} ${y}Z" fill="${col}" stroke="${edge}" stroke-width="1.2"/>` +
    `<path d="M${cx} ${y - h * 1.12}v${-8}" stroke="${edge}" stroke-width="1.4"/><circle cx="${cx}" cy="${y - h * 1.12 - 10}" r="2.6" fill="${edge}"/>`;
}
function column(x, y1, y2, w, col, edge) {
  return `<rect x="${x - w / 2}" y="${y1}" width="${w}" height="${y2 - y1}" fill="${col}" stroke="${edge}" stroke-width=".8"/>` +
    `<rect x="${x - w * 0.85}" y="${y1 - 3}" width="${w * 1.7}" height="5" fill="${edge}"/><rect x="${x - w * 0.85}" y="${y2 - 2}" width="${w * 1.7}" height="5" fill="${edge}"/>`;
}

/* ----- the couple: faceless, in the spirit of illustrated invitations ----- */
function groom(x, y, s, o = {}) {
  const { coat = "#e8d9c4", trim = "#b9965a", pants = "#efe6d6", skin = "#e9b896", hair = "#2a1b14", turban = null, shawl = null, tux = false } = o;
  const g = (v) => _n(v * s);
  let b = `<g transform="translate(${x} ${y})">`;
  b += `<path d="M${g(-9)} 0L${g(-8)} ${g(-52)}H${g(8)}L${g(9)} 0Z" fill="${tux ? "#17171a" : pants}"/>`;
  b += `<path d="M${g(-16)} ${g(-52)}L${g(-13)} ${g(-96)}Q0 ${g(-104)} ${g(13)} ${g(-96)}L${g(16)} ${g(-52)}Z" fill="${coat}"/>`;
  b += tux ? `<path d="M${g(-5)} ${g(-100)}L0 ${g(-80)}L${g(5)} ${g(-100)}Z" fill="#fff"/><path d="M${g(-3)} ${g(-97)}h${g(6)}l${g(-3)} ${g(4)}z" fill="#111"/>`
           : `<path d="M0 ${g(-100)}V${g(-52)}" stroke="${trim}" stroke-width="${_n(1.4 * s)}"/>` + [-90, -80, -70, -60].map((v) => `<circle cx="0" cy="${g(v)}" r="${_n(1.3 * s)}" fill="${trim}"/>`).join("");
  b += `<path d="M${g(-16)} ${g(-94)}L${g(-24)} ${g(-60)}L${g(-19)} ${g(-58)}L${g(-13)} ${g(-88)}Z" fill="${tux ? "#17171a" : coat}"/><path d="M${g(16)} ${g(-94)}L${g(24)} ${g(-60)}L${g(19)} ${g(-58)}L${g(13)} ${g(-88)}Z" fill="${tux ? "#17171a" : coat}"/>`;
  if (shawl) b += `<path d="M${g(-14)} ${g(-97)}Q${g(-27)} ${g(-60)} ${g(-20)} ${g(-8)}L${g(-9)} ${g(-8)}Q${g(-14)} ${g(-55)} ${g(-5)} ${g(-97)}Z" fill="${shawl}" opacity=".95"/>`;
  b += `<rect x="${g(-3)}" y="${g(-108)}" width="${g(6)}" height="${g(10)}" fill="${skin}"/>`;
  b += `<ellipse cx="0" cy="${g(-117)}" rx="${g(8.4)}" ry="${g(10)}" fill="${skin}"/>`;
  b += turban ? `<path d="M${g(-10)} ${g(-120)}Q${g(-9)} ${g(-136)} 0 ${g(-137)}Q${g(9)} ${g(-136)} ${g(10)} ${g(-120)}Q0 ${g(-124)} ${g(-10)} ${g(-120)}Z" fill="${turban}"/><circle cx="0" cy="${g(-128)}" r="${_n(1.6 * s)}" fill="${trim}"/>`
              : `<path d="M${g(-8.6)} ${g(-119)}Q${g(-8)} ${g(-130)} 0 ${g(-130)}Q${g(8)} ${g(-130)} ${g(8.6)} ${g(-119)}Q0 ${g(-124)} ${g(-8.6)} ${g(-119)}Z" fill="${hair}"/>`;
  return b + "</g>";
}
function bride(x, y, s, o = {}) {
  const { skirt = "#c2185b", skirt2 = "#e8a0b8", blouse = "#e06a8c", dup = "#d81b60", skin = "#e9b896", hair = "#1d120d", gold = "#e3b341", gown = false } = o;
  const g = (v) => _n(v * s);
  let b = `<g transform="translate(${x} ${y})">`;
  b += `<path d="M${g(-11)} ${g(-100)}Q${g(-17)} ${g(-70)} ${g(-12)} ${g(-52)}L${g(12)} ${g(-52)}Q${g(17)} ${g(-70)} ${g(11)} ${g(-100)}Z" fill="${hair}"/>`;
  b += gown
    ? `<path d="M${g(-9)} ${g(-92)}Q${g(-12)} ${g(-70)} ${g(-8)} ${g(-60)}Q${g(-30)} ${g(-20)} ${g(-26)} 0H${g(26)}Q${g(30)} ${g(-20)} ${g(8)} ${g(-60)}Q${g(12)} ${g(-70)} ${g(9)} ${g(-92)}Z" fill="${skirt}"/><path d="M${g(-9)} ${g(-92)}Q${g(-12)} ${g(-70)} ${g(-8)} ${g(-60)}L${g(-2)} ${g(-60)}Q${g(-6)} ${g(-75)} ${g(-4)} ${g(-92)}Z" fill="#fff" opacity=".22"/>`
    : `<path d="M${g(-8)} ${g(-62)}Q${g(-34)} ${g(-26)} ${g(-36)} 0H${g(36)}Q${g(34)} ${g(-26)} ${g(8)} ${g(-62)}Z" fill="${skirt}"/><path d="M${g(-30)} ${g(-12)}H${g(30)}" stroke="${gold}" stroke-width="${_n(1.6 * s)}"/><path d="M${g(-22)} ${g(-34)}H${g(22)}" stroke="${skirt2}" stroke-width="${_n(1.2 * s)}"/>` +
      [-24, -12, 0, 12, 24].map((v) => `<circle cx="${g(v)}" cy="${g(-20 + (Math.abs(v) > 14 ? 4 : 0))}" r="${_n(1.5 * s)}" fill="${gold}"/>`).join("") +
      `<path d="M${g(-9)} ${g(-92)}L${g(-8)} ${g(-62)}H${g(8)}L${g(9)} ${g(-92)}Q0 ${g(-97)} ${g(-9)} ${g(-92)}Z" fill="${blouse}"/>`;
  if (!gown) b += `<path d="M${g(-12)} ${g(-100)}Q${g(-24)} ${g(-60)} ${g(-30)} 0H${g(-18)}Q${g(-14)} ${g(-50)} ${g(-4)} ${g(-86)}Z" fill="${dup}" opacity=".95"/><path d="M${g(9)} ${g(-94)}L${g(26)} ${g(-52)}L${g(21)} ${g(-50)}L${g(7)} ${g(-82)}Z" fill="${dup}" opacity=".95"/>`;
  b += `<rect x="${g(-2.6)}" y="${g(-104)}" width="${g(5.2)}" height="${g(10)}" fill="${skin}"/>`;
  b += `<ellipse cx="0" cy="${g(-112)}" rx="${g(7.6)}" ry="${g(9.2)}" fill="${skin}"/>`;
  b += `<path d="M${g(-8)} ${g(-113)}Q${g(-6)} ${g(-124)} 0 ${g(-124)}Q${g(6)} ${g(-124)} ${g(8)} ${g(-113)}Q${g(3)} ${g(-118)} 0 ${g(-118)}Q${g(-3)} ${g(-118)} ${g(-8)} ${g(-113)}Z" fill="${hair}"/>`;
  b += `<circle cx="${g(-7.4)}" cy="${g(-108)}" r="${_n(1.3 * s)}" fill="${gold}"/><circle cx="${g(7.4)}" cy="${g(-108)}" r="${_n(1.3 * s)}" fill="${gold}"/>`;
  return b + "</g>";
}

/* ----- the artworks ----- */
const ART = {
  /* arched doorway with a domed floral mandap and the couple */
  mandap: {
    top: () => {
      const R = _r(11);
      let o = `<path d="M0 0H400V${SCENE_TOP_H}Q200 -30 0 ${SCENE_TOP_H}Z" fill="#e7cfa4" opacity=".0"/>`;
      o += `<path d="M0 0H400V0H0Z"/>`;
      o += `<path d="M-6 ${SCENE_TOP_H + 10}V70Q-6 20 40 8Q90 -4 120 24Q160 54 200 54Q240 54 280 24Q310 -4 360 8Q406 20 406 70V${SCENE_TOP_H + 10}H370V82Q370 50 340 42Q300 32 268 66Q236 96 200 96Q164 96 132 66Q100 32 60 42Q30 50 30 82V${SCENE_TOP_H + 10}Z" fill="#d9b97f"/>`;
      o += `<path d="M18 ${SCENE_TOP_H}V84Q18 58 48 52Q90 44 122 76Q160 108 200 108Q240 108 278 76Q310 44 352 52Q382 58 382 84V${SCENE_TOP_H}" fill="none" stroke="#fbf1de" stroke-width="2.4"/>`;
      o += `<path d="M44 ${SCENE_TOP_H}V92Q44 70 70 66Q104 62 132 90Q164 122 200 122Q236 122 268 90Q296 62 330 66Q356 70 356 92V${SCENE_TOP_H}" fill="none" stroke="#b78f52" stroke-width="1.2"/>`;
      for (let i = 0; i < 9; i++) o += flower(_n(8 + R() * 22), _n(40 + i * 14), 4.4, "#fff", "#f3e3b8", 5) + flower(_n(392 - R() * 22), _n(40 + i * 14), 4.4, "#fff", "#f3e3b8", 5);
      o += leaf(18, 70, 34, -70, "#7f9c6a") + leaf(382, 70, 34, -110, "#7f9c6a") + leaf(22, 120, 30, -60, "#7f9c6a") + leaf(378, 120, 30, -120, "#7f9c6a");
      return _svg(SCENE_TOP_H, o);
    },
    bot: () => {
      const R = _r(5);
      let o = `<path d="M0 262H400V300H0Z" fill="#e8d6b4"/><path d="M0 262H400" stroke="#cfae72" stroke-width="2"/>`;
      o += banana(36, 252, 1.2, -95, "#5f8a56", "#4a7344") + banana(366, 252, 1.2, -85, "#5f8a56", "#4a7344");
      o += column(138, 130, 262, 8, "#f2e3bf", "#b58f4f") + column(262, 130, 262, 8, "#f2e3bf", "#b58f4f") + column(168, 138, 262, 6, "#f5e8c8", "#b58f4f") + column(232, 138, 262, 6, "#f5e8c8", "#b58f4f");
      o += dome(200, 128, 150, 52, "#f7efdc", "#b58f4f");
      o += `<path d="M120 128h160" stroke="#b58f4f" stroke-width="3"/>`;
      o += `<path d="M150 262l8 -10h84l8 10zM140 270l12 -9h96l12 9z" fill="#efe0bd" stroke="#cfae72" stroke-width=".8"/>`;
      o += groom(176, 252, 0.98, { coat: "#f2c6c4", trim: "#b9965a", pants: "#fbf3e4", turban: "#f6ddd6", shawl: "#fff4e3" });
      o += bride(222, 252, 0.98, { skirt: "#b3123f", skirt2: "#f1a9bd", blouse: "#d8265f", dup: "#c0174d" });
      for (let i = 0; i < 22; i++) o += rose(_n(112 + i * 8.2), _n(128 + Math.sin(i / 3) * 3), 7 + R() * 2, "#fbfaf5", "#efe4cf");
      for (let i = 0; i < 8; i++) o += leaf(_n(118 + i * 24), 126, 14, -60 + R() * 120, "#6c9567");
      const bush = (cx, cy, n) => { let b = ""; for (let i = 0; i < n; i++) b += rose(_n(cx + (R() - 0.5) * 80), _n(cy + (R() - 0.5) * 38), 10 + R() * 5, "#fdfbf6", "#eadfca"); return b; };
      o += leaf(40, 240, 40, -40, "#5f8a56") + leaf(60, 246, 40, -20, "#4a7344") + bush(70, 244, 14) + leaf(360, 240, 40, -140, "#5f8a56") + leaf(340, 246, 40, -160, "#4a7344") + bush(330, 244, 14);
      return _svg(SCENE_BOT_H, o);
    },
  },

  /* hanging lanterns and vines above, the couple cheering between banana leaves below */
  lantern: {
    top: () => {
      const R = _r(21);
      let o = "";
      for (let i = 0; i < 26; i++) {
        const x = i * 16 + R() * 10;
        o += `<path d="M${x} 0V${_n(14 + R() * 70)}" stroke="#7fa06a" stroke-width="1.2"/>`;
        for (let k = 0; k < 6; k++) o += leaf(x + (R() - .5) * 4, _n(8 + k * 12 + R() * 30), 11 + R() * 4, R() > .5 ? 60 : 120, R() > .4 ? "#8fb27a" : "#a9c690");
      }
      o += flower(40, 18, 11, "#f6b8c3", "#e98aa0") + flower(120, 8, 9, "#f6b8c3", "#e98aa0") + flower(285, 10, 10, "#f6b8c3", "#e98aa0") + flower(365, 20, 11, "#f6b8c3", "#e98aa0");
      o += lantern(52, 40, 1.7, "#a0702c", "#f9d98a", 1) + lantern(122, 64, 1.3, "#a0702c", "#fbe3a4", 1) + lantern(200, 36, 1.4, "#a0702c", "#f9d98a", 1) + lantern(280, 66, 1.3, "#a0702c", "#fbe3a4", 1) + lantern(350, 38, 1.7, "#a0702c", "#f9d98a", 1);
      o += chandelier(165, 8, 0.55, "#a0702c", "#f9d98a") + chandelier(238, 6, 0.55, "#a0702c", "#f9d98a");
      return _svg(SCENE_TOP_H, o);
    },
    bot: () => {
      let o = `<path d="M0 300V250Q200 236 400 250V300Z" fill="#f6ecd9" opacity=".0"/>`;
      o += banana(60, 270, 1.5, -70, "#5f8a56", "#3f6b3a") + banana(340, 270, 1.5, -110, "#5f8a56", "#3f6b3a") + banana(20, 270, 1.4, -45, "#6c9a62", "#3f6b3a") + banana(380, 270, 1.4, -135, "#6c9a62", "#3f6b3a");
      o += umbrella(70, 166, 1.4, "#c9582a", "#f0c36a") + umbrella(330, 166, 1.4, "#c9582a", "#f0c36a");
      o += bride(150, 292, 1.18, { skirt: "#b72a1c", skirt2: "#f0b27a", blouse: "#d8472a", dup: "#8f1a14" });
      o += groom(250, 292, 1.18, { coat: "#f3efe6", trim: "#d1b273", pants: "#f3efe6", turban: "#f3efe6", shawl: "#f0e6d0" });
      o += lantern(112, 262, 1.1, "#a0702c", "#fbe3a4") + lantern(292, 268, 1.1, "#a0702c", "#fbe3a4");
      return _svg(SCENE_BOT_H, o);
    },
  },

  /* dark, with crystal chandeliers and blush florals */
  chandelier: {
    top: () => {
      let o = "";
      for (let i = 0; i < 40; i++) o += `<path d="M${i * 10 + 3} 0V${_n(18 + ((i * 37) % 40))}" stroke="#d6b86a" stroke-width=".8" opacity=".55"/><circle cx="${i * 10 + 3}" cy="${_n(18 + ((i * 37) % 40))}" r="1.5" fill="#f1d98c"/>`;
      o += chandelier(60, 4, 1.0, "#c9a24c", "#f6e3a8") + chandelier(200, 2, 1.45, "#c9a24c", "#f6e3a8") + chandelier(340, 4, 1.0, "#c9a24c", "#f6e3a8");
      return _svg(SCENE_TOP_H, o);
    },
    bot: () => {
      const R = _r(31);
      let o = `<path d="M130 300V210Q130 150 200 140Q270 150 270 210V300Z" fill="#fff4d8" opacity=".14"/>`;
      const cl = (cx, cy, n, sp) => { let b = ""; for (let i = 0; i < n; i++) b += leaf(_n(cx + (R() - .5) * sp), _n(cy + (R() - .5) * 60), 20, R() * 360, "#7d8f6d") ; for (let i = 0; i < n; i++) b += rose(_n(cx + (R() - .5) * sp), _n(cy + (R() - .5) * 60), 8 + R() * 8, i % 2 ? "#e9a9b8" : "#f4cdd5", i % 2 ? "#d7849b" : "#e9a9b8"); return b; };
      o += cl(46, 230, 16, 80) + cl(354, 230, 16, 80) + cl(90, 280, 12, 120) + cl(310, 280, 12, 120);
      o += groom(176, 288, 1.1, { tux: true, coat: "#15151a", hair: "#241812" });
      o += bride(228, 288, 1.1, { gown: true, skirt: "#e7a8ba", hair: "#2a1a13" });
      return _svg(SCENE_BOT_H, o);
    },
  },

  /* yellow garlands and bells, a haldi moment under an umbrella */
  haldi: {
    top: () => {
      const R = _r(41);
      let o = "";
      o += garland(-10, 410, 12, 26, ["#f4b400", "#f28c1b", "#ffd23f"], 7.5, 30, 3);
      o += garland(-10, 410, 38, 20, ["#f7a8b8", "#f4b400", "#e66a84"], 5.5, 36, 9);
      for (let i = 0; i < 6; i++) {
        const x = 40 + i * 64 + R() * 10;
        const y = 24 + 4 * 20 * (x / 400) * (1 - x / 400) + 30;
        o += `<path d="M${_n(x)} ${_n(y)}V${_n(y + 36)}" stroke="#a97a2e" stroke-width="1"/>` + flower(_n(x), _n(y + 44), 7.5, i % 2 ? "#f28c1b" : "#f4b400", "#fff0b0", 8);
      }
      o += leaf(10, 30, 36, 60, "#7fa06a") + leaf(390, 30, 36, 120, "#7fa06a");
      return _svg(SCENE_TOP_H, o);
    },
    bot: () => {
      const R = _r(43);
      let o = `<path d="M0 286Q200 262 400 286V300H0Z" fill="#f0c649" opacity=".55"/>`;
      o += umbrella(96, 166, 1.5, "#f28fa6", "#f6d36a");
      o += `<path d="M40 292Q60 252 90 250Q140 248 160 292Z" fill="#f7a8b8" opacity=".9"/>`;
      for (let i = 0; i < 26; i++) o += flower(_n(30 + R() * 340), _n(268 + R() * 28), 7 + R() * 4, i % 3 ? "#f4b400" : "#f28c1b", "#ffe27a", 7);
      o += groom(176, 288, 1.1, { coat: "#fdf6e4", trim: "#d1b273", pants: "#fdf6e4", hair: "#2a1b14" });
      o += bride(236, 288, 1.1, { skirt: "#f2b705", skirt2: "#fde58a", blouse: "#f39c12", dup: "#e08a0a" });
      o += leaf(14, 280, 60, -75, "#6c9a62") + leaf(30, 282, 50, -55, "#4a7344") + leaf(386, 280, 60, -105, "#6c9a62") + leaf(370, 282, 50, -125, "#4a7344");
      return _svg(SCENE_BOT_H, o);
    },
  },

  /* a lotus pond, a chhatri and a peacock */
  pond: {
    top: () => {
      const R = _r(51);
      let o = "";
      for (let i = 0; i < 20; i++) o += leaf(_n(R() * 400), _n(R() * 20), 24 + R() * 22, 40 + R() * 100, i % 2 ? "#a9c1a0" : "#c9d8b8");
      o += `<path d="M390 0Q372 40 340 60Q310 80 296 120" stroke="#8aa57e" stroke-width="2" fill="none"/>`;
      o += flower(348, 52, 14, "#f3b2c3", "#e88aa3", 7) + flower(312, 92, 10, "#f7cad5", "#ec9bb0", 7) + flower(30, 40, 11, "#f3b2c3", "#e88aa3", 7);
      for (let i = 0; i < 5; i++) o += leaf(_n(310 + i * 18), _n(10 + i * 8), 26, 100 + i * 8, "#8fb084");
      o += `<path d="M10 20Q18 12 26 20M40 10Q46 4 52 10M70 28Q76 22 82 28" stroke="#6a6a6a" stroke-width="1.2" fill="none"/>`;
      return _svg(SCENE_TOP_H, o);
    },
    bot: () => {
      const R = _r(53);
      let o = `<path d="M0 250Q120 236 220 252T400 248V300H0Z" fill="#9ec9c9" opacity=".6"/>`;
      o += `<path d="M0 262Q100 252 200 262T400 260" stroke="#fff" stroke-width="1.5" opacity=".6" fill="none"/>`;
      for (let i = 0; i < 6; i++) o += `<ellipse cx="${_n(30 + i * 62 + R() * 20)}" cy="${_n(272 + R() * 16)}" rx="20" ry="6" fill="#6f9f78"/>`;
      o += flower(86, 270, 11, "#f3b2c3", "#e88aa3", 7) + flower(250, 280, 10, "#f7cad5", "#ec9bb0", 7);
      /* chhatri */
      o += column(60, 150, 252, 7, "#f4e7cb", "#b9955a") + column(160, 150, 252, 7, "#f4e7cb", "#b9955a") + column(110, 156, 252, 5, "#f6ecd5", "#b9955a");
      o += `<path d="M44 150H176" stroke="#b9955a" stroke-width="4"/>` + dome(110, 146, 150, 56, "#f8f0dc", "#b9955a");
      o += `<path d="M40 252H182V262H40z" fill="#efe1c0"/><path d="M30 262H192V272H30z" fill="#e6d4ac"/>`;
      o += bride(96, 252, 0.95, { skirt: "#b3123f", skirt2: "#f1a9bd", blouse: "#d8265f", dup: "#c0174d" });
      o += groom(128, 252, 0.95, { coat: "#f5efe2", trim: "#d1b273", pants: "#f5efe2", turban: "#f5efe2" });
      for (let i = 0; i < 12; i++) o += rose(_n(30 + R() * 160), _n(240 + R() * 22), 7 + R() * 4, i % 2 ? "#f2aab9" : "#f8c9d2", "#e78fa5") + leaf(_n(30 + R() * 160), _n(246 + R() * 14), 18, -90 + (R() - .5) * 100, "#6f9f78");
      o += peacock(318, 240, 1.25, -1);
      for (let i = 0; i < 14; i++) o += rose(_n(250 + R() * 150), _n(250 + R() * 40), 9 + R() * 6, i % 2 ? "#f2aab9" : "#f8c9d2", "#e78fa5") + leaf(_n(250 + R() * 150), _n(250 + R() * 30), 20, -90 + (R() - .5) * 120, "#6f9f78");
      return _svg(SCENE_BOT_H, o);
    },
  },

  /* a dark reception evening with gold lanterns and a dancing couple */
  noir: {
    top: () => {
      let o = "";
      for (let i = 0; i < 60; i++) o += `<path d="M${i * 6.7 + 2} 0V${_n(10 + ((i * 53) % 70))}" stroke="#e9c97c" stroke-width=".7" opacity=".5"/><circle cx="${_n(i * 6.7 + 2)}" cy="${_n(10 + ((i * 53) % 70))}" r="1.3" fill="#f8e3a6"/>`;
      o += chandelier(200, 2, 1.1, "#d6b25a", "#fff1c4");
      o += lantern(60, 34, 1.7, "#b8860b", "#f9d75a", 1) + lantern(340, 34, 1.7, "#b8860b", "#f9d75a", 1) + lantern(26, 76, 1.2, "#b8860b", "#f9d75a", 1) + lantern(374, 76, 1.2, "#b8860b", "#f9d75a", 1);
      return _svg(SCENE_TOP_H, o);
    },
    bot: () => {
      const R = _r(61);
      let o = `<path d="M10 300V70M390 300V70" stroke="#c9a24c" stroke-width="1.2" opacity=".6"/>`;
      const cl = (cx, cy, n) => { let b = ""; for (let i = 0; i < n; i++) b += leaf(_n(cx + (R() - .5) * 90), _n(cy + (R() - .5) * 44), 22, R() * 360, "#4f7a58"); for (let i = 0; i < n + 2; i++) b += rose(_n(cx + (R() - .5) * 90), _n(cy + (R() - .5) * 44), 8 + R() * 6, "#f7f3e8", "#e3d8bd"); return b; };
      o += cl(58, 252, 12) + cl(342, 252, 12);
      o += lantern(36, 262, 1.2, "#b8860b", "#f9d75a") + lantern(366, 262, 1.2, "#b8860b", "#f9d75a");
      o += groom(168, 290, 1.12, { tux: true, coat: "#0e0e12", hair: "#241812" });
      o += bride(232, 290, 1.12, { gown: true, skirt: "#e8a4b8", hair: "#3a2418" });
      return _svg(SCENE_BOT_H, o);
    },
  },

  /* pink canopy mandap with the couple */
  canopy: {
    top: () => {
      const R = _r(71);
      let o = `<path d="M-6 ${SCENE_TOP_H}V64Q-6 6 42 8Q90 10 112 40Q150 78 200 78Q250 78 288 40Q310 10 358 8Q406 6 406 64V${SCENE_TOP_H}H386V74Q386 30 352 30Q320 32 296 64Q256 110 200 110Q144 110 104 64Q80 32 48 30Q14 30 14 74V${SCENE_TOP_H}Z" fill="#f2d5d2"/>`;
      o += `<path d="M30 ${SCENE_TOP_H}V74Q30 44 56 44Q82 44 100 72Q138 124 200 124Q262 124 300 72Q318 44 344 44Q370 44 370 74V${SCENE_TOP_H}" fill="none" stroke="#c99a68" stroke-width="1.4"/>`;
      for (let i = 0; i < 12; i++) o += flower(_n(12 + R() * 26), _n(14 + i * 12), 7, "#e86f93", "#f7b2c4", 6) + flower(_n(388 - R() * 26), _n(14 + i * 12), 7, "#e86f93", "#f7b2c4", 6);
      for (let i = 0; i < 6; i++) o += `<circle cx="${_n(R() * 400)}" cy="${_n(R() * 150)}" r="2.2" fill="#d4a24d" opacity=".5"/>`;
      o += lantern(200, 80, 1.3, "#a0702c", "#fbe3a4", 1);
      o += leaf(20, 10, 40, 70, "#7fa06a") + leaf(380, 10, 40, 110, "#7fa06a");
      return _svg(SCENE_TOP_H, o);
    },
    bot: () => {
      const R = _r(73);
      let o = "";
      o += `<path d="M120 160Q200 120 280 160L296 172H104Z" fill="#f0a6bb"/>`;
      o += `<path d="M130 172Q160 230 142 262M170 172Q186 220 176 262M230 172Q214 220 224 262M270 172Q240 230 258 262" stroke="#f0a6bb" stroke-width="10" opacity=".55" fill="none"/>`;
      o += column(122, 168, 262, 8, "#f2d08a", "#b58a35") + column(278, 168, 262, 8, "#f2d08a", "#b58a35");
      o += `<path d="M104 168H296" stroke="#b58a35" stroke-width="4"/>`;
      for (let i = 0; i < 28; i++) o += rose(_n(100 + i * 7.4), _n(160 + Math.sin(i / 2.4) * 3), 6.5 + R() * 2.5, i % 3 ? "#f6a9bd" : "#f9d3dc", "#e57896") + leaf(_n(100 + i * 7.4), 156, 10, -60 + R() * 120, "#6f9f78");
      for (let i = 0; i < 12; i++) o += `<path d="M${_n(108 + i * 17)} ${_n(166)}V${_n(190 + R() * 28)}" stroke="#f0a6bb" stroke-width="1.4"/><circle cx="${_n(108 + i * 17)}" cy="${_n(194 + R() * 28)}" r="2.6" fill="#fbe9c8"/>`;
      o += `<path d="M96 262H304V272H96zM84 272H316V282H84z" fill="#f6e4c6" stroke="#d1b273" stroke-width=".8"/>`;
      o += groom(188, 262, 0.98, { coat: "#efe0c0", trim: "#c79a45", pants: "#f6ecd8", turban: "#f4e9d3", shawl: "#f7d8c9" });
      o += bride(216, 262, 0.98, { skirt: "#cf2c52", skirt2: "#f1a9bd", blouse: "#e04a70", dup: "#d9335e" });
      const bush = (cx, n) => { let b = ""; for (let i = 0; i < n; i++) b += leaf(_n(cx + (R() - .5) * 90), _n(268 + (R() - .5) * 40), 22, -90 + (R() - .5) * 140, "#6f9f78"); for (let i = 0; i < n; i++) b += rose(_n(cx + (R() - .5) * 90), _n(270 + (R() - .5) * 34), 8 + R() * 6, i % 2 ? "#f6a9bd" : "#f9d3dc", "#e57896"); return b; };
      o += bush(50, 14) + bush(350, 14);
      return _svg(SCENE_BOT_H, o);
    },
  },

  /* bell garlands and marigolds, a festive mehendi morning */
  fiesta: {
    top: () => {
      const R = _r(81);
      let o = `<path d="M0 0H400V20H0Z" fill="#f6c321"/>`;
      for (let i = 0; i < 26; i++) o += flower(_n(i * 16 + 4), _n(14 + R() * 8), 9 + R() * 3, i % 2 ? "#f6a21a" : "#fbd23d", "#fff0a0", 8);
      const hang = (x, y2, col) => `<path d="M${x} 20V${y2}" stroke="#a97a2e" stroke-width="1.2"/><path d="M${x - 7} ${y2}h14l4 18q-11 8 -22 0z" fill="#b9953c" stroke="#8a6a20" stroke-width=".8"/><circle cx="${x}" cy="${y2 + 22}" r="2.4" fill="#8a6a20"/>${garland(x - 2, x + 2, y2 - 20, 0, [col], 0, 0, 1)}`;
      o += hang(34, 100, "#e8397d") + hang(366, 100, "#e8397d");
      o += `<path d="M50 24Q110 96 170 40M230 40Q290 96 350 24" stroke="#d62a78" stroke-width="2" fill="none"/>`;
      for (let i = 0; i < 18; i++) {
        const left = i < 9, t = (left ? i : i - 9) / 8;
        const x = left ? 50 + 120 * t : 230 + 120 * t, y = (left ? 24 : 40) + (left ? 1 : -1) * 0 + 4 * 24 * t * (1 - t) + (left ? 20 * t : 20 * (1 - t)) * 0;
        o += `<circle cx="${_n(x)}" cy="${_n(left ? 24 + 72 * t * (1 - t) * 1.2 + 16 * t : 40 + 72 * t * (1 - t) * 1.2 - 16 * t + 16)}" r="3.6" fill="#e0307a"/>`;
      }
      o += chandelier(200, 22, 0.6, "#b9953c", "#fff0b0");
      o += `<path d="M16 20V140M384 20V140" stroke="#c99a2e" stroke-width="1" opacity=".0"/>`;
      return _svg(SCENE_TOP_H, o);
    },
    bot: () => {
      const R = _r(83);
      let o = "";
      for (let i = 0; i < 40; i++) o += flower(_n(R() * 400), _n(282 + R() * 16), 6 + R() * 4, i % 3 ? "#fbd23d" : "#f6a21a", "#fff0a0", 7);
      const girl = (x, o2, h) => bride(x, 292 + h, 0.9, o2);
      o += girl(40, { skirt: "#c2208f", skirt2: "#f6a0d2", blouse: "#d94aa6", dup: "#a3157a" }, 0);
      o += girl(96, { skirt: "#6fb34a", skirt2: "#bfe59a", blouse: "#8ccf5f", dup: "#4a8f2e" }, 0);
      o += girl(152, { skirt: "#f08a24", skirt2: "#ffd08a", blouse: "#f7a64b", dup: "#d9701a" }, 0);
      o += girl(214, { skirt: "#f5c20c", skirt2: "#fff0a0", blouse: "#f7d84a", dup: "#e0a800" }, 6);
      o += girl(276, { skirt: "#e83e8c", skirt2: "#fbb1d6", blouse: "#f06aa9", dup: "#c41f6f" }, 0);
      o += girl(334, { skirt: "#f0592a", skirt2: "#ffb48a", blouse: "#f87e4e", dup: "#c9421a" }, 0);
      o += girl(374, { skirt: "#9a2fb3", skirt2: "#e0a8ee", blouse: "#b55fcc", dup: "#7a1f92" }, 0);
      o += flower(20, 260, 8, "#e8397d", "#f6a0c0", 7) + flower(380, 258, 8, "#e8397d", "#f6a0c0", 7);
      return _svg(SCENE_BOT_H, o);
    },
  },
};

/* Rasterised copies, so the video can draw them and the card can use them as backgrounds. */
const _artCache = {};
function artUris(id) {
  if (!ART[id]) return null;
  if (!_artCache[id]) _artCache[id] = { top: _uri(ART[id].top()), bot: _uri(ART[id].bot()) };
  return _artCache[id];
}
function artRaw(id, part) {
  return ART[id] ? ART[id][part]() : "";
}
const _artImgs = {};
function artImages(id) {
  if (!ART[id]) return Promise.resolve(null);
  if (!_artImgs[id]) {
    const load = (svg) => new Promise((res) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => res(null);
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    });
    _artImgs[id] = Promise.all([load(ART[id].top()), load(ART[id].bot())]).then(([top, bot]) => ({ top, bot }));
  }
  return _artImgs[id];
}
