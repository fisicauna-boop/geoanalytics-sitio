// Demostración: tamaño de muestra, margen de error y encuesta simulada con intervalos de confianza.

// n0 = z² p (1 − p) / e²; con población finita: n = n0 / (1 + (n0 − 1) / N)
export function tamanoMuestra(z, e, p, N) {
  const n0 = (z * z * p * (1 - p)) / (e * e);
  const n = N && N > 0 ? n0 / (1 + (n0 - 1) / N) : n0;
  return Math.ceil(n - 1e-9);
}
// e = z √(p (1 − p) / n), con corrección por población finita √((N − n) / (N − 1))
export function margenError(z, n, p, N) {
  let e = z * Math.sqrt((p * (1 - p)) / n);
  if (N && N > n && N > 1) e *= Math.sqrt((N - n) / (N - 1));
  else if (N && N <= n) e = 0;
  return e;
}

function rng(semilla) { let s = (semilla * 2654435761) >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// Población simulada: tres zonas con distribución de respuestas 1 a 5 conocida
export const ZONAS = [
  { nombre: "Asunción", peso: 0.35, dist: [0.05, 0.08, 0.17, 0.4, 0.3] },
  { nombre: "Central", peso: 0.4, dist: [0.07, 0.1, 0.2, 0.38, 0.25] },
  { nombre: "Interior", peso: 0.25, dist: [0.04, 0.06, 0.15, 0.4, 0.35] },
];
export const realSatisf = (z) => z.dist.at(3) + z.dist.at(4);
export const realTotal = () => ZONAS.reduce((s, z) => s + z.peso * realSatisf(z), 0);

export function muestrear(n, semilla) {
  const r = rng(semilla);
  const elegir = (probs) => { let u = r(), i = 0; while (i < probs.length - 1 && u > probs.at(i)) { u -= probs.at(i); i++; } return i; };
  const pesos = ZONAS.map((z) => z.peso);
  const res = ZONAS.map(() => ({ n: 0, satisf: 0 })), hist = [0, 0, 0, 0, 0];
  for (let k = 0; k < n; k++) {
    const zi = elegir(pesos), v = elegir(ZONAS.at(zi).dist);
    const z = res.at(zi); z.n++; if (v >= 3) z.satisf++;
    hist[v]++;
  }
  return { res, hist, n };
}

// ---------------- Interfaz ----------------
const raiz = typeof document !== "undefined" ? document.querySelector("[data-demo-encuestas]") : null;
if (raiz) {
  const $ = (s) => raiz.querySelector(s);
  const n0 = new Intl.NumberFormat("es-PY");
  const pc = (x, d = 1) => `${(x * 100).toFixed(d).replace(".", ",")} %`;
  const num = (el, def) => { const v = parseFloat(String($(el).value).replace(",", ".")); return Number.isFinite(v) ? v : def; };

  function calcMuestra() {
    const z = Number($("#cm-conf").value), e = num("#cm-error", 5) / 100, p = num("#cm-p", 50) / 100;
    const N = num("#cm-pob", 0), tasa = Math.min(1, Math.max(0.05, num("#cm-resp", 100) / 100));
    if (e <= 0 || p <= 0 || p >= 1) { $("#cm-n").textContent = "—"; $("#cm-nota").textContent = "Revise el margen de error y la proporción esperada."; return; }
    const n = tamanoMuestra(z, e, p, N);
    $("#cm-n").textContent = n0.format(n);
    const contactos = Math.ceil(n / tasa);
    $("#cm-nota").textContent = (tasa < 1 ? `Con ${pc(tasa, 0)} de respuesta hay que contactar a unas ${n0.format(contactos)} personas. ` : "") +
      `Fórmula: n = z² · p · (1 − p) ÷ e²${N > 0 ? ", con corrección por población finita" : ""}.`;
  }
  function calcError() {
    const z = Number($("#ce-conf").value), n = Math.max(2, Math.round(num("#ce-n", 400))), p = num("#ce-p", 50) / 100, N = num("#ce-pob", 0);
    if (p <= 0 || p >= 1) { $("#ce-e").textContent = "—"; return; }
    const e = margenError(z, n, p, N);
    $("#ce-e").textContent = (e * 100).toFixed(1).replace(".", ",");
    $("#ce-nota").textContent = N > 0 && N <= n ? "La muestra cubre toda la población: no hay error de muestreo." :
      `Si el ${pc(p, 0)} de los encuestados responde «sí», el valor en la población estaría entre ${pc(Math.max(0, p - e))} y ${pc(Math.min(1, p + e))}.`;
  }

  let semilla = 3;
  function simular() {
    const n = Number($("#es-n").value);
    $("#es-n-v").textContent = n0.format(n);
    const m = muestrear(n, semilla);
    // Intervalos por zona y total
    const filas = ZONAS.map((z, i) => ({ nombre: z.nombre, n: m.res.at(i).n, p: m.res.at(i).n ? m.res.at(i).satisf / m.res.at(i).n : 0, real: realSatisf(z) }));
    const totSat = m.res.reduce((s, r) => s + r.satisf, 0);
    filas.push({ nombre: "Total", n, p: totSat / n, real: realTotal(), total: true });
    const W = 580, izq = 118, der = 100, x0 = 0.4, x1 = 1, X = (v) => izq + ((v - x0) / (x1 - x0)) * (W - izq - der);
    const alto = 46, H = 40 + filas.length * alto;
    let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Porcentaje de clientes satisfechos por zona con intervalos de confianza">`;
    svg += `<text x="${izq}" y="16" class="g-titulo-claro">Clientes satisfechos (respuestas 4 y 5)</text>`;
    [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1].forEach((t) => (svg += `<line x1="${X(t)}" x2="${X(t)}" y1="28" y2="${H - 6}" class="g-grilla-claro"/><text x="${X(t)}" y="${H}" text-anchor="middle" class="g-eje-claro">${Math.round(t * 100)} %</text>`));
    filas.forEach((f, i) => {
      const y = 46 + i * alto, e = f.n ? 1.96 * Math.sqrt((f.p * (1 - f.p)) / f.n) : 0;
      const lo = Math.max(x0, f.p - e), hi = Math.min(x1, f.p + e);
      svg += `<text x="${izq - 12}" y="${y + 4}" text-anchor="end" class="g-etiqueta${f.total ? " g-etiqueta--fuerte" : ""}">${f.nombre}</text>`;
      svg += `<text x="${izq - 12}" y="${y + 18}" text-anchor="end" class="g-eje-claro">n = ${n0.format(f.n)}</text>`;
      svg += `<rect x="${X(lo)}" y="${y - 7}" width="${Math.max(2, X(hi) - X(lo))}" height="14" rx="7" class="${f.total ? "g-ic g-ic--total" : "g-ic"}"><title>Intervalo de 95 %: ${pc(f.p - e)} a ${pc(f.p + e)}</title></rect>`;
      svg += `<circle cx="${X(f.p)}" cy="${y}" r="5" class="g-estimado"/>`;
      svg += `<line x1="${X(f.real)}" x2="${X(f.real)}" y1="${y - 13}" y2="${y + 13}" class="g-real"><title>Valor real de la población simulada: ${pc(f.real)}</title></line>`;
      svg += `<text x="${W - der + 10}" y="${y + 4}" class="g-valor-claro">${pc(f.p)} ± ${(e * 100).toFixed(1).replace(".", ",")}</text>`;
    });
    svg += `</svg>`;
    $("#es-intervalos").innerHTML = svg + `<p class="leyenda-g"><span class="leyenda-g__ic"></span>Intervalo de confianza del 95 % <span class="leyenda-g__real"></span>Valor real de la población simulada</p>`;
    // Distribución de respuestas
    const maxH = Math.max(...m.hist) / n;
    const W2 = 300, H2 = 210, b = 40, gap = 12;
    let s2 = `<svg viewBox="0 0 ${W2} ${H2}" role="img" aria-label="Distribución de respuestas de 1 a 5 en la muestra"><text x="0" y="16" class="g-titulo-claro">Respuestas de la muestra</text>`;
    m.hist.forEach((c, i) => {
      const v = c / n, h = (v / maxH) * 130, x = 16 + i * (b + gap), y = 180 - h;
      s2 += `<rect x="${x}" y="${y}" width="${b}" height="${h}" rx="2" class="${i >= 3 ? "g-barra-sat" : "g-barra"}"><title>Respuesta ${i + 1}: ${pc(v)}</title></rect>`;
      s2 += `<text x="${x + b / 2}" y="${y - 6}" text-anchor="middle" class="g-valor-claro">${Math.round(v * 100)} %</text>`;
      s2 += `<text x="${x + b / 2}" y="198" text-anchor="middle" class="g-eje-claro">${i + 1}</text>`;
    });
    s2 += `</svg>`;
    $("#es-distribucion").innerHTML = s2 + `<p class="leyenda-g">1 = muy insatisfecho, 5 = muy satisfecho.</p>`;
  }

  raiz.querySelectorAll("#c-muestra input, #c-muestra select").forEach((el) => el.addEventListener("input", calcMuestra));
  raiz.querySelectorAll("#c-error input, #c-error select").forEach((el) => el.addEventListener("input", calcError));
  $("#es-n").addEventListener("input", simular);
  $("#es-nueva").addEventListener("click", () => { semilla += 1; simular(); });
  calcMuestra(); calcError(); simular();
  window.__demoListo = true;
}
