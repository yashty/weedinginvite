/* Shared UI: one icon set (1.6px stroke) and Motion helpers.
 * Motion (js/vendor/motion.js) is optional: without it, or with reduced motion,
 * everything renders in its final state.
 */

const ICON_PATHS = {
  mark: '<path d="M12 3c2.6 3 2.6 7 0 10c-2.6-3-2.6-7 0-10z"/><path d="M12 13c-3.4-.3-6.4 1.2-8 4c3.4.5 6.3-1 8-4zM12 13c3.4-.3 6.4 1.2 8 4c-3.4.5-6.3-1-8-4z"/><path d="M6 20.5h12"/>',
  arrow: '<path d="M5 12h14M13 6l6 6l-6 6"/>',
  link: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>',
  chat: '<path d="M20 11.5a8 8 0 0 1-11.6 7.1L4 20l1.4-4.2A8 8 0 1 1 20 11.5z"/><path d="M9 10.5h6M9 13.5h4"/>',
  download: '<path d="M12 4v11M7 10l5 5l5-5"/><path d="M5 20h14"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2.5"/><path d="M16 10.5l5-3v9l-5-3z"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z"/>',
  music: '<path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 12.5h9L17.5 7"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5S21.5 12 21.5 12S18 18.5 12 18.5S2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  share: '<circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="M8.2 10.8l7.6-4.1M8.2 13.2l7.6 4.1"/>',
};

function icon(name) {
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${ICON_PATHS[name] || ""}</svg>`;
}

/* Replace <i data-icon="name"></i> placeholders with SVG icons. */
function hydrateIcons(root = document) {
  root.querySelectorAll("i[data-icon]").forEach((el) => { el.outerHTML = icon(el.dataset.icon); });
}

const FX = (() => {
  const M = window.Motion;
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const on = !!(M && !reduce);
  const easeOut = [0.16, 1, 0.3, 1];
  return {
    on,
    reduce,
    /* The hero's one authored moment: lines rise and un-blur in sequence. */
    intro(els, { delay = 0 } = {}) {
      if (!on || !els.length) return;
      M.animate(els, { opacity: [0, 1], y: [22, 0], filter: ["blur(8px)", "blur(0px)"] },
        { duration: 0.9, delay: M.stagger(0.09, { startDelay: delay }), ease: easeOut });
    },
    /* Arrival of the product visual (phone/card). */
    rise(el, { delay = 0.25 } = {}) {
      if (!on || !el) return;
      M.animate(el, { opacity: [0, 1], y: [40, 0], scale: [0.97, 1] }, { duration: 1.1, delay, ease: easeOut });
    },
    /* Blur cross-fade while content changes (language switch, template switch). */
    async swap(el, update) {
      if (!on || !el) { update(); return; }
      await M.animate(el, { opacity: 0.25, filter: "blur(6px)", scale: 0.985 }, { duration: 0.16, ease: "easeIn" });
      update();
      M.animate(el, { opacity: 1, filter: "blur(0px)", scale: 1 }, { duration: 0.5, ease: easeOut });
    },
    /* Guest cover lifting away like an envelope flap. */
    async openCover(cover, content) {
      if (!on) { cover.remove(); return; }
      M.animate(cover.querySelector(".cover-inner"), { opacity: 0, y: -30, filter: "blur(6px)" }, { duration: 0.35, ease: "easeIn" });
      await M.animate(cover, { clipPath: ["inset(0% 0% 0% 0%)", "inset(0% 0% 100% 0%)"] }, { duration: 0.9, delay: 0.15, ease: [0.7, 0, 0.2, 1] });
      cover.remove();
      if (content) {
        const parts = content.querySelectorAll(".invite-frame > *");
        M.animate(parts, { opacity: [0, 1], y: [16, 0] }, { duration: 0.7, delay: M.stagger(0.05), ease: easeOut });
      }
    },
    pop(el) {
      if (!on || !el) return;
      M.animate(el, { scale: [0.96, 1], opacity: [0, 1] }, { duration: 0.45, ease: easeOut });
    },
  };
})();

/* Pause canvas videos while they are off-screen. */
function whenVisible(el, onShow, onHide) {
  if (!("IntersectionObserver" in window)) { onShow(); return; }
  new IntersectionObserver((entries) => {
    entries.forEach((e) => (e.isIntersecting ? onShow() : onHide()));
  }, { threshold: 0.15 }).observe(el);
}

/* Polite screen-reader announcement (does not move focus). */
function announce(msg) {
  let r = document.getElementById("sr-status");
  if (!r) {
    r = document.createElement("div");
    r.id = "sr-status";
    r.className = "sr-only";
    r.setAttribute("role", "status");
    r.setAttribute("aria-live", "polite");
    document.body.appendChild(r);
  }
  r.textContent = "";
  setTimeout(() => { r.textContent = msg; }, 30);
}

/* Small toast with an optional action (e.g. Undo). Auto-dismisses after 5 s. */
function toast(msg, { action, onAction, ms = 5000 } = {}) {
  document.querySelectorAll(".toast").forEach((x) => x.remove());
  const el = document.createElement("div");
  el.className = "toast";
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");
  el.innerHTML = `<span></span>${action ? "<button type=\"button\"></button>" : ""}`;
  el.firstElementChild.textContent = msg;
  let timer;
  const close = () => { clearTimeout(timer); el.remove(); };
  if (action) {
    const b = el.querySelector("button");
    b.textContent = action;
    b.addEventListener("click", () => { close(); onAction && onAction(); });
  }
  document.body.appendChild(el);
  FX.pop(el);
  timer = setTimeout(close, ms);
  return close;
}
