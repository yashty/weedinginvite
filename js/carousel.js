/* Design carousel: native scroll-snap track with a coverflow treatment computed from scroll position.
 * Touch and trackpad scroll natively; mouse drags; arrows, keyboard and a slow autoplay (stops on any interaction).
 * Needs: markup from index.html, FX / whenVisible from ui.js, optional Motion for the entrance.
 */
function initCarousel(root) {
  const track = root.querySelector(".car-track");
  const nameEl = root.querySelector(".car-name");
  const countEl = root.querySelector(".car-count");
  const bar = root.querySelector(".car-progress i");
  const prev = root.querySelector(".car-prev"), next = root.querySelector(".car-next");
  const M = window.Motion;
  let tiles = [], idx = -1, raf = 0, auto = 0, stopped = FX.reduce, inView = false, dragging = false;

  const centerOf = (t) => t.offsetLeft + t.offsetWidth / 2 - track.clientWidth / 2;
  /* Snap is paused while we scroll programmatically: long smooth jumps stall against mandatory snap points. */
  let snapT = 0;
  const go = (i) => {
    i = Math.max(0, Math.min(tiles.length - 1, i));
    const restore = () => { clearTimeout(snapT); if (!dragging) track.style.scrollSnapType = ""; };
    track.style.scrollSnapType = "none";
    track.scrollTo({ left: centerOf(tiles[i]), behavior: "smooth" });
    clearTimeout(snapT);
    if ("onscrollend" in window) { track.addEventListener("scrollend", restore, { once: true }); snapT = setTimeout(restore, 2500); }
    else snapT = setTimeout(restore, 1600);
  };

  /* Coverflow: distance from the viewport centre (in card widths) drives scale, tilt, depth and fade. */
  function paint() {
    raf = 0;
    if (!tiles.length) return;
    const mid = track.scrollLeft + track.clientWidth / 2;
    const step = tiles[0].offsetWidth + (parseFloat(getComputedStyle(track).columnGap) || 0);
    let best = 0, bestD = Infinity;
    tiles.forEach((t, i) => {
      const d = (t.offsetLeft + t.offsetWidth / 2 - mid) / step, a = Math.min(Math.abs(d), 3);
      t.style.transform = `translateZ(${-a * 90}px) rotateY(${Math.max(-1, Math.min(1, -d)) * Math.min(a, 1.4) * 26}deg) scale(${1 - a * 0.07})`;
      t.style.opacity = String(Math.max(0.28, 1 - a * 0.3));
      t.style.zIndex = String(10 - Math.round(a));
      if (Math.abs(d) < bestD) { bestD = Math.abs(d); best = i; }
    });
    if (best !== idx) setActive(best);
  }
  const schedule = () => { if (!raf) raf = requestAnimationFrame(paint); };

  function setActive(i) {
    const first = idx === -1;
    idx = i;
    tiles.forEach((t, k) => { t.classList.toggle("is-active", k === i); t.tabIndex = k === i ? 0 : -1; t.setAttribute("aria-current", String(k === i)); });
    const t = tiles[i];
    countEl.textContent = `${String(i + 1).padStart(2, "0")} / ${String(tiles.length).padStart(2, "0")}`;
    bar.style.transform = `translateX(${i * 100}%)`;
    prev.disabled = i === 0; next.disabled = i === tiles.length - 1;
    if (first || !FX.on) { nameEl.textContent = t.dataset.name; return; }
    M.animate(nameEl, { opacity: 0, y: -10, filter: "blur(6px)" }, { duration: 0.14, ease: "easeIn" }).then(() => {
      nameEl.textContent = t.dataset.name;
      M.animate(nameEl, { opacity: [0, 1], y: [12, 0], filter: ["blur(6px)", "blur(0px)"] }, { duration: 0.6, ease: [0.16, 1, 0.3, 1] });
    });
  }

  function refresh() {
    tiles = [...track.querySelectorAll(".tile")];
    bar.style.width = `${100 / Math.max(tiles.length, 1)}%`;
    const keep = Math.max(idx, 0);
    idx = -1;
    if (tiles.length) { track.scrollLeft = centerOf(tiles[Math.min(keep, tiles.length - 1)]); }
    paint();
    if (FX.on && !track.dataset.shown) track.dataset.pre = "";
  }

  /* Entrance: the cards rise out of a soft blur, one after another, the first time the section is seen. */
  function enter() {
    if (track.dataset.shown) return;
    track.dataset.shown = "1";
    delete track.dataset.pre;
    if (!FX.on) return;
    const mid = Math.max(idx, 0);
    const order = tiles.map((t, i) => [t.querySelector(".tile-preview"), Math.abs(i - mid)]).sort((a, b) => a[1] - b[1]);
    order.forEach(([el, rank]) => M.animate(el, { opacity: [0, 1], y: [64, 0], filter: ["blur(10px)", "blur(0px)"] }, { duration: 1.1, delay: 0.06 * rank, ease: [0.16, 1, 0.3, 1] }));
  }

  /* Autoplay: gentle, only while visible, never after the visitor has touched it. */
  const stop = () => { stopped = true; clearInterval(auto); };
  function tick() { go(idx >= tiles.length - 1 ? 0 : idx + 1); }
  function play() { clearInterval(auto); if (!stopped && inView) auto = setInterval(tick, 4200); }

  track.addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", () => { paint(); });
  prev.addEventListener("click", () => { stop(); go(idx - 1); });
  next.addEventListener("click", () => { stop(); go(idx + 1); });
  root.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { stop(); go(idx + 1); e.preventDefault(); }
    else if (e.key === "ArrowLeft") { stop(); go(idx - 1); e.preventDefault(); }
    else if (e.key === "Home") { stop(); go(0); e.preventDefault(); }
    else if (e.key === "End") { stop(); go(tiles.length - 1); e.preventDefault(); }
  });
  ["pointerdown", "wheel", "touchstart", "focusin"].forEach((ev) => root.addEventListener(ev, stop, { passive: true }));

  /* A side card brings itself to the centre first; only the centred card opens the editor. */
  track.addEventListener("click", (e) => {
    const t = e.target.closest(".tile"); if (!t) return;
    const i = tiles.indexOf(t);
    if (i !== idx || track.dataset.moved) { e.preventDefault(); if (i !== idx) go(i); }
  });

  /* Mouse drag (touch already scrolls natively). */
  let sx = 0, sl = 0;
  track.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    dragging = true; sx = e.clientX; sl = track.scrollLeft; delete track.dataset.moved;
    track.style.scrollSnapType = "none"; track.classList.add("grabbing");
  });
  addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - sx;
    if (Math.abs(dx) > 5) track.dataset.moved = "1";
    track.scrollLeft = sl - dx;
  });
  addEventListener("pointerup", () => {
    if (!dragging) return;
    dragging = false; track.classList.remove("grabbing"); track.style.scrollSnapType = "";
    const mid = track.scrollLeft;
    let best = 0;
    tiles.forEach((t, i) => { if (Math.abs(centerOf(t) - mid) < Math.abs(centerOf(tiles[best]) - mid)) best = i; });
    go(best);
    setTimeout(() => delete track.dataset.moved, 50);
  });

  whenVisible(root, () => { inView = true; enter(); play(); }, () => { inView = false; clearInterval(auto); });
  refresh();
  return { refresh };
}
