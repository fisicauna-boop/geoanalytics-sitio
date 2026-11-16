// Visualizaciones interactivas del artículo de geomarketing. Datos simulados sobre una ciudad ficticia.
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const W = 600, H = 380;
  const el = (n, a = {}, padre) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); padre && padre.appendChild(e); return e; };
  let s = 5; const azar = () => ((s = (s * 16807) % 2147483647) / 2147483647);

  // Demanda simulada en celdas de 20 px: barrio residencial al oeste de la avenida, otro al sureste
  const demanda = [];
  for (let x = 10; x < W; x += 20) for (let y = 10; y < H; y += 20) {
    const w = 0.15 + 0.85 * Math.exp(-((x - 150) ** 2 + (y - 210) ** 2) / 9000) + 0.7 * Math.exp(-((x - 470) ** 2 + (y - 290) ** 2) / 7000) + 0.4 * Math.exp(-((x - 330) ** 2 + (y - 110) ** 2) / 6000) + azar() * 0.12;
    demanda.push({ x, y, w: Math.min(1, w) });
  }
  function base(svg, avenidaX, puenteY, rotY = 22) {
    el("rect", { width: W, height: H, rx: 12, class: "mg-suelo" }, svg);
    const g = el("g", { class: "mg-calles" }, svg);
    for (let x = 40; x < W; x += 40) el("line", { x1: x, y1: 0, x2: x, y2: H }, g);
    for (let y = 40; y < H; y += 40) el("line", { x1: 0, y1: y, x2: W, y2: y }, g);
    const cel = el("g", {}, svg);
    demanda.forEach((d) => el("rect", { x: d.x - 8, y: d.y - 8, width: 16, height: 16, rx: 3, class: "mg-celda", style: `--w:${d.w.toFixed(2)}` }, cel));
    if (avenidaX) {
      el("rect", { x: avenidaX - 7, y: 0, width: 14, height: H, class: "mg-avenida" }, svg);
      el("rect", { x: avenidaX - 12, y: puenteY - 9, width: 24, height: 18, rx: 3, class: "mg-puente" }, svg);
      const t = el("text", { x: avenidaX + 12, y: rotY, class: "mg-txt mg-txt--av" }, svg); t.textContent = "Avenida de difícil cruce";
    }
    return cel;
  }
  // Isócrona aproximada: forma de rombo (se viaja por la grilla) recortada por la avenida salvo en el cruce
  function isocrona(cx, cy, r, avX, puenteY) {
    const pts = [];
    for (let a = 0; a < 120; a++) {
      const t = (a / 120) * Math.PI * 2, c = Math.cos(t), sn = Math.sin(t);
      const rr = r * (0.5 * 1.2 / (Math.abs(c) + Math.abs(sn)) + 0.42) * (1 + 0.04 * Math.sin(7 * t));
      let x = cx + c * rr, y = cy + sn * rr;
      if (avX && (x - avX) * (cx - avX) < 0) x = Math.abs(y - puenteY) < 18 ? avX + Math.sign(x - avX) * Math.min(Math.abs(x - avX), 45) : avX - Math.sign(avX - cx) * 4;
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return pts.join(" ");
  }
  function punto(svg, x, y, clase, texto) {
    const g = el("g", { class: "mg-punto " + clase, transform: `translate(${x} ${y})` }, svg);
    if (clase.includes("comp")) el("rect", { x: -7, y: -7, width: 14, height: 14, transform: "rotate(45)" }, g);
    else { el("circle", { r: 10 }, g); el("circle", { r: 4, fill: "#fff" }, g); }
    if (texto) { const t = el("text", { y: -16, class: "mg-txt" }, g); t.textContent = texto; }
    return g;
  }
  function pestanas(fig, nombres, alCambiar) {
    const barra = fig.querySelector(".mg-pestanas");
    const botones = nombres.map((n, k) => { const b = document.createElement("button"); b.type = "button"; b.textContent = n; b.setAttribute("aria-pressed", k === 0); b.addEventListener("click", () => elegir(k, true)); barra.appendChild(b); return b; });
    let actual = 0, auto = null;
    function elegir(k, usuario) { actual = k; botones.forEach((b, i) => b.setAttribute("aria-pressed", i === k)); alCambiar(k); if (usuario) clearInterval(auto); }
    elegir(0);
    return { autoplay(ms) { if (!matchMedia("(prefers-reduced-motion: reduce)").matches) auto = setInterval(() => elegir((actual + 1) % nombres.length), ms); } };
  }

  // ---------- 1. Radio, isócrona o modelo de atracción ----------
  function metodos(fig, svg) {
    const AV = 360, PU = 120, sitio = [290, 200], comps = [[470, 110], [200, 320]];
    const celdas = base(svg, AV, PU);
    const gRadio = el("circle", { cx: sitio[0], cy: sitio[1], r: 125, class: "mg-capa mg-radio" }, svg);
    const gIso = el("polygon", { points: isocrona(sitio[0], sitio[1], 125, AV, PU), class: "mg-capa mg-iso" }, svg);
    comps.forEach(([x, y]) => punto(svg, x, y, "mg-comp"));
    punto(svg, sitio[0], sitio[1], "mg-propio", "Local evaluado");
    // probabilidad de Huff: atractivo / distancia², normalizado entre el local y los competidores
    const huff = demanda.map((d) => {
      const f = (p, a) => a / Math.max(400, (d.x - p[0]) ** 2 + (d.y - p[1]) ** 2);
      const propio = f(sitio, 1.2), total = propio + comps.reduce((s2, c) => s2 + f(c, 1), 0);
      return propio / total;
    });
    const textos = [
      "<strong>Radio.</strong> Un círculo de distancia fija. Es rápido para explorar, pero ignora que la avenida corta el acceso hacia el este.",
      "<strong>Isócrona.</strong> La zona que se alcanza en un mismo tiempo por las calles. La avenida recorta el área y solo el cruce deja pasar hacia el otro lado.",
      "<strong>Modelo de atracción (Huff).</strong> Cada zona tiene una probabilidad de elegir el local según su atractivo y su distancia frente a los competidores. Las áreas dejan de ser una línea y pasan a ser un gradiente.",
    ];
    const txt = fig.querySelector(".mg-explica");
    const ctl = pestanas(fig, ["Radio", "Isócrona", "Modelo de Huff"], (k) => {
      gRadio.classList.toggle("es-activa", k === 0); gIso.classList.toggle("es-activa", k === 1);
      [...celdas.children].forEach((c, i) => { c.style.setProperty("--p", huff[i].toFixed(2)); c.classList.toggle("mg-celda--huff", k === 2); });
      txt.innerHTML = textos[k];
    });
    return ctl;
  }

  // ---------- 2. Caso hipotético: tres ubicaciones candidatas ----------
  function caso(fig, svg) {
    const AV = 215, PU = 330;
    base(svg, AV, PU, H - 14);
    const sitios = [[255, 200, "A"], [330, 110, "B"], [470, 285, "C"]];
    const comps = [[290, 70], [385, 140], [560, 130]];
    const circ = sitios.map(([x, y]) => el("circle", { cx: x, cy: y, r: 95, class: "mg-capa mg-radio" }, svg));
    const isos = sitios.map(([x, y]) => el("polygon", { points: isocrona(x, y, 95, AV, PU), class: "mg-capa mg-iso" }, svg));
    const gComp = el("g", { class: "mg-capa mg-comps" }, svg);
    comps.forEach(([x, y]) => punto(gComp, x, y, "mg-comp"));
    const marcas = sitios.map(([x, y, n]) => punto(svg, x, y, "mg-cand", "Sitio " + n));
    const halo = el("circle", { cx: sitios[2][0], cy: sitios[2][1], r: 26, class: "mg-halo" }, svg);
    // Niveles relativos ilustrativos (0 a 1) para el panel lateral
    const pasos = [
      { t: "<strong>Población.</strong> Si solo se mira la población del entorno, los tres sitios parecen equivalentes.", n: [0.8, 0.82, 0.74], et: "Demanda en el entorno" },
      { t: "<strong>Accesibilidad.</strong> Con isócronas por calles, el sitio A pierde buena parte del barrio residencial: la avenida lo separa.", n: [0.38, 0.78, 0.8], et: "Demanda alcanzable" },
      { t: "<strong>Competencia.</strong> El sitio B tiene buena demanda, pero comparte casi toda su área con dos competidores.", n: [0.7, 0.28, 0.82], et: "Espacio frente a la competencia" },
      { t: "<strong>Resultado.</strong> El sitio C, con menos población total, combina demanda suficiente, buen acceso y poca oferta cercana: es la mayor brecha de oportunidad.", n: [0.45, 0.5, 0.86], et: "Brecha de oportunidad" },
    ];
    const panel = fig.querySelector(".mg-panel"), txt = fig.querySelector(".mg-explica");
    panel.innerHTML = `<p class="mg-panel__et"></p>` + ["A", "B", "C"].map((n) => `<div class="mg-fila"><span>Sitio ${n}</span><b><i></i></b></div>`).join("") + `<p class="mg-panel__nota">Niveles relativos ilustrativos</p>`;
    const barras = [...panel.querySelectorAll(".mg-fila i")], filas = [...panel.querySelectorAll(".mg-fila")], etP = panel.querySelector(".mg-panel__et");
    const ctl = pestanas(fig, ["1 · Población", "2 · Accesibilidad", "3 · Competencia", "4 · Resultado"], (k) => {
      circ.forEach((c) => c.classList.toggle("es-activa", k === 0));
      isos.forEach((c) => c.classList.toggle("es-activa", k >= 1));
      gComp.classList.toggle("es-activa", k >= 2);
      halo.classList.toggle("es-activa", k === 3);
      marcas.forEach((m, i) => m.classList.toggle("es-mejor", k === 3 && i === 2));
      barras.forEach((b, i) => (b.style.width = pasos[k].n[i] * 100 + "%"));
      filas.forEach((f, i) => f.classList.toggle("es-mejor", k === 3 && i === 2));
      etP.textContent = pasos[k].et; txt.innerHTML = pasos[k].t;
    });
    return ctl;
  }

  const tipos = { metodos, caso };
  document.querySelectorAll("[data-geo]").forEach((fig) => {
    const f = tipos[fig.dataset.geo], lienzo = fig.querySelector(".mg-lienzo");
    if (!f || !lienzo) return;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": fig.dataset.etiqueta || "" });
    lienzo.appendChild(svg);
    const ctl = f(fig, svg);
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { fig.classList.add("es-visible"); ctl.autoplay(5200); io.disconnect(); } }, { threshold: 0.35 });
    io.observe(fig);
  });
})();
