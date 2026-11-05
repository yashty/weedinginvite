/* Video invitations.
 * The invitation is drawn as a timed 9:16 canvas animation that uses the card's template
 * (palette, frame, ornament) and the chosen language. The same renderer plays the
 * live preview and records a downloadable video (MP4 where the browser supports it,
 * otherwise WebM), with optional music generated in the browser.
 */

const VIDEO_W = 720;
const VIDEO_H = 1280;

const ease = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)); // exponential ease-out
const clamp01 = (x) => Math.max(0, Math.min(1, x));

function seeded(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pickVideoMime() {
  const opts = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4;codecs=avc1,mp4a.40.2",
    "video/mp4;codecs=avc1",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  if (typeof MediaRecorder === "undefined") return null;
  return opts.find((m) => MediaRecorder.isTypeSupported(m)) || null;
}

/* ---------- music: a gentle pentatonic melody (D major pentatonic, like raag Bhupali) over a drone ---------- */
class InviteMusic {
  constructor(ctx, out) { this.ctx = ctx; this.out = out; this.nodes = []; }
  start(duration) {
    const { ctx } = this;
    const t0 = ctx.currentTime + 0.05;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, t0);
    master.gain.linearRampToValueAtTime(0.9, t0 + 1.5);
    master.gain.setValueAtTime(0.9, t0 + duration - 1.6);
    master.gain.linearRampToValueAtTime(0, t0 + duration);
    master.connect(this.out);

    const delay = ctx.createDelay(); delay.delayTime.value = 0.36;
    const fb = ctx.createGain(); fb.gain.value = 0.32;
    delay.connect(fb); fb.connect(delay); delay.connect(master);

    // drone: Sa and Pa
    [146.83, 220].forEach((f, i) => {
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = i ? 0.035 : 0.05;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.18 + i * 0.07;
      const lg = ctx.createGain(); lg.gain.value = 0.015;
      lfo.connect(lg); lg.connect(g.gain);
      o.connect(g); g.connect(master);
      o.start(t0); lfo.start(t0); o.stop(t0 + duration); lfo.stop(t0 + duration);
      this.nodes.push(o, lfo);
    });

    // melody
    const N = { D4: 293.66, E4: 329.63, F4: 369.99, A4: 440, B4: 493.88, D5: 587.33, E5: 659.25 };
    const phrase = ["A4", "B4", "D5", "B4", "A4", "F4", "E4", "D4", "F4", "A4", "B4", "A4", "D5", "E5", "D5", "B4"];
    const step = 0.62;
    for (let i = 0, t = t0 + 0.8; t < t0 + duration - 1.2; i++, t += step) {
      if (i % 8 === 7) continue; // breathe
      const f = N[phrase[i % phrase.length]];
      [["sine", 1, 0.11], ["triangle", 2, 0.025]].forEach(([type, mul, vol]) => {
        const o = ctx.createOscillator(); o.type = type; o.frequency.value = f * mul;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.7);
        o.connect(g); g.connect(master); g.connect(delay);
        o.start(t); o.stop(t + 1.8);
        this.nodes.push(o);
      });
    }
  }
  stop() { this.nodes.forEach((n) => { try { n.stop(); } catch (_) { /* already stopped */ } }); this.nodes = []; }
}

/* ---------- renderer ---------- */
class InviteVideo {
  constructor(canvas, data, lang) {
    this.canvas = canvas;
    canvas.width = VIDEO_W;
    canvas.height = VIDEO_H;
    this.ctx = canvas.getContext("2d");
    this.raf = 0;
    this.set(data, lang);
  }

  set(data, lang) {
    this.data = data;
    this.lang = lang || data.l || "en";
    this.p = tpl(data.t);
    const fams = this.lang === "en" ? [this.p.latin] : [LANGS[this.lang].font, this.p.latin];
    this.family = fams.map((f) => `"${f}"`).join(", ") + ", serif";
    this.nameFamily = [this.p.names || this.p.latin, ...fams].map((f) => `"${f}"`).join(", ") + ", serif";
    this.nameWeight = this.p.names ? 400 : 700;
    this.events = (data.e || []).filter((ev) => eventName(this.lang, ev)).slice(0, 5);
    const sc = [{ id: "open", dur: 3.4 }, { id: "names", dur: 4.4 }];
    if (data.d || data.v) sc.push({ id: "when", dur: 4.6 });
    if (this.events.length) sc.push({ id: "events", dur: 2.4 + this.events.length * 0.75 });
    sc.push({ id: "close", dur: 4.2 });
    let at = 0;
    sc.forEach((s) => { s.at = at; at += s.dur; });
    this.scenes = sc;
    this.duration = at;
    const rnd = seeded(7);
    this.particles = Array.from({ length: 46 }, () => ({
      x: rnd(), y: rnd(), r: 0.4 + rnd(), s: 0.3 + rnd() * 0.7, ph: rnd() * Math.PI * 2,
    }));
  }

  async prepare() {
    if (!document.fonts) return;
    const sample = [this.data.b, this.data.g, t(this.lang, "inv_invite")].join(" ");
    const fams = (this.lang === "en" ? [this.p.latin] : [LANGS[this.lang].font, this.p.latin]).concat(this.p.names ? [this.p.names] : []);
    loadFont(this.lang);
    await Promise.all(fams.flatMap((f) => ["400", "700"].map((w) => document.fonts.load(`${w} 40px "${f}"`, sample).catch(() => null))));
  }

  /* text helpers */
  font(size, weight = 400, italic = false, names = false) {
    return `${italic ? "italic " : ""}${names ? this.nameWeight : weight} ${names ? Math.round(size * (this.p.names ? 1.15 : 1)) : size}px ${names ? this.nameFamily : this.family}`;
  }

  wrap(text, maxW) {
    const { ctx } = this;
    const words = String(text).split(/\s+/);
    const lines = [];
    let line = "";
    words.forEach((w) => {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
    });
    if (line) lines.push(line);
    return lines;
  }

  /* Draw centred text that enters with a rise, fade and un-blur. k = 0..1 progress of its entrance. */
  text(str, y, { size = 32, weight = 400, color, k = 1, alpha = 1, maxW = VIDEO_W - 160, italic = false, lh = 1.3, names = false } = {}) {
    if (!str) return 0;
    const { ctx } = this;
    const e = ease(clamp01(k));
    ctx.save();
    ctx.font = this.font(size, weight, italic, names);
    // shrink long single lines (names) before wrapping
    let s = size;
    while (s > size * 0.6 && ctx.measureText(str).width > maxW && !/\s/.test(str.trim())) { s -= 2; ctx.font = this.font(s, weight, italic, names); }
    const lines = this.wrap(str, maxW);
    ctx.globalAlpha = alpha * e;
    ctx.fillStyle = color || this.p.ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.direction = LANGS[this.lang].dir;
    if ("filter" in ctx && e < 1) ctx.filter = `blur(${(1 - e) * 8}px)`;
    const dy = (1 - e) * 26;
    lines.forEach((ln, i) => ctx.fillText(ln, VIDEO_W / 2, y + dy + i * s * lh));
    ctx.restore();
    return lines.length * s * lh;
  }

  ornament(y, scale, k = 1, alpha = 1) {
    const { ctx } = this;
    const e = ease(clamp01(k));
    if (e <= 0) return;
    const w = 240 * scale;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.rect(VIDEO_W / 2 - (w / 2) * e, y - 20 * scale, w * e, 40 * scale);
    ctx.clip();
    ctx.translate(VIDEO_W / 2 - w / 2, y - 16 * scale);
    ctx.scale(scale, scale);
    ctx.strokeStyle = ctx.fillStyle = this.p.accent;
    ctx.lineWidth = 1.2;
    (ORNAMENTS[this.p.orn] || ORNAMENTS.line).forEach((part) => {
      const path = new Path2D(part.d);
      if (part.s) ctx.stroke(path);
      else { ctx.globalAlpha = alpha * part.f; ctx.fill(path); ctx.globalAlpha = alpha; }
    });
    ctx.restore();
  }

  background(time) {
    const { ctx, p } = this;
    const g = ctx.createLinearGradient(0, 0, 0, VIDEO_H);
    g.addColorStop(0, p.bg);
    g.addColorStop(1, p.bg2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIDEO_W, VIDEO_H);
    const breathe = 0.5 + 0.5 * Math.sin(time * 0.6);
    const rg = ctx.createRadialGradient(VIDEO_W / 2, VIDEO_H * 0.45, 40, VIDEO_W / 2, VIDEO_H * 0.45, 620);
    rg.addColorStop(0, this.hexA(p.accent, 0.10 + breathe * 0.06));
    rg.addColorStop(1, this.hexA(p.accent, 0));
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, VIDEO_W, VIDEO_H);
    this.particlesDraw(time);
  }

  hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
  }

  particlesDraw(time) {
    const { ctx, p } = this;
    if (p.fx === "none") return;
    ctx.save();
    this.particles.forEach((q) => {
      if (p.fx === "sparkle") {
        const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(time * 1.6 * q.s + q.ph));
        const x = q.x * VIDEO_W;
        const y = ((q.y - time * 0.006 * q.s) % 1 + 1) % 1 * VIDEO_H;
        const r = 1 + q.r * 2.2;
        ctx.globalAlpha = a;
        ctx.fillStyle = p.accent;
        ctx.beginPath();
        ctx.moveTo(x, y - r * 2); ctx.lineTo(x + r * 0.5, y); ctx.lineTo(x, y + r * 2); ctx.lineTo(x - r * 0.5, y); ctx.closePath();
        ctx.moveTo(x - r * 2, y); ctx.lineTo(x, y + r * 0.5); ctx.lineTo(x + r * 2, y); ctx.lineTo(x, y - r * 0.5); ctx.closePath();
        ctx.fill();
      } else {
        const y = ((q.y + time * 0.035 * q.s) % 1) * (VIDEO_H + 80) - 40;
        const x = q.x * VIDEO_W + Math.sin(time * 0.8 * q.s + q.ph) * 28;
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = p.petal || p.accent;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(time * q.s + q.ph);
        ctx.beginPath();
        if (p.fx === "leaves") ctx.ellipse(0, 0, 4 + q.r * 5, 2 + q.r * 2, 0, 0, Math.PI * 2);
        else ctx.ellipse(0, 0, 5 + q.r * 5, 3 + q.r * 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    });
    ctx.restore();
  }

  frame(k) {
    const { ctx, p } = this;
    const e = ease(clamp01(k));
    const m = 44;
    const w = VIDEO_W - m * 2;
    const h = VIDEO_H - m * 2;
    ctx.save();
    ctx.strokeStyle = p.accent;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.9;
    ctx.setLineDash([6000 * e, 6000]);
    const rect = (inset) => { ctx.beginPath(); ctx.roundRect(m + inset, m + inset, w - inset * 2, h - inset * 2, 18); ctx.stroke(); };
    if (p.frame === "double") { rect(0); ctx.lineWidth = 1; rect(12); }
    else if (p.frame === "line") { ctx.lineWidth = 1.2; rect(10); }
    else if (p.frame === "arch") {
      ctx.beginPath();
      const r = w / 2;
      ctx.moveTo(m, m + h);
      ctx.lineTo(m, m + r * 0.9);
      ctx.ellipse(m + r, m + r * 0.9, r, r * 0.9, 0, Math.PI, 0);
      ctx.lineTo(m + w, m + h);
      ctx.closePath();
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(m + 14, m + h - 14);
      ctx.lineTo(m + 14, m + r * 0.9);
      ctx.ellipse(m + r, m + r * 0.9, r - 14, r * 0.9 - 14, 0, Math.PI, 0);
      ctx.lineTo(m + w - 14, m + h - 14);
      ctx.closePath();
      ctx.stroke();
    } else if (p.frame === "corners") {
      ctx.setLineDash([]);
      ctx.lineWidth = 2.5;
      const L = 90 * e;
      [[m, m, 1, 1], [m + w, m, -1, 1], [m, m + h, 1, -1], [m + w, m + h, -1, -1]].forEach(([x, y, sx, sy]) => {
        ctx.beginPath(); ctx.moveTo(x + sx * L, y); ctx.lineTo(x, y); ctx.lineTo(x, y + sy * L); ctx.stroke();
        ctx.beginPath(); ctx.arc(x + sx * 14, y + sy * 14, 4 * e, 0, Math.PI * 2); ctx.fillStyle = p.accent; ctx.fill();
      });
    } else if (p.frame === "temple") {
      rect(0);
      ctx.setLineDash([]);
      ctx.fillStyle = p.accent;
      ctx.globalAlpha = 0.85 * e;
      [m + 14, m + h - 14 - 16].forEach((y, row) => {
        for (let x = m + 16; x < m + w - 16; x += 24) {
          ctx.beginPath();
          if (row === 0) { ctx.moveTo(x, y); ctx.lineTo(x + 12, y + 16); ctx.lineTo(x + 24, y); }
          else { ctx.moveTo(x, y + 16); ctx.lineTo(x + 12, y); ctx.lineTo(x + 24, y + 16); }
          ctx.closePath(); ctx.fill();
        }
      });
    }
    ctx.restore();
  }

  draw(time) {
    const { ctx, data, lang, p } = this;
    const T = (k) => t(lang, k);
    ctx.clearRect(0, 0, VIDEO_W, VIDEO_H);
    this.background(time);
    this.frame(time / 1.6);

    const sc = this.scenes.find((s) => time >= s.at && time < s.at + s.dur) || this.scenes[this.scenes.length - 1];
    const lt = time - sc.at;
    const last = sc === this.scenes[this.scenes.length - 1];
    const out = last ? 1 : 1 - clamp01((lt - (sc.dur - 0.5)) / 0.5); // scene fade-out
    const k = (delay, len = 0.9) => clamp01((lt - delay) / len);
    const A = out;
    const cy = VIDEO_H / 2;

    if (sc.id === "open") {
      let y = cy - 190;
      y += this.text(T("inv_blessing"), y, { size: 30, color: p.soft, k: k(0.2), alpha: A }) + 30;
      this.ornament(y, 1.6, k(0.5, 1.2), A);
      y += 90;
      y += this.text(data.h || T("inv_together"), y, { size: 42, weight: 700, k: k(0.9), alpha: A }) + 20;
      this.text(T("inv_invite"), y, { size: 32, color: p.soft, k: k(1.3), alpha: A, maxW: VIDEO_W - 200 });
    }

    if (sc.id === "names") {
      this.text(data.b, cy - 140, { size: 112, weight: 700, color: p.accent, k: k(0.1, 1.1), alpha: A, names: true });
      this.text(T("inv_and"), cy, { size: 44, k: k(0.6), alpha: A });
      this.text(data.g, cy + 140, { size: 112, weight: 700, color: p.accent, k: k(0.9, 1.1), alpha: A, names: true });
      this.ornament(cy + 270, 1.5, k(1.4, 1.2), A);
    }

    if (sc.id === "when") {
      let y = cy - 230;
      if (data.d) {
        this.text(T("inv_save"), y, { size: 28, color: p.accent, k: k(0.1), alpha: A });
        y += 70;
        y += this.text(fmtDate(lang, data.d), y, { size: 48, weight: 700, k: k(0.35), alpha: A });
        if (data.tm) { this.text(fmtTime(lang, data.tm), y + 10, { size: 34, color: p.soft, k: k(0.6), alpha: A }); y += 60; }
        this.ornament(y + 40, 1.3, k(0.8, 1.1), A);
        y += 130;
      }
      if (data.v) {
        this.text(T("inv_venue"), y, { size: 28, color: p.accent, k: k(1.0), alpha: A });
        y += 70;
        y += this.text(data.v, y, { size: 50, weight: 700, k: k(1.2), alpha: A });
        this.text(data.a, y + 10, { size: 30, color: p.soft, k: k(1.45), alpha: A });
      }
    }

    if (sc.id === "events") {
      const n = this.events.length;
      const gap = 150;
      let y = cy - ((n - 1) * gap) / 2 - 40;
      this.text(T("inv_events"), y - 120, { size: 52, weight: 700, color: p.accent, k: k(0.1), alpha: A });
      this.events.forEach((ev, i) => {
        const kk = k(0.5 + i * 0.4);
        this.text(eventName(lang, ev), y, { size: 44, weight: 700, k: kk, alpha: A });
        this.text([fmtDate(lang, ev.d, "short"), fmtTime(lang, ev.tm)].filter(Boolean).join("  ·  "), y + 50, { size: 28, color: p.soft, k: kk, alpha: A });
        if (ev.v) this.text(ev.v, y + 88, { size: 26, color: p.soft, k: kk, alpha: A * 0.9 });
        y += gap;
      });
    }

    if (sc.id === "close") {
      let y = cy - 240;
      y += this.text(T("inv_save"), y, { size: 28, color: p.accent, k: k(0.1) }) + 50;
      y += this.text(`${data.b || ""} ${T("inv_and")} ${data.g || ""}`, y, { size: 72, weight: 700, color: p.accent, k: k(0.3, 1.1), maxW: VIDEO_W - 140, names: true });
      this.ornament(y + 10, 1.5, k(0.7, 1.2));
      y += 100;
      y += this.text(fmtDate(lang, data.d), y, { size: 36, k: k(1.0) }) + 30;
      if (data.m) this.text(`“${data.m}”`, y, { size: 30, italic: true, color: p.soft, k: k(1.4), maxW: VIDEO_W - 200 });
      else if (data.v) this.text(data.v, y, { size: 30, color: p.soft, k: k(1.4) });
    }
  }

  /* Play in real time. Returns a promise that resolves when a non-looping play ends. */
  play({ loop = true, onTime } = {}) {
    this.stop();
    return new Promise((resolve) => {
      this._resolve = resolve;
      const start = performance.now();
      const tick = (now) => {
        let time = (now - start) / 1000;
        if (time >= this.duration) {
          if (!loop) { this.draw(this.duration - 0.001); this.raf = 0; this._resolve = null; resolve(); return; }
          time %= this.duration;
        }
        this.draw(time);
        if (onTime) onTime(time);
        this.raf = requestAnimationFrame(tick);
      };
      this.raf = requestAnimationFrame(tick);
    });
  }

  stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    if (this._resolve) { const r = this._resolve; this._resolve = null; r(); }
    if (this._music) { this._music.stop(); this._music = null; }
    if (this._ac) { this._ac.close().catch(() => {}); this._ac = null; }
  }

  still() { this.stop(); this.draw(this.scenes[1].at + 2.5); }

  /* Play with music through the speakers (for guests). */
  async playWithMusic({ onTime } = {}) {
    const AC = window.AudioContext || window.webkitAudioContext;
    const done = this.play({ loop: false, onTime });
    if (AC) {
      this._ac = new AC();
      this._music = new InviteMusic(this._ac, this._ac.destination);
      this._music.start(this.duration);
    }
    await done;
    this.stop();
  }

  /* Record one full play-through. Resolves to { blob, ext, mime }. */
  async record({ music = true, onProgress } = {}) {
    const mime = pickVideoMime();
    if (!mime || !this.canvas.captureStream) throw new Error("unsupported");
    await this.prepare();
    const stream = this.canvas.captureStream(30);
    let ac = null;
    let player = null;
    if (music) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        ac = new AC();
        const dest = ac.createMediaStreamDestination();
        player = new InviteMusic(ac, dest);
        dest.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr));
      }
    }
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const stopped = new Promise((r) => { rec.onstop = r; });
    rec.start(250);
    if (player) player.start(this.duration);
    await this.play({ loop: false, onTime: (tm) => onProgress && onProgress(tm / this.duration) });
    await new Promise((r) => setTimeout(r, 300));
    rec.stop();
    await stopped;
    if (player) player.stop();
    if (ac) ac.close();
    stream.getTracks().forEach((tr) => tr.stop());
    const type = mime.split(";")[0];
    return { blob: new Blob(chunks, { type }), mime: type, ext: type.includes("mp4") ? "mp4" : "webm" };
  }
}
