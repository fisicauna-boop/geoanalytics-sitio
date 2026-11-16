// Movimiento del sitio: aparición al hacer scroll, tarjetas con inclinación 3D y brillo que sigue al puntero,
// barra de progreso de lectura y leve paralaje. Todo se desactiva si la persona pidió reducir el movimiento.
(function () {
  const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finoPuntero = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const doc = document.documentElement;

  // ---------- Barra de progreso del scroll ----------
  const barra = document.createElement("div");
  barra.className = "progreso-scroll";
  barra.setAttribute("aria-hidden", "true");
  document.body.appendChild(barra);
  let pendiente = false;
  const alScroll = () => {
    if (pendiente) return; pendiente = true;
    requestAnimationFrame(() => {
      pendiente = false;
      const max = doc.scrollHeight - innerHeight;
      barra.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
      doc.classList.toggle("con-scroll", scrollY > 8);
      if (!reducido && portada) {
        const y = Math.min(scrollY, innerHeight);
        portada.style.setProperty("--paralaje", (y * 0.25).toFixed(1) + "px");
      }
    });
  };
  const portada = document.querySelector(".portada");
  addEventListener("scroll", alScroll, { passive: true });
  alScroll();

  if (reducido) return;

  // ---------- Aparición al entrar en pantalla ----------
  const SELECTORES = [
    ".seccion__cabecera", ".seccion__titulo:not(.seccion__cabecera *)", ".seccion__bajada",
    ".servicios-inicio > li", ".areas-esp > li", ".solucion-tarjeta", ".solucion-item", ".demo-tarjeta", ".tarjeta", ".servicio-tarjeta",
    ".metodo__paso", ".industrias-lista > li", ".puntos-contacto > li", ".esencia", ".vitrina", ".cta__caja",
    ".nos-pilares > li", ".nos-pmv > article", ".nos-valores > li", ".nos-personalidad > li", ".nos-segmentos > li", ".nos-no", ".nos-promesa",
    ".lista-preguntas > li", ".contacto-inicio__form", ".simulador__resultado", ".sim-bloque", ".calculadora", ".prosa > *",
  ].join(",");
  const elementos = [...document.querySelectorAll(SELECTORES)].filter((el) => !el.closest(".recorrido, .portada, .encabezado"));
  const visibles = new IntersectionObserver((entradas) => {
    entradas.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("rv-on"); visibles.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  elementos.forEach((el) => {
    // los hermanos aparecen escalonados
    const hermanos = el.parentElement ? [...el.parentElement.children].filter((x) => elementos.includes(x)) : [];
    el.style.setProperty("--rv-i", String(Math.min(8, Math.max(0, hermanos.indexOf(el)))));
    // lo que ya está en pantalla al cargar no se anima
    const r = el.getBoundingClientRect();
    if (r.top < innerHeight * 0.92 && r.bottom > 0) return;
    el.classList.add("rv");
    visibles.observe(el);
  });


  // ---------- Cuatro inteligencias: entrada ligada al scroll y profundidad con el puntero ----------
  const intel = [...document.querySelectorAll("[data-intel]")];
  if (intel.length) {
    const entrada = () => intel.forEach((t) => {
      const r = t.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight * 0.55)));
      t.style.setProperty("--entrada", (1 - Math.pow(1 - p, 3)).toFixed(3));
    });
    addEventListener("scroll", () => requestAnimationFrame(entrada), { passive: true });
    entrada();
    if (finoPuntero) intel.forEach((t) => {
      t.addEventListener("pointermove", (e) => {
        const r = t.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        t.style.setProperty("--px", x.toFixed(3)); t.style.setProperty("--py", y.toFixed(3));
        t.style.setProperty("--rx", (-y * 12).toFixed(2) + "deg"); t.style.setProperty("--ry", (x * 16).toFixed(2) + "deg");
      });
      t.addEventListener("pointerleave", () => { ["--px", "--py"].forEach((v) => t.style.setProperty(v, "0")); ["--rx", "--ry"].forEach((v) => t.style.setProperty(v, "0deg")); });
    });
  }

  // ---------- Inclinación 3D y brillo en tarjetas ----------
  if (finoPuntero) {
    const TARJETAS = ".servicios-inicio a, .areas-esp__item, .solucion-tarjeta, .demo-tarjeta, .tarjeta, .nos-segmentos a, .nos-valores > li, .nos-pilares > li, .industrias-lista a, .solucion-item__demo, .vitrina__imagen";
    document.querySelectorAll(TARJETAS).forEach((t) => {
      t.classList.add("inclina");
      let raf = 0;
      t.addEventListener("pointermove", (e) => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          const r = t.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
          t.style.setProperty("--mx", (x * 100).toFixed(1) + "%");
          t.style.setProperty("--my", (y * 100).toFixed(1) + "%");
          t.style.setProperty("--rx", ((0.5 - y) * 7).toFixed(2) + "deg");
          t.style.setProperty("--ry", ((x - 0.5) * 9).toFixed(2) + "deg");
        });
      });
      t.addEventListener("pointerleave", () => {
        cancelAnimationFrame(raf);
        t.style.setProperty("--rx", "0deg"); t.style.setProperty("--ry", "0deg");
      });
    });

    // Botones con leve atracción al puntero
    document.querySelectorAll(".boton").forEach((b) => {
      b.classList.add("magnetico");
      b.addEventListener("pointermove", (e) => {
        const r = b.getBoundingClientRect();
        b.style.setProperty("--bx", ((e.clientX - r.left - r.width / 2) * 0.18).toFixed(1) + "px");
        b.style.setProperty("--by", ((e.clientY - r.top - r.height / 2) * 0.25).toFixed(1) + "px");
      });
      b.addEventListener("pointerleave", () => { b.style.setProperty("--bx", "0px"); b.style.setProperty("--by", "0px"); });
    });
  }
})();
