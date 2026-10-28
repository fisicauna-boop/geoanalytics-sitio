// Demostración: reparto de visitas y optimización de rutas con datos simulados.
// Distancia por calles (Manhattan) en una ciudad cuadriculada; orden por vecino más cercano + 2-opt.

export function rng(semilla) { let s = (semilla * 2654435761) >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
export const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

export function largoRuta(dep, ruta) {
  if (!ruta.length) return 0;
  let d = dist(dep, ruta[0]);
  for (let i = 1; i < ruta.length; i++) d += dist(ruta[i - 1], ruta[i]);
  return d + dist(ruta.at(-1), dep);
}

export function vecinoMasCercano(dep, puntos) {
  const resto = [...puntos], ruta = [];
  let actual = dep;
  while (resto.length) {
    let mejor = 0, dm = Infinity;
    resto.forEach((p, i) => { const d = dist(actual, p); if (d < dm) { dm = d; mejor = i; } });
    actual = resto.splice(mejor, 1)[0]; ruta.push(actual);
  }
  return ruta;
}

export function dosOpt(dep, ruta) {
  const r = [dep, ...ruta, dep];
  let mejora = true, vueltas = 0;
  while (mejora && vueltas < 60) {
    mejora = false; vueltas++;
    for (let i = 1; i < r.length - 2; i++) for (let k = i + 1; k < r.length - 1; k++) {
      const delta = dist(r.at(i - 1), r.at(k)) + dist(r.at(i), r.at(k + 1)) - dist(r.at(i - 1), r.at(i)) - dist(r.at(k), r.at(k + 1));
      if (delta < -1e-9) { const tramo = r.slice(i, k + 1).reverse(); r.splice(i, k - i + 1, ...tramo); mejora = true; }
    }
  }
  return r.slice(1, -1);
}

// Sectores alrededor del depósito con igual cantidad de puntos por vendedor
export function zonificar(dep, puntos, k) {
  const orden = [...puntos].sort((a, b) => Math.atan2(a.y - dep.y, a.x - dep.x) - Math.atan2(b.y - dep.y, b.x - dep.x));
  const grupos = Array.from({ length: k }, () => []);
  orden.forEach((p, i) => grupos.at(Math.floor((i * k) / orden.length)).push(p));
  return grupos;
}

export function escenarios(semilla, n, k) {
  const r = rng(semilla);
  const W = 16, H = 10; // km
  const dep = { x: W / 2, y: H / 2, dep: true };
  // puntos concentrados en algunos barrios, más algunos dispersos
  const centros = Array.from({ length: 4 }, () => ({ x: 1.5 + r() * (W - 3), y: 1.2 + r() * (H - 2.4) }));
  const puntos = Array.from({ length: n }, (_, i) => {
    if (r() < 0.7) { const c = centros.at(Math.floor(r() * centros.length)); return { id: i, x: Math.min(W - 0.2, Math.max(0.2, c.x + (r() - 0.5) * 4.2)), y: Math.min(H - 0.2, Math.max(0.2, c.y + (r() - 0.5) * 3.4)) }; }
    return { id: i, x: 0.3 + r() * (W - 0.6), y: 0.3 + r() * (H - 0.6) };
  });
  // Sin zonificar: cartera repartida sin criterio territorial; cada vendedor visita al más cercano primero
  const reparto = Array.from({ length: k }, () => []);
  puntos.forEach((p, i) => reparto.at(i % k).push(p));
  const antes = reparto.map((g) => vecinoMasCercano(dep, g));
  const despues = zonificar(dep, puntos, k).map((g) => dosOpt(dep, vecinoMasCercano(dep, g)));
  return { W, H, dep, puntos, antes, despues };
}

// ---------------- Interfaz ----------------
const raiz = typeof document !== "undefined" ? document.querySelector("[data-demo-ruteo]") : null;
if (raiz) {
  const COLORES = ["#13A89E", "#1D4068", "#E09F3E", "#2A9FD6", "#8E5DB8", "#C0504D"];
  const $ = (s) => raiz.querySelector(s);
  let semilla = 11, vista = "despues", datos = null;
  const n1 = new Intl.NumberFormat("es-PY", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  const n0 = new Intl.NumberFormat("es-PY", { maximumFractionDigits: 0 });

  function dibujar() {
    const { W, H, dep } = datos, rutas = datos[vista];
    const esc = 50, m = 18, ancho = W * esc + 2 * m, alto = H * esc + 2 * m;
    const X = (x) => (m + x * esc).toFixed(1), Y = (y) => (m + y * esc).toFixed(1);
    let svg = `<svg viewBox="0 0 ${ancho} ${alto}" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<rect x="${m}" y="${m}" width="${W * esc}" height="${H * esc}" rx="6" class="mapa-fondo"/>`;
    for (let x = 1; x < W; x++) svg += `<line x1="${X(x)}" y1="${m}" x2="${X(x)}" y2="${m + H * esc}" class="mapa-calle"/>`;
    for (let y = 1; y < H; y++) svg += `<line x1="${m}" y1="${Y(y)}" x2="${m + W * esc}" y2="${Y(y)}" class="mapa-calle"/>`;
    rutas.forEach((ruta, v) => {
      const c = COLORES.at(v % COLORES.length);
      const pts = [dep, ...ruta, dep];
      let d = `M${X(pts[0].x)},${Y(pts[0].y)}`;
      for (let i = 1; i < pts.length; i++) d += `H${X(pts[i].x)}V${Y(pts[i].y)}`;
      svg += `<path d="${d}" fill="none" stroke="${c}" stroke-width="2.4" stroke-linejoin="round" opacity="${vista === "antes" ? 0.55 : 0.9}"/>`;
      ruta.forEach((p) => (svg += `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="5" fill="${c}" stroke="#fff" stroke-width="1.5"><title>Punto ${p.id + 1} · Vendedor ${v + 1}</title></circle>`));
    });
    svg += `<rect x="${(+X(dep.x) - 9).toFixed(1)}" y="${(+Y(dep.y) - 9).toFixed(1)}" width="18" height="18" rx="2" class="mapa-deposito"><title>Depósito</title></rect>`;
    svg += `<text x="${(+X(dep.x) + 14).toFixed(1)}" y="${(+Y(dep.y) + 4).toFixed(1)}" class="mapa-texto">Depósito</text></svg>`;
    $("#r-mapa").innerHTML = svg;
  }

  function calcular() {
    const n = Number($("#r-puntos").value), k = Number($("#r-vend").value);
    $("#r-puntos-v").textContent = n; $("#r-vend-v").textContent = k;
    datos = escenarios(semilla, n, k);
    const min = Math.max(1, Number($("#r-min").value) || 20), vel = Math.max(1, Number($("#r-vel").value) || 22);
    const kmA = datos.antes.reduce((s, r) => s + largoRuta(datos.dep, r), 0);
    const kmD = datos.despues.reduce((s, r) => s + largoRuta(datos.dep, r), 0);
    $("#r-km-antes").textContent = `${n0.format(kmA)} km`;
    $("#r-km-despues").textContent = `${n0.format(kmD)} km`;
    $("#r-ahorro").textContent = `${n0.format(kmA - kmD)} km menos (${n0.format((1 - kmD / kmA) * 100)} %)`;
    const rutas = datos[vista];
    $("#r-tabla tbody").innerHTML = rutas.map((r, v) => {
      const km = largoRuta(datos.dep, r), h = km / vel + (r.length * min) / 60;
      return `<tr><td><span class="punto-color" style="background:${COLORES.at(v % COLORES.length)}"></span>Vendedor ${v + 1}</td><td>${r.length}</td><td>${n1.format(km)}</td><td>${n1.format(h)}</td></tr>`;
    }).join("");
    dibujar();
  }

  raiz.querySelectorAll(".vista-btn").forEach((b) => b.addEventListener("click", () => {
    vista = b.dataset.vista;
    raiz.querySelectorAll(".vista-btn").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    calcular();
  }));
  ["#r-puntos", "#r-vend", "#r-min", "#r-vel"].forEach((s) => $(s).addEventListener("input", calcular));
  $("#r-nueva").addEventListener("click", () => { semilla += 1; calcular(); });
  calcular();
  window.__demoListo = true;
}
