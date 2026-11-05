/* Light / mid-dark theme. Loaded in <head> so the saved choice is applied before first paint.
 * Resolves to an explicit data-theme ("light" | "dark") on <html>; follows the OS until the visitor picks one. */
(() => {
  const root = document.documentElement;
  const KEY = "sn-theme";
  const mq = matchMedia("(prefers-color-scheme: dark)");
  const COLORS = { light: "#FBF9F5", dark: "#161412" };
  const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const resolve = () => read() || (mq.matches ? "dark" : "light");

  function apply(theme) {
    root.dataset.theme = theme;
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
      m.content = COLORS[theme];
      m.removeAttribute("media");
    });
    document.querySelectorAll(".theme-toggle").forEach((b) => b.setAttribute("aria-pressed", String(theme === "dark")));
  }

  apply(resolve());
  mq.addEventListener("change", () => { if (!read()) apply(resolve()); });

  document.addEventListener("DOMContentLoaded", () => {
    apply(root.dataset.theme);
    document.querySelectorAll(".theme-toggle").forEach((b) => b.addEventListener("click", () => {
      const next = root.dataset.theme === "dark" ? "light" : "dark";
      try { localStorage.setItem(KEY, next); } catch { /* private mode: still switch for this visit */ }
      root.classList.add("theme-anim");
      apply(next);
      clearTimeout(apply.t);
      apply.t = setTimeout(() => root.classList.remove("theme-anim"), 800);
    }));
  });
})();
