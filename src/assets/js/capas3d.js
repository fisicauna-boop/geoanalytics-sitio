// Escena 3D de portada del artículo de geomarketing: tres placas de vidrio apiladas sobre una ciudad
// conceptual. Abajo, los datos con ubicación; en el medio, el análisis espacial; arriba, la decisión.
// Todo es ilustrativo: no representa un lugar ni datos reales.
// Cuarta dimensión: las placas se separan, los datos "suben" por haces de luz y la decisión se ilumina.
import * as THREE from "../vendor/three.module.min.js";

const contenedor = document.querySelector("[data-capas3d]");
const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function webglDisponible() {
  try { const c = document.createElement("canvas"); return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl"))); } catch { return false; }
}
if (contenedor && webglDisponible()) iniciar();

function iniciar() {
  const C = { azul: 0x0B2D4A, azul5: 0x2F6BA8, tur: 0x00C2C7, turC: 0xC9F3EF, comp: 0x5B6B7C, oport: 0x39D98A, ambar: 0xF2A93B, blanco: 0xffffff };
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const renderer = new THREE.WebGLRenderer({ antialias: dpr < 1.5, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(dpr); renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement; canvas.className = "hero3d__lienzo"; canvas.setAttribute("aria-hidden", "true");
  contenedor.appendChild(canvas);

  const escena = new THREE.Scene();
  const camara = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  escena.add(new THREE.HemisphereLight(0xffffff, 0x9fb6cc, 1.5));
  const sol = new THREE.DirectionalLight(0xffffff, 1.3); sol.position.set(-5, 10, 4); escena.add(sol);

  const L = 7; // lado de cada placa
  let semilla = 21; const azar = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);
  const placa = (color, op) => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(L, 0.06, L), new THREE.MeshStandardMaterial({ color, transparent: true, opacity: op, roughness: 0.2, depthWrite: false })));
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(L, 0.06, L)), new THREE.LineBasicMaterial({ color: C.tur, transparent: true, opacity: 0.7 })));
    return g;
  };
  const sitios = [[-1.9, 1.4], [0.6, -1.6], [1.9, 1.5]]; // tres ubicaciones candidatas
  const MEJOR = 2;

  // ---------- Capa 1: datos con ubicación (ciudad, clientes y competidores) ----------
  const capa1 = placa(0xF4F8FC, 0.95);
  const geoB = new THREE.BoxGeometry(1, 1, 1); geoB.translate(0, 0.5, 0);
  const manz = [];
  for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) {
    if (azar() < 0.18) continue;
    manz.push([-L / 2 + i + 0.5 + (azar() - 0.5) * 0.15, -L / 2 + j + 0.5 + (azar() - 0.5) * 0.15, 0.08 + azar() * 0.3]);
  }
  const bloques = new THREE.InstancedMesh(geoB, new THREE.MeshStandardMaterial({ color: C.blanco, roughness: 0.8 }), manz.length);
  capa1.add(bloques);
  const geoP = new THREE.SphereGeometry(0.07, 10, 8);
  const clientes = [];
  for (let k = 0; k < 70; k++) {
    const cx = (azar() - 0.5) * (L - 0.6), cz = (azar() - 0.5) * (L - 0.6);
    clientes.push([cx, cz]);
  }
  const imCli = new THREE.InstancedMesh(geoP, new THREE.MeshStandardMaterial({ color: C.tur, emissive: C.tur, emissiveIntensity: 0.3 }), clientes.length);
  capa1.add(imCli);
  const comp = [[-0.6, 1.1], [2.6, 0.3], [-2.6, -1.5], [0.2, 2.6], [1.2, 0.9]];
  const geoC = new THREE.ConeGeometry(0.15, 0.36, 4); geoC.translate(0, 0.18, 0);
  const marcasComp = comp.map(([x, z]) => { const m = new THREE.Mesh(geoC, new THREE.MeshStandardMaterial({ color: C.comp })); m.position.set(x, 0.03, z); m.rotation.y = Math.PI / 4; capa1.add(m); return m; });

  // ---------- Capa 2: análisis espacial (densidad en hexágonos + isócronas) ----------
  const capa2 = placa(C.azul5, 0.18);
  const R = 0.3, DX = Math.sqrt(3) * R, DZ = 1.5 * R, celdas = [];
  for (let f = -9; f <= 9; f++) for (let c = -9; c <= 9; c++) {
    const x = c * DX + (f & 1 ? DX / 2 : 0), z = f * DZ;
    if (Math.abs(x) > L / 2 - 0.3 || Math.abs(z) > L / 2 - 0.3) continue;
    const dens = clientes.reduce((s, [px, pz]) => s + Math.exp(-((px - x) ** 2 + (pz - z) ** 2) / 0.9), 0);
    celdas.push({ x, z, h: 0.03 + Math.min(1, dens / 6) * 0.42 });
  }
  const geoH = new THREE.CylinderGeometry(R * 0.9, R * 0.9, 1, 6); geoH.translate(0, 0.5, 0);
  const hexes = new THREE.InstancedMesh(geoH, new THREE.MeshStandardMaterial({ roughness: 0.5 }), celdas.length);
  const col = new THREE.Color(), cA = new THREE.Color(C.azul5), cT = new THREE.Color(C.tur), cC = new THREE.Color(C.turC);
  celdas.forEach((c, i) => { const t = (c.h - 0.03) / 0.42; col.copy(cA).lerp(cT, Math.min(1, t * 1.5)); if (t > 0.65) col.lerp(cC, (t - 0.65) * 1.5); hexes.setColorAt(i, col); });
  capa2.add(hexes);
  // Isócronas alrededor de la mejor ubicación (forma irregular: la red de calles no es un círculo)
  const iso = [1.0, 1.7].map((r, k) => {
    const pts = [];
    for (let a = 0; a <= 64; a++) { const t = (a / 64) * Math.PI * 2; const rr = r * (1 + 0.18 * Math.sin(3 * t + k) + 0.1 * Math.cos(5 * t)); pts.push(new THREE.Vector3(sitios[MEJOR][0] + Math.cos(t) * rr, 0.5, sitios[MEJOR][1] + Math.sin(t) * rr)); }
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: k ? C.ambar : C.oport, transparent: true, opacity: 0 }));
    capa2.add(l); return l;
  });

  // ---------- Capa 3: decisión (candidatos con barras de prioridad) ----------
  const capa3 = placa(C.blanco, 0.12);
  const geoBar = new THREE.BoxGeometry(0.42, 1, 0.42); geoBar.translate(0, 0.5, 0);
  const prioridad = [0.55, 0.8, 1.45];
  const barras = sitios.map(([x, z], k) => {
    const m = new THREE.Mesh(geoBar, new THREE.MeshStandardMaterial({ color: k === MEJOR ? C.oport : C.tur, transparent: true, opacity: k === MEJOR ? 0.95 : 0.55, emissive: k === MEJOR ? C.oport : 0, emissiveIntensity: 0.25 }));
    m.position.set(x, 0.03, z); m.scale.set(1, 0.001, 1); capa3.add(m); return m;
  });
  const anillo = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: C.oport, transparent: true, opacity: 0, side: THREE.DoubleSide }));
  anillo.position.set(sitios[MEJOR][0], 0.05, sitios[MEJOR][1]); capa3.add(anillo);

  const capas = [capa1, capa2, capa3];
  escena.add(...capas);

  // ---------- Haces de luz que conectan las capas en cada ubicación candidata ----------
  const haces = sitios.map(([x, z], k) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 12, 1, true), new THREE.MeshBasicMaterial({ color: k === MEJOR ? C.oport : C.tur, transparent: true, opacity: 0, depthWrite: false }));
    m.userData = { x, z }; escena.add(m); return m;
  });
  // Partículas que suben por el haz de la mejor ubicación
  const NP = 14, geoPart = new THREE.SphereGeometry(0.05, 8, 6);
  const parts = Array.from({ length: NP }, () => { const m = new THREE.Mesh(geoPart, new THREE.MeshBasicMaterial({ color: C.oport, transparent: true, opacity: 0 })); escena.add(m); return m; });

  // ---------- Etiquetas alineadas en columna ----------
  const capaEt = document.createElement("div"); capaEt.className = "hero3d__etiquetas"; capaEt.setAttribute("aria-hidden", "true"); contenedor.appendChild(capaEt);
  const nombres = ["1 · Datos con ubicación", "2 · Análisis espacial", "3 · Decisión"];
  const ets = nombres.map((n) => { const e = document.createElement("span"); e.className = "hero3d__etiqueta capas3d__et"; e.textContent = n; e.style.opacity = 0; capaEt.appendChild(e); return e; });
  const etMejor = document.createElement("span"); etMejor.className = "hero3d__etiqueta hero3d__etiqueta--lugar capas3d__mejor"; etMejor.textContent = "Ubicación prioritaria"; etMejor.style.opacity = 0; capaEt.appendChild(etMejor);

  // ---------- Animación ----------
  const SEP = 2.0;
  let ancho = 1, alto = 1, giro = 0, giroObj = 0, elev = 0, elevObj = 0, visible = true, animando = false;
  const e3 = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
  const m4 = new THREE.Matrix4();
  function posicionar(ap, crec) {
    capas.forEach((c, k) => c.position.set(0, k * SEP * ap, 0));
    manz.forEach(([x, z, h], i) => { m4.makeScale(0.62, Math.max(0.001, h * crec), 0.62).setPosition(x, 0.03, z); bloques.setMatrixAt(i, m4); });
    bloques.instanceMatrix.needsUpdate = true;
    celdas.forEach((c, i) => { m4.makeScale(1, Math.max(0.001, c.h * crec), 1).setPosition(c.x, 0.03, c.z); hexes.setMatrixAt(i, m4); });
    hexes.instanceMatrix.needsUpdate = true;
  }
  function orientar() {
    const a = Math.PI / 4 + giro, e = 0.5 + elev;
    camara.position.set(Math.sin(a) * Math.cos(e) * 30, SEP + Math.sin(e) * 30, Math.cos(a) * Math.cos(e) * 30);
    camara.lookAt(0, SEP, 0); camara.updateMatrixWorld();
  }
  const GMAX = 0.5;
  function ajustar() {
    const r = contenedor.getBoundingClientRect(); ancho = Math.max(1, r.width); alto = Math.max(1, r.height);
    renderer.setSize(ancho, alto, false);
    const asp = ancho / alto, p = new THREE.Vector3(), g0 = giro, e0 = elev;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let a = -GMAX; a <= GMAX + 1e-6; a += GMAX / 5) {
      giro = a; elev = 0; orientar();
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const y of [-0.05, 2 * SEP + 1.4]) {
        p.set(sx * L / 2, y, sz * L / 2).applyMatrix4(camara.matrixWorldInverse);
        x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
      }
    }
    giro = g0; elev = e0;
    const reserva = ancho < 560 ? 0 : 190; // espacio a la derecha para las etiquetas
    const anchoMundo = (x1 - x0) / Math.max(0.5, 1 - reserva / ancho);
    const media = Math.max((y1 - y0) / 2 * 1.04, anchoMundo / 2 / asp * 1.02);
    const cx = (x0 + x1) / 2 + (reserva / ancho) * media * asp, cy = (y0 + y1) / 2;
    camara.left = cx - media * asp; camara.right = cx + media * asp; camara.top = cy + media; camara.bottom = cy - media;
    camara.updateProjectionMatrix(); pedir();
  }
  const v = new THREE.Vector3();
  const aPantalla = (x, y, z) => { v.set(x, y, z).project(camara); return [(v.x + 1) / 2 * ancho, (1 - v.y) / 2 * alto]; };

  const t0 = performance.now();
  function dibujar(ahora) {
    const t = reducido ? 99 : (ahora - t0) / 1000;
    const ap = e3((t - 0.3) / 1.6), crec = e3((t - 1.0) / 1.4);
    posicionar(ap, crec);
    clientes.forEach(([x, z], i) => { const f = Math.max(0.001, e3((t - 0.6 - i * 0.012) / 0.4)); m4.makeScale(f, f, f).setPosition(x, 0.12, z); imCli.setMatrixAt(i, m4); });
    imCli.instanceMatrix.needsUpdate = true;
    const fIso = e3((t - 2.4) / 0.8); iso.forEach((l, k) => { l.material.opacity = fIso * (k ? 0.75 : 0.95); l.scale.setScalar(1); });
    const lat = reducido ? 0.5 : 0.5 + 0.5 * Math.sin(t * 2.4);
    barras.forEach((b, k) => b.scale.set(1, Math.max(0.001, prioridad[k] * e3((t - 3.2 - k * 0.2) / 0.8)), 1));
    const fDec = e3((t - 4.0) / 0.8);
    anillo.material.opacity = fDec * (0.5 + 0.4 * lat); anillo.scale.setScalar(1 + 0.25 * lat * fDec);
    const yTop = 2 * SEP * ap;
    haces.forEach((h, k) => { h.scale.set(1, Math.max(0.001, yTop), 1); h.position.set(h.userData.x, yTop / 2, h.userData.z); h.material.opacity = e3((t - 2.0) / 0.8) * (k === MEJOR ? 0.55 : 0.22); });
    parts.forEach((m, i) => { const f = ((t * 0.35 + i / NP) % 1); m.position.set(sitios[MEJOR][0], f * yTop, sitios[MEJOR][1]); m.material.opacity = fDec * Math.sin(f * Math.PI) * 0.9; });

    const vaiven = reducido ? 0 : Math.sin(t * 0.18) * 0.28;
    giro += (Math.max(-GMAX, Math.min(GMAX, vaiven + giroObj)) - giro) * 0.08; elev += (elevObj - elev) * 0.08;
    orientar();
    renderer.render(escena, camara);

    // Etiquetas: una columna a la derecha, a la altura del borde derecho de cada placa
    if (ancho >= 560) {
      const puntos = capas.map((c) => { let mejor = null; for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { const q = aPantalla(sx * L / 2, c.position.y, sz * L / 2); if (!mejor || q[0] > mejor[0]) mejor = q; } return mejor; });
      const anchoEt = Math.max(...ets.map((e) => e.offsetWidth));
      const colX = Math.round(Math.min(ancho - anchoEt - 12, Math.max(...puntos.map((q) => q[0])) + 22));
      ets.forEach((e, k) => { const [sx, sy] = puntos[k]; e.style.transform = `translate(${colX}px, ${Math.round(sy - 12)}px)`; e.style.setProperty("--guia", Math.max(0, colX - sx - 4) + "px"); e.style.opacity = ap > 0.5 + k * 0.15 ? 1 : 0; });
    } else ets.forEach((e) => (e.style.opacity = 0));
    const [mx, my] = aPantalla(sitios[MEJOR][0], yTop + prioridad[MEJOR] + 0.1, sitios[MEJOR][1]);
    etMejor.style.transform = `translate(${Math.round(Math.min(ancho - etMejor.offsetWidth - 6, mx - etMejor.offsetWidth / 2))}px, ${Math.round(my - 34)}px)`;
    etMejor.style.opacity = fDec > 0.6 ? 1 : 0;

    animando = visible && !(reducido && !arrastre);
    if (animando) requestAnimationFrame(dibujar);
  }
  function pedir() { if (!animando) { animando = true; requestAnimationFrame(dibujar); } }

  let arrastre = null;
  contenedor.style.touchAction = "pan-y";
  contenedor.addEventListener("pointerdown", (ev) => { arrastre = { x: ev.clientX, y: ev.clientY, g: giroObj, e: elevObj }; contenedor.setPointerCapture(ev.pointerId); contenedor.classList.add("es-arrastre"); });
  contenedor.addEventListener("pointermove", (ev) => {
    if (!arrastre) return;
    giroObj = Math.max(-0.22, Math.min(0.22, arrastre.g + (ev.clientX - arrastre.x) * 0.004));
    elevObj = Math.max(-0.2, Math.min(0.25, arrastre.e - (ev.clientY - arrastre.y) * 0.003));
    if (reducido) { giro = giroObj; elev = elevObj; }
    pedir();
  });
  const soltar = () => { arrastre = null; contenedor.classList.remove("es-arrastre"); };
  contenedor.addEventListener("pointerup", soltar); contenedor.addEventListener("pointercancel", soltar);
  new ResizeObserver(ajustar).observe(contenedor);
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) pedir(); }).observe(contenedor);
  ajustar();
  contenedor.classList.add("hero3d--activo");
}
