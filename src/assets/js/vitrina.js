// Pestañas de la vitrina de demostraciones (inicio)
(function () {
  const raiz = document.querySelector("[data-vitrina]");
  if (!raiz) return;
  const tabs = [...raiz.querySelectorAll('[role="tab"]')];
  const activar = (t, foco) => {
    tabs.forEach((x) => {
      const sel = x === t;
      x.setAttribute("aria-selected", String(sel));
      x.tabIndex = sel ? 0 : -1;
      document.getElementById(x.getAttribute("aria-controls")).hidden = !sel;
    });
    if (foco) t.focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => activar(t));
    t.addEventListener("keydown", (e) => {
      const d = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
      if (d) { e.preventDefault(); activar(tabs.at((i + d + tabs.length) % tabs.length), true); }
    });
  });
})();
