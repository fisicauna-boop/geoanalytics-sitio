// Demostración: tablero de desempeño por sucursal y categoría con una cadena ficticia.
// Los datos se generan en el navegador con una semilla: sucursal + categoría + tendencia semanal + ruido.

export function rng(semilla) { let s = (semilla * 2654435761) >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const normal = (r) => { let u = 0; for (let i = 0; i < 6; i++) u += r(); return (u - 3) / Math.SQRT1_2; };

export const SUCURSALES = [
  { id: "S01", nombre: "Sucursal 01 · Centro", zona: "Asunción" },
  { id: "S02", nombre: "Sucursal 02 · Villa Morra", zona: "Asunción" },
  { id: "S03", nombre: "Sucursal 03 · Sajonia", zona: "Asunción" },
  { id: "S04", nombre: "Sucursal 04 · Mburucuyá", zona: "Asunción" },
  { id: "S05", nombre: "Sucursal 05 · San Lorenzo", zona: "Central" },
  { id: "S06", nombre: "Sucursal 06 · Luque", zona: "Central" },
  { id: "S07", nombre: "Sucursal 07 · Lambaré", zona: "Central" },
  { id: "S08", nombre: "Sucursal 08 · Capiatá", zona: "Central" },
  { id: "S09", nombre: "Sucursal 09 · Fernando de la Mora", zona: "Central" },
  { id: "S10", nombre: "Sucursal 10 · Ciudad del Este", zona: "Interior" },
  { id: "S11", nombre: "Sucursal 11 · Encarnación", zona: "Interior" },
  { id: "S12", nombre: "Sucursal 12 · Coronel Oviedo", zona: "Interior" },
];
export const CATEGORIAS = ["Almacén", "Bebidas", "Lácteos", "Limpieza", "Perfumería", "Frutas y verduras"];
export const INDICADORES = [
  { id: "ventas", nombre: "Ventas frente al objetivo", corto: "Ventas / objetivo", unidad: "%", base: 98, ds: 7, min: 75, max: 115, umbral: 92, desc: "Venta de la semana dividida por el objetivo de la sucursal y la categoría." },
  { id: "osa", nombre: "Disponibilidad en góndola (OSA)", corto: "Disponibilidad", unidad: "%", base: 93, ds: 3.5, min: 78, max: 100, umbral: 90, desc: "SKU presentes en góndola sobre el surtido que debería tener la sucursal." },
  { id: "precio", nombre: "Cumplimiento de precio y promociones", corto: "Precio", unidad: "%", base: 95, ds: 3, min: 82, max: 100, umbral: 92, desc: "Etiquetas con el precio y la promoción vigentes sobre el total relevado." },
  { id: "experiencia", nombre: "Experiencia de compra", corto: "Experiencia", unidad: "pts", base: 78, ds: 6, min: 55, max: 95, umbral: 72, desc: "Puntaje de 0 a 100 de visitas de cliente incógnito: orden, limpieza, atención y espera." },
];
export const SEMANAS = 12;

export function generar(semilla) {
  const r = rng(semilla);
  const datos = {};
  for (const ind of INDICADORES) {
    const efSuc = SUCURSALES.map(() => normal(r) * ind.ds * 0.8);
    const efCat = CATEGORIAS.map(() => normal(r) * ind.ds * 0.55);
    const tendencia = SUCURSALES.map(() => normal(r) * ind.ds * 0.05); // por semana
    datos[ind.id] = SUCURSALES.map((_, i) => CATEGORIAS.map((_, j) => Array.from({ length: SEMANAS }, (_, w) => {
      const v = ind.base + efSuc[i] + efCat[j] + tendencia[i] * (w - SEMANAS / 2) + normal(r) * ind.ds * 0.45;
      return Math.min(ind.id === "ventas" ? 140 : 100, Math.max(0, v));
    })));
  }
  return datos;
}

const media = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN);

// Resumen: valor por sucursal × categoría promediando las últimas k semanas
export function resumir(datos, indId, filtroZona, k) {
  const filas = SUCURSALES.map((s, i) => ({ ...s, i })).filter((s) => !filtroZona || s.zona === filtroZona)
    .map((s) => {
      const celdas = CATEGORIAS.map((_, j) => media(datos[indId][s.i][j].slice(-k)));
      return { ...s, celdas, total: media(celdas) };
    });
  const porCat = CATEGORIAS.map((_, j) => media(filas.map((f) => f.celdas[j])));
  return { filas, porCat, total: media(filas.map((f) => f.total)) };
}
export const serieSucursal = (datos, indId, i) => Array.from({ length: SEMANAS }, (_, w) => media(CATEGORIAS.map((_, j) => datos[indId][i][j][w])));
export const serieCadena = (datos, indId, idx) => Array.from({ length: SEMANAS }, (_, w) => media(idx.map((i) => media(CATEGORIAS.map((_, j) => datos[indId][i][j][w])))));

// ---------------- Interfaz ----------------
const raiz = typeof document !== "undefined" ? document.querySelector("[data-demo-sucursales]") : null;
if (raiz) {
  const $ = (s) => raiz.querySelector(s);
  let semilla = 7, datos = generar(semilla), foco = 0, orden = "total";
  const f1 = (x) => x.toFixed(1).replace(".", ",");
  const ind = () => INDICADORES.find((x) => x.id === $("#sc-ind").value);
  // Escala secuencial de un solo tono (turquesa), de oscuro a claro sobre fondo oscuro
  const BAJO = [16, 40, 62], ALTO = [94, 222, 206];
  const color = (t) => { t = Math.min(1, Math.max(0, t)); return BAJO.map((b, k) => Math.round(b + (ALTO[k] - b) * t)); };
  const rgb = (c) => `rgb(${c.join(",")})`;
  const tinta = (c) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] > 140 ? "#06131F" : "#EAF2F8");

  function actualizar() {
    const I = ind(), zona = $("#sc-zona").value, k = Number($("#sc-periodo").value);
    const umbral = Number($("#sc-umbral").value);
    $("#sc-umbral-v").textContent = `${umbral} ${I.unidad}`;
    $("#sc-desc").textContent = I.desc;
    const R = resumir(datos, I.id, zona, k);
    if (!R.filas.some((f) => f.i === foco)) foco = R.filas[0].i;
    const filas = [...R.filas].sort((a, b) => (orden === "total" ? b.total - a.total : a.id.localeCompare(b.id)));
    const mejor = filas.reduce((a, b) => (b.total > a.total ? b : a)), peor = filas.reduce((a, b) => (b.total < a.total ? b : a));
    const bajo = filas.filter((f) => f.total < umbral);
    const celdasBajo = filas.flatMap((f) => f.celdas.map((v, j) => ({ f, j, v }))).filter((c) => c.v < umbral).sort((a, b) => a.v - b.v);

    $("#sc-k-prom").textContent = `${f1(R.total)} ${I.unidad}`;
    $("#sc-k-mejor").textContent = mejor.nombre.split(" · ")[1];
    $("#sc-k-mejor-v").textContent = `${f1(mejor.total)} ${I.unidad}`;
    $("#sc-k-peor").textContent = peor.nombre.split(" · ")[1];
    $("#sc-k-peor-v").textContent = `${f1(peor.total)} ${I.unidad}`;
    $("#sc-k-alerta").textContent = `${bajo.length} de ${filas.length}`;

    // Mapa de calor (tabla accesible)
    const t = (v) => (v - I.min) / (I.max - I.min);
    $("#sc-tabla thead").innerHTML = `<tr><th scope="col">Sucursal</th>${CATEGORIAS.map((c) => `<th scope="col">${c}</th>`).join("")}<th scope="col">Promedio</th></tr>`;
    $("#sc-tabla tbody").innerHTML = filas.map((f) => `<tr class="${f.i === foco ? "es-foco" : ""}" data-i="${f.i}" tabindex="0" aria-label="${f.nombre}: ver evolución">
      <th scope="row"><span class="sc-zona">${f.zona}</span>${f.nombre}</th>
      ${f.celdas.map((v, j) => { const c = color(t(v)), alerta = v < umbral; return `<td class="${alerta ? "sc-alerta" : ""}" style="background:${rgb(c)};color:${tinta(c)}" title="${f.nombre} · ${CATEGORIAS[j]}: ${f1(v)} ${I.unidad}${alerta ? " (bajo el umbral)" : ""}">${alerta ? '<span class="sc-ico" aria-label="Bajo el umbral">!</span>' : ""}${f1(v)}</td>`; }).join("")}
      <td class="sc-total ${f.total < umbral ? "sc-total--alerta" : ""}">${f1(f.total)}</td></tr>`).join("");
    $("#sc-tabla tfoot").innerHTML = `<tr><th scope="row">Promedio ${zona ? zona : "de la cadena"}</th>${R.porCat.map((v) => `<td>${f1(v)}</td>`).join("")}<td class="sc-total">${f1(R.total)}</td></tr>`;
    // Leyenda de la escala
    $("#sc-escala").innerHTML = `<span>${I.min} ${I.unidad}</span><span class="sc-escala__barra" style="background:linear-gradient(90deg, ${rgb(color(0))}, ${rgb(color(1))})"></span><span>${I.max} ${I.unidad}</span><span class="sc-escala__alerta"><span class="sc-ico">!</span> bajo el umbral</span>`;

    // Alertas
    $("#sc-alertas").innerHTML = celdasBajo.length
      ? celdasBajo.slice(0, 6).map((c) => `<li><span class="sc-ico">!</span><span><strong>${c.f.nombre.split(" · ")[1]}</strong> · ${CATEGORIAS[c.j]}</span><span class="sc-alertas__v">${f1(c.v)} ${I.unidad}</span></li>`).join("") +
        (celdasBajo.length > 6 ? `<li class="sc-alertas__mas">y ${celdasBajo.length - 6} combinaciones más bajo el umbral</li>` : "")
      : `<li class="sc-alertas__mas">Ninguna combinación de sucursal y categoría está bajo el umbral.</li>`;

    tendencia(I, R.filas.map((f) => f.i), zona, umbral);
  }

  function tendencia(I, idx, zona, umbral) {
    const s1 = serieSucursal(datos, I.id, foco), s0 = serieCadena(datos, I.id, idx);
    const W = 420, H = 230, ml = 34, mr = 8, mt = 14, mb = 26;
    const todos = [...s1, ...s0, umbral];
    const lo = Math.floor(Math.min(...todos) - 2), hi = Math.ceil(Math.max(...todos) + 2);
    const X = (w) => ml + (w / (SEMANAS - 1)) * (W - ml - mr), Y = (v) => mt + (1 - (v - lo) / (hi - lo)) * (H - mt - mb);
    const path = (s) => s.map((v, w) => `${w ? "L" : "M"}${X(w).toFixed(1)},${Y(v).toFixed(1)}`).join("");
    const ticks = Array.from({ length: 5 }, (_, k) => lo + ((hi - lo) * k) / 4);
    const nombre = SUCURSALES[foco].nombre.split(" · ")[1];
    let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolución semanal de ${I.corto.toLowerCase()}: ${nombre} frente al promedio">`;
    ticks.forEach((v) => (svg += `<line x1="${ml}" x2="${W - mr}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" class="g-grilla"/><text x="${ml - 6}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end" class="g-texto">${Math.round(v)}</text>`));
    [0, 5, 11].forEach((w) => (svg += `<text x="${X(w).toFixed(1)}" y="${H - 8}" text-anchor="middle" class="g-texto">Sem. ${w + 1}</text>`));
    svg += `<line x1="${ml}" x2="${W - mr}" y1="${Y(umbral).toFixed(1)}" y2="${Y(umbral).toFixed(1)}" class="sc-umbral"/><text x="${W - mr}" y="${(Y(umbral) - 5).toFixed(1)}" text-anchor="end" class="g-texto">Umbral ${umbral}</text>`;
    svg += `<path d="${path(s0)}" class="sc-linea-cadena"/><path d="${path(s1)}" class="sc-linea-foco"/>`;
    svg += `<circle cx="${X(SEMANAS - 1)}" cy="${Y(s1.at(-1)).toFixed(1)}" r="4.5" class="sc-punto-foco"/>`;
    // zonas de hover por semana
    s1.forEach((v, w) => (svg += `<rect x="${(X(w) - (W - ml - mr) / (SEMANAS - 1) / 2).toFixed(1)}" y="${mt}" width="${((W - ml - mr) / (SEMANAS - 1)).toFixed(1)}" height="${H - mt - mb}" fill="transparent"><title>Semana ${w + 1} · ${nombre}: ${f1(v)} · Promedio: ${f1(s0[w])}</title></rect>`));
    svg += `</svg>`;
    $("#sc-tendencia").innerHTML = svg;
    $("#sc-tend-titulo").textContent = `${nombre}: evolución en ${SEMANAS} semanas`;
    $("#sc-ley-foco").textContent = nombre;
    $("#sc-ley-cadena").textContent = zona ? `Promedio ${zona}` : "Promedio de la cadena";
  }

  $("#sc-ind").addEventListener("change", () => { const I = ind(); const u = $("#sc-umbral"); u.min = I.min; u.max = I.max; u.value = I.umbral; actualizar(); });
  ["#sc-zona", "#sc-periodo", "#sc-umbral"].forEach((s) => $(s).addEventListener("input", actualizar));
  $("#sc-orden").addEventListener("change", (e) => { orden = e.target.value; actualizar(); });
  const elegir = (tr) => { if (!tr) return; foco = Number(tr.dataset.i); actualizar(); };
  $("#sc-tabla tbody").addEventListener("click", (e) => elegir(e.target.closest("tr")));
  $("#sc-tabla tbody").addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); elegir(e.target.closest("tr")); } });
  $("#sc-nueva").addEventListener("click", () => { semilla += 1; datos = generar(semilla); actualizar(); });
  actualizar();
  window.__demoListo = true;
}
