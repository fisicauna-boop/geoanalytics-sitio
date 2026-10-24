// Simulador de costos de estudios.
// Precio de honorarios = costo operativo / (1 − margen). El margen de cada tipo se mantiene entre
// margen_min y margen_max (50–70 %). El costo de campo baja por tramos de volumen (economía de escala)
// y los costos fijos se reparten entre más unidades. Los gastos de viaje fuera de Asunción y
// Gran Asunción se suman aparte, al costo (más margen_gastos_viaje, por defecto 0).

export function costoCampo(tipo, n) {
  // Suma por tramos: cada tramo aplica su factor solo a las unidades que caen dentro de él
  const tramos = [...tipo.escala].sort((a, b) => a.desde - b.desde);
  let total = 0;
  tramos.forEach((t, i) => {
    const desde = t.desde, hasta = i + 1 < tramos.length ? tramos[i + 1].desde - 1 : Infinity;
    const u = Math.max(0, Math.min(n, hasta) - desde + 1);
    total += u * tipo.costo_unitario * t.factor;
  });
  return total;
}

export function calcular(cfg, tipo, n, pctFuera = 0, distanciaId = "cerca") {
  const m = Math.min(cfg.margen_max, Math.max(cfg.margen_min, Number(tipo.margen)));
  const campo = costoCampo(tipo, n);
  const costo = { diseno: tipo.costo_diseno, campo, analisis: tipo.costo_analisis };
  costo.total = costo.diseno + costo.campo + costo.analisis;

  // Gastos fuera de Asunción y Gran Asunción
  const v = cfg.viaje, dist = v.distancias.find((d) => d.id === distanciaId) || v.distancias[0];
  const unidadesFuera = Math.round(n * pctFuera);
  const diasPersona = unidadesFuera > 0 ? Math.ceil(unidadesFuera / tipo.productividad_dia) : 0;
  const diasCampo = diasPersona > 0 ? Math.ceil(diasPersona / tipo.equipo) : 0;
  const viajes = diasCampo > 0 ? Math.ceil(diasCampo / v.dias_por_viaje) : 0;
  const viaje = {
    unidadesFuera, diasPersona, diasCampo, viajes, distancia: dist,
    viaticos: diasPersona * v.viatico_dia,
    hotel: dist.pernocte ? diasPersona * v.hotel_noche : 0,
    transporte: viajes * dist.km * 2 * v.costo_km,
  };
  viaje.total = (viaje.viaticos + viaje.hotel + viaje.transporte) * (1 + (cfg.margen_gastos_viaje || 0));

  const f = 1 / (1 - m);
  const honorarios = { diseno: costo.diseno * f, campo: costo.campo * f, analisis: costo.analisis * f };
  honorarios.total = costo.total * f;
  const subtotal = honorarios.total + viaje.total;
  const iva = subtotal * cfg.iva;
  return {
    margen: m, costo, honorarios, viaje, subtotal, iva, total: subtotal + iva,
    ganancia: honorarios.total - costo.total,
    precioUnidad: honorarios.total / n,
    rango: [subtotal * (1 - cfg.rango_referencial), subtotal * (1 + cfg.rango_referencial)],
  };
}

// ---------------- Interfaz ----------------
const raiz = typeof document !== "undefined" ? document.querySelector("[data-simulador]") : null;
if (raiz) {
  const cfg = JSON.parse(document.getElementById("simulador-config").textContent);
  const interno = raiz.dataset.modo === "interno";
  const $ = (s) => raiz.querySelector(s);
  const red = (x) => Math.round(x / cfg.redondeo) * cfg.redondeo;
  const fmt = (x, redondear = true) => `${cfg.moneda} ${new Intl.NumberFormat("es-PY", { maximumFractionDigits: redondear ? 0 : 2, minimumFractionDigits: redondear ? 0 : 2 }).format(redondear ? red(x) : x)}`;
  const pct = (x) => `${Math.round(x * 100)} %`;
  const n0 = new Intl.NumberFormat("es-PY");

  const baseContacto = $("#r-cotizar").getAttribute("href").split("?")[0];
  const tipoSel = () => cfg.tipos.find((t) => t.id === raiz.querySelector('input[name="tipo"]:checked')?.value) || cfg.tipos[0];
  const rango = $("#s-cantidad"), num = $("#s-cantidad-num"), fuera = $("#s-fuera"), dist = $("#s-distancia");

  function configurarCantidad(t, valor) {
    [rango, num].forEach((el) => { el.min = t.cantidad_min; el.max = t.cantidad_max; el.step = t.paso; el.value = valor ?? t.cantidad_inicial; });
    raiz.querySelectorAll("[data-unidades]").forEach((e) => (e.textContent = t.unidades));
  }

  function grafico(t, n) {
    const W = Math.max(280, Math.round($("#r-grafico").clientWidth || 520)), H = Math.round(Math.min(220, Math.max(170, W * 0.42))), ml = 46, mr = 12, mt = 16, mb = 34;
    const xs = [], pasos = 48;
    const lmin = Math.log(t.cantidad_min), lmax = Math.log(t.cantidad_max);
    for (let i = 0; i <= pasos; i++) xs.push(Math.round(Math.exp(lmin + (lmax - lmin) * i / pasos)));
    const pts = [...new Set(xs)].map((x) => [x, calcular(cfg, t, Math.max(1, x)).precioUnidad]);
    const yMax = pts[0][1] * 1.05, yMin = 0;
    const X = (x) => ml + (Math.log(x) - lmin) / ((lmax - lmin) || 1) * (W - ml - mr);
    const Y = (y) => mt + (1 - (y - yMin) / (yMax - yMin)) * (H - mt - mb);
    const linea = pts.map(([x, y], i) => `${i ? "L" : "M"}${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join("");
    const area = `${linea}L${X(pts.at(-1)[0]).toFixed(1)},${Y(0)}L${X(pts[0][0]).toFixed(1)},${Y(0)}Z`;
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((k) => yMax * k);
    const xTicks = [t.cantidad_min, Math.round(Math.exp((lmin + lmax) / 2)), t.cantidad_max];
    const actual = calcular(cfg, t, n).precioUnidad;
    const cx = X(n), cy = Y(actual);
    const etiqueta = fmt(actual, actual >= 100);
    const alinear = cx > W - 140 ? "end" : "start", dx = cx > W - 140 ? -10 : 10;
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Precio por ${t.unidad} según la cantidad de ${t.unidades}">
      ${yTicks.map((y) => `<line x1="${ml}" x2="${W - mr}" y1="${Y(y).toFixed(1)}" y2="${Y(y).toFixed(1)}" class="g-grilla"/><text x="${ml - 8}" y="${(Y(y) + 4).toFixed(1)}" text-anchor="end" class="g-texto">${y < 100 && y > 0 ? y.toFixed(1).replace(".", ",") : Math.round(y)}</text>`).join("")}
      ${xTicks.map((x) => `<text x="${X(x).toFixed(1)}" y="${H - 12}" text-anchor="middle" class="g-texto">${n0.format(x)}</text>`).join("")}
      <path d="${area}" class="g-area"/><path d="${linea}" class="g-linea"/>
      <line x1="${cx.toFixed(1)}" x2="${cx.toFixed(1)}" y1="${cy.toFixed(1)}" y2="${Y(0)}" class="g-guia"/>
      <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="5.5" class="g-punto"/>
      <text x="${(cx + dx).toFixed(1)}" y="${(cy - 10).toFixed(1)}" text-anchor="${alinear}" class="g-valor">${etiqueta}</text>
      <text x="${ml}" y="${H - 0}" class="g-eje">${t.unidades} →</text>
    </svg>`;
  }

  function actualizar() {
    const t = tipoSel();
    const n = Math.min(t.cantidad_max, Math.max(t.cantidad_min, Math.round(Number(num.value) || t.cantidad_inicial)));
    const pf = Number(fuera.value) / 100;
    $("#s-fuera-valor").textContent = `${Math.round(pf * 100)} %`;
    $("#s-distancia-campo").hidden = pf === 0;
    const r = calcular(cfg, t, n, pf, dist.value);
    const base = calcular(cfg, t, t.cantidad_min);

    $("#r-total").textContent = fmt(r.subtotal);
    $("#r-rango").textContent = `Rango referencial: ${fmt(r.rango[0])} a ${fmt(r.rango[1])}, más IVA`;
    $("#r-diseno").textContent = fmt(r.honorarios.diseno);
    $("#r-campo").textContent = fmt(r.honorarios.campo);
    $("#r-analisis").textContent = fmt(r.honorarios.analisis);
    $("#r-viaje").textContent = r.viaje.total ? fmt(r.viaje.total) : "No aplica";
    $("#r-viaje-detalle").textContent = r.viaje.total
      ? `${r.viaje.diasPersona} días-persona de campo, ${r.viaje.viajes} ${r.viaje.viajes === 1 ? "viaje" : "viajes"}${r.viaje.distancia.pernocte ? ", con hotel" : ""}`
      : "Todo el campo en Asunción y Gran Asunción";
    $("#r-subtotal").textContent = fmt(r.subtotal);
    $("#r-iva").textContent = fmt(r.iva);
    $("#r-con-iva").textContent = fmt(r.total);
    $("#r-unidad").textContent = fmt(r.precioUnidad, r.precioUnidad >= 100);
    $("#r-unidad-nombre").textContent = t.unidad;
    const ahorro = 1 - r.precioUnidad / base.precioUnidad;
    $("#r-escala").textContent = n > t.cantidad_min && ahorro > 0.005
      ? `${pct(ahorro)} menos por ${t.unidad} que con ${n0.format(t.cantidad_min)} ${t.unidades}`
      : `Con más ${t.unidades}, el precio por ${t.unidad} baja`;
    $("#r-grafico").innerHTML = grafico(t, n);
    const barra = $("#r-barra-total"); if (barra) barra.textContent = `${fmt(r.subtotal)} más IVA`;

    if (interno) {
      $("#i-costo").textContent = fmt(r.costo.total, false);
      $("#i-costo-detalle").textContent = `Diseño ${fmt(r.costo.diseno, false)} · Campo ${fmt(r.costo.campo, false)} · Análisis ${fmt(r.costo.analisis, false)}`;
      $("#i-margen").textContent = pct(r.margen);
      $("#i-ganancia").textContent = fmt(r.ganancia, false);
      $("#i-proporcion").textContent = `El costo operativo es el ${pct(r.costo.total / r.honorarios.total)} del precio de honorarios`;
      $("#i-viaje").textContent = `Viáticos ${fmt(r.viaje.viaticos, false)} · Hotel ${fmt(r.viaje.hotel, false)} · Transporte ${fmt(r.viaje.transporte, false)} (${r.viaje.distancia.km} km × 2 × ${r.viaje.viajes})`;
      $("#i-campo").textContent = `${n0.format(r.viaje.unidadesFuera)} ${t.unidades} fuera de A y GA · ${r.viaje.diasCampo} días de campo con equipo de ${t.equipo}`;
      $("#i-unitario").textContent = `Costo de campo: ${fmt(r.costo.campo / n, false)} por ${t.unidad} (base ${fmt(t.costo_unitario, false)})`;
    }

    // Enlace a la cotización formal con el detalle precargado
    const detalle = `Simulación: ${t.nombre}, ${n0.format(n)} ${t.unidades}` +
      (pf > 0 ? `, ${Math.round(pf * 100)} % del campo fuera de Asunción y Gran Asunción (${r.viaje.distancia.nombre.toLowerCase()})` : ", campo en Asunción y Gran Asunción") +
      `. Precio referencial: ${fmt(r.subtotal)} más IVA.`;
    $("#r-cotizar").href = `${baseContacto}?tema=simulador&detalle=${encodeURIComponent(detalle)}`;
  }

  raiz.querySelectorAll('input[name="tipo"]').forEach((el) => el.addEventListener("change", () => { configurarCantidad(tipoSel()); actualizar(); }));
  rango.addEventListener("input", () => { num.value = rango.value; actualizar(); });
  num.addEventListener("input", () => { rango.value = num.value; actualizar(); });
  num.addEventListener("change", () => { const t = tipoSel(); num.value = Math.min(t.cantidad_max, Math.max(t.cantidad_min, Number(num.value) || t.cantidad_inicial)); rango.value = num.value; actualizar(); });
  [fuera, dist].forEach((el) => el.addEventListener("input", actualizar));
  configurarCantidad(tipoSel());
  actualizar();
  new ResizeObserver(() => actualizar()).observe($("#r-grafico"));

  // Barra de precio en teléfonos: visible mientras el resultado no está en pantalla
  const barra = $(".sim-barra"), resultado = $(".simulador__resultado");
  if (barra && "IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => { barra.hidden = e.isIntersecting; }, { threshold: 0.15 }).observe(resultado);
    barra.querySelector("button").addEventListener("click", () => resultado.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
}
