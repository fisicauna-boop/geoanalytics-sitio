// Tres mapas explicativos del artículo sobre redes de puntos de venta.
// Datos simulados: la ciudad, la demanda y las ubicaciones son ficticias y solo ilustran el método.
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const AN = 12, PR = 8, E = 50; // ciudad de 12 × 8 unidades, 50 px por unidad
  const propios = [[-3.6, 1.5], [-2.3, 0.6], [-0.6, -1.9], [1.1, 2.0], [-4.6, -2.1], [2.5, 0.0]];
  const competidores = [[0.4, 0.4], [-1.5, 2.9], [3.4, 2.6], [-3.1, -0.9], [4.8, 0.9]];
  const RINF = 1.45, brecha = { x: 3.9, z: -2.2, r: 1.05 };
  const X = (x) => (x + AN / 2) * E, Y = (z) => (PR / 2 - z) * E; // z positivo hacia arriba en el plano

  // Demanda simulada: una celda por cuadra, más densa en la zona de brecha y en el centro
  let s = 11; const azar = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const demanda = [];
  for (let i = 0; i < AN * 2; i++) for (let j = 0; j < PR * 2; j++) {
    const x = -AN / 2 + (i + 0.5) / 2, z = -PR / 2 + (j + 0.5) / 2;
    const w = 0.25 + 0.9 * Math.exp(-((x - brecha.x) ** 2 + (z - brecha.z) ** 2) / 1.6) + 0.45 * Math.exp(-(x * x + z * z) / 9) + azar() * 0.25;
    const cubre = propios.filter(([px, pz]) => Math.hypot(px - x, pz - z) < RINF).length;
    demanda.push({ x, z, w, cubre });
  }

  const el = (n, a = {}, padre) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); padre && padre.appendChild(e); return e; };

  function base(svg) {
    el("rect", { x: 0, y: 0, width: AN * E, height: PR * E, rx: 14, class: "mr-suelo" }, svg);
    const g = el("g", { class: "mr-calles" }, svg);
    for (let x = 1; x < AN; x++) el("line", { x1: x * E, y1: 0, x2: x * E, y2: PR * E }, g);
    for (let z = 1; z < PR; z++) el("line", { x1: 0, y1: z * E, x2: AN * E, y2: z * E }, g);
  }
  function celdas(svg, clase) {
    const g = el("g", { class: "mr-demanda" }, svg);
    demanda.forEach((d, k) => {
      const c = clase(d);
      el("rect", { x: X(d.x) - 11, y: Y(d.z) - 11, width: 22, height: 22, rx: 4, class: c, style: `--w:${Math.min(1, d.w).toFixed(2)};--k:${k % 37}` }, g);
    });
  }
  function areas(svg, resaltar) {
    const g = el("g", { class: "mr-areas" }, svg);
    propios.forEach(([x, z], k) => el("circle", { cx: X(x), cy: Y(z), r: RINF * E, class: "mr-area" + (resaltar && k < 2 ? " mr-area--sup" : ""), style: `--k:${k}` }, g));
  }
  function puntos(svg) {
    const g = el("g", {}, svg);
    competidores.forEach(([x, z]) => el("rect", { x: X(x) - 7, y: Y(z) - 7, width: 14, height: 14, class: "mr-comp", transform: `rotate(45 ${X(x)} ${Y(z)})` }, g));
    propios.forEach(([x, z]) => { el("circle", { cx: X(x), cy: Y(z), r: 9, class: "mr-propio" }, g); el("circle", { cx: X(x), cy: Y(z), r: 3.5, fill: "#fff" }, g); });
  }
  function rotulo(svg, x, y, texto, clase) {
    const g = el("g", { class: "mr-rotulo " + (clase || "") }, svg);
    const t = el("text", { x, y }, g); t.textContent = texto;
    return g;
  }
  function lente(svg) {
    const [A, B] = propios;
    const d = Math.hypot(B[0] - A[0], B[1] - A[1]), h = Math.sqrt(RINF * RINF - (d / 2) ** 2);
    const mx = (A[0] + B[0]) / 2, mz = (A[1] + B[1]) / 2, ux = -(B[1] - A[1]) / d, uz = (B[0] - A[0]) / d;
    const p1 = [X(mx + ux * h), Y(mz + uz * h)], p2 = [X(mx - ux * h), Y(mz - uz * h)], r = RINF * E;
    el("path", { d: `M${p1} A${r},${r} 0 0 1 ${p2} A${r},${r} 0 0 1 ${p1}Z`, class: "mr-lente" }, svg);
    return [X(mx), Y(mz)];
  }

  const dibujos = {
    cobertura(svg) {
      base(svg);
      celdas(svg, (d) => "mr-celda " + (d.cubre ? "mr-celda--cubierta" : "mr-celda--fuera"));
      areas(svg); puntos(svg);
    },
    superposicion(svg) {
      base(svg);
      celdas(svg, (d) => "mr-celda mr-celda--tenue");
      areas(svg, true);
      const [cx, cy] = lente(svg);
      puntos(svg);
      rotulo(svg, cx, cy - RINF * E - 10, "Posible solapamiento", "mr-rotulo--sup");
    },
    brechas(svg) {
      base(svg);
      celdas(svg, (d) => "mr-celda " + (d.cubre ? "mr-celda--tenue" : d.w > 0.75 && Math.hypot(d.x - brecha.x, d.z - brecha.z) < 1.7 ? "mr-celda--brecha" : "mr-celda--fuera"));
      areas(svg); puntos(svg);
      el("circle", { cx: X(brecha.x), cy: Y(brecha.z), r: brecha.r * E + 14, class: "mr-aro-brecha" }, svg);
      const o = el("g", { class: "mr-oport", transform: `translate(${X(brecha.x)} ${Y(brecha.z)})` }, svg);
      el("circle", { r: 20, class: "mr-oport__halo" }, o); el("path", { d: "M0,-11 L11,0 L0,11 L-11,0Z", class: "mr-oport__marca" }, o);
      rotulo(svg, X(brecha.x) - brecha.r * E - 22, Y(brecha.z) + 5, "Brecha con alta demanda", "mr-rotulo--brecha mr-rotulo--fin");
    },
  };

  document.querySelectorAll("[data-mapa-red]").forEach((fig) => {
    const tipo = fig.dataset.mapaRed, lienzo = fig.querySelector(".mapa-red__lienzo");
    if (!dibujos[tipo] || !lienzo) return;
    const svg = el("svg", { viewBox: `0 0 ${AN * E} ${PR * E}`, role: "img", "aria-label": fig.dataset.etiqueta || "" });
    dibujos[tipo](svg);
    lienzo.appendChild(svg);
    if (!("IntersectionObserver" in window)) { fig.classList.add("es-visible"); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { fig.classList.add("es-visible"); io.disconnect(); } }, { threshold: 0.3 });
    io.observe(fig);
  });
})();
