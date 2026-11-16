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
    t.classList.remove("es-reinicio"); void t.offsetWidth; t.classList.add("es-reinicio");
  };
  // Avance automático cada 7 segundos hasta que la persona elija una pestaña
  const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let auto = !reducido, temporizador = null, encima = false, visible = false;
  const siguiente = () => {
    if (!auto || encima || !visible) return;
    const i = tabs.findIndex((x) => x.getAttribute("aria-selected") === "true");
    activar(tabs.at((i + 1) % tabs.length));
  };
  const reiniciar = () => { clearInterval(temporizador); raiz.classList.toggle("vitrina--auto", auto); if (auto) temporizador = setInterval(siguiente, 7000); };
  const detener = () => { auto = false; reiniciar(); };
  raiz.addEventListener("pointerenter", () => { encima = true; raiz.classList.add("vitrina--pausa"); });
  raiz.addEventListener("pointerleave", () => { encima = false; raiz.classList.remove("vitrina--pausa"); });
  new IntersectionObserver((e) => { visible = e[0].isIntersecting; }, { threshold: 0.4 }).observe(raiz);
  const activarOriginal = activar;
  reiniciar();
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => { detener(); activarOriginal(t); });
    t.addEventListener("keydown", (e) => {
      const d = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
      if (d) { e.preventDefault(); detener(); activar(tabs.at((i + d + tabs.length) % tabs.length), true); }
    });
  });
})();
