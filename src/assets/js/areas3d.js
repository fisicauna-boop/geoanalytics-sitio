// Escena 3D de portada del artículo sobre áreas de influencia: un mismo local en una ciudad conceptual,
// medido con tres métodos (radios, isócronas y modelo de Huff). El lector cambia de método y el territorio
// se transforma: esa interacción es la "cuarta dimensión". Ciudad, distancias y valores son ficticios.
import * as THREE from "../vendor/three.module.min.js";

const contenedor = document.querySelector("[data-areas3d]");
const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function webglDisponible() {
  try { const c = document.createElement("canvas"); return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl"))); } catch { return false; }
}
if (contenedor && webglDisponible()) iniciar();

function iniciar() {
  const C = { suelo: 0xF4F8FC, calle: 0xD5E2EE, rio: 0x7FB8E6, tur: 0x00C2C7, turC: 0xC9F3EF, azul: 0x0B2D4A, azul5: 0x2F6BA8, comp: 0x5B6B7C, verde: 0x39D98A };
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const renderer = new THREE.WebGLRenderer({ antialias: dpr < 1.5, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(dpr); renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement; canvas.className = "hero3d__lienzo"; canvas.setAttribute("aria-hidden", "true");
  contenedor.appendChild(canvas);
  const escena = new THREE.Scene();
  const camara = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  escena.add(new THREE.HemisphereLight(0xffffff, 0x9fb6cc, 1.5));
  const sol = new THREE.DirectionalLight(0xffffff, 1.3); sol.position.set(-5, 10, 4); escena.add(sol);

  const AN = 12, PR = 8, RIO_X = 2.3, RIO_A = 0.55, PUENTE_Z = -1.2;
  const local = [-0.4, 0.4], comps = [[4.1, -2.0], [-3.6, 2.4]];
  let semilla = 3; const azar = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);

  // ---------- Ciudad: suelo, calles, río con un puente y manzanas ----------
  const suelo = new THREE.Mesh(new THREE.BoxGeometry(AN + 0.6, 0.22, PR + 0.6), new THREE.MeshStandardMaterial({ color: C.suelo, roughness: 0.95 }));
  suelo.position.y = -0.11; escena.add(suelo);
  const lineas = [];
  for (let x = -AN / 2; x <= AN / 2; x += 1) if (Math.abs(x - RIO_X) > RIO_A / 2 + 0.05) lineas.push(new THREE.Vector3(x, 0.003, -PR / 2), new THREE.Vector3(x, 0.003, PR / 2));
  for (let z = -PR / 2; z <= PR / 2; z += 1) lineas.push(new THREE.Vector3(-AN / 2, 0.003, z), new THREE.Vector3(RIO_X - RIO_A / 2, 0.003, z), new THREE.Vector3(RIO_X + RIO_A / 2, 0.003, z), new THREE.Vector3(AN / 2, 0.003, z));
  escena.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(lineas), new THREE.LineBasicMaterial({ color: C.calle })));
  const rio = new THREE.Mesh(new THREE.BoxGeometry(RIO_A, 0.04, PR + 0.6), new THREE.MeshStandardMaterial({ color: C.rio, roughness: 0.3, transparent: true, opacity: 0.85 }));
  rio.position.set(RIO_X, 0.0, 0); escena.add(rio);
  const puente = new THREE.Mesh(new THREE.BoxGeometry(RIO_A + 0.3, 0.08, 0.32), new THREE.MeshStandardMaterial({ color: 0xffffff }));
  puente.position.set(RIO_X, 0.05, PUENTE_Z); escena.add(puente);
  const geoB = new THREE.BoxGeometry(1, 1, 1); geoB.translate(0, 0.5, 0);
  const manz = [];
  for (let i = 0; i < AN; i++) for (let j = 0; j < PR; j++) {
    const cx = -AN / 2 + i + 0.5, cz = -PR / 2 + j + 0.5;
    if (Math.abs(cx - RIO_X) < 0.7) continue;
    if ([local, ...comps].some(([x, z]) => Math.abs(x - cx) < 0.5 && Math.abs(z - cz) < 0.5)) continue;
    manz.push([cx + (azar() - 0.5) * 0.12, cz + (azar() - 0.5) * 0.12, 0.08 + azar() * 0.28, 0.5 + azar() * 0.2]);
  }
  const bloques = new THREE.InstancedMesh(geoB, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, transparent: true, opacity: 0.92 }), manz.length);
  const m4 = new THREE.Matrix4();
  manz.forEach(([x, z, h, s], i) => { m4.makeScale(s, h, s).setPosition(x, 0, z); bloques.setMatrixAt(i, m4); });
  escena.add(bloques);

  // ---------- Locales ----------
  const geoLocal = new THREE.BoxGeometry(0.5, 0.3, 0.5); geoLocal.translate(0, 0.15, 0);
  const geoPoste = new THREE.CylinderGeometry(0.04, 0.04, 0.6, 10); geoPoste.translate(0, 0.3, 0);
  const marcador = (x, z, color, alto) => {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    g.add(new THREE.Mesh(geoLocal, new THREE.MeshStandardMaterial({ color: C.azul })));
    const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.2 });
    const p = new THREE.Mesh(geoPoste, mat); p.position.y = 0.3; p.scale.y = alto; g.add(p);
    const c = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 14), mat); c.position.y = 0.3 + 0.6 * alto + 0.08; g.add(c);
    escena.add(g); return g;
  };
  marcador(local[0], local[1], C.tur, 1.3);
  const marcasComp = comps.map(([x, z]) => marcador(x, z, C.comp, 0.8));

  // ---------- Método 1: radios concéntricos ----------
  const grupoRadios = new THREE.Group(); grupoRadios.position.set(local[0], 0.02, local[1]); escena.add(grupoRadios);
  const radios = [1.3, 2.5, 3.7];
  radios.forEach((r, k) => {
    const disco = new THREE.Mesh(new THREE.CircleGeometry(r, 72).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: C.tur, transparent: true, opacity: 0.12, depthWrite: false }));
    disco.position.y = k * 0.002;
    const aro = new THREE.Mesh(new THREE.TorusGeometry(r, 0.025, 6, 96).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: C.tur, transparent: true, opacity: 0.9 }));
    aro.position.y = 0.04;
    grupoRadios.add(disco, aro);
  });

  // ---------- Método 2: isócronas en terrazas, recortadas por el río ----------
  function contornoIso(r) {
    const pts = [];
    for (let a = 0; a < 128; a++) {
      const t = (a / 128) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
      const rr = r * (0.5 * 1.2 / (Math.abs(c) + Math.abs(s)) + 0.42) * (1 + 0.04 * Math.sin(7 * t));
      let x = local[0] + c * rr, z = local[1] + s * rr;
      const orilla = RIO_X - RIO_A / 2 - 0.05;
      if (x > orilla) {
        const cerca = Math.abs(z - PUENTE_Z) < 0.3 + Math.max(0, r - 2.2) * 0.35;
        x = cerca && r > 2.2 ? Math.max(x, RIO_X + RIO_A / 2 + 0.25 + (r - 2.2) * 0.7) : orilla;
      }
      pts.push(new THREE.Vector2(x, -z));
    }
    return pts;
  }
  const grupoIso = new THREE.Group(); escena.add(grupoIso);
  const colIso = [0x39D98A, 0x00C2C7, 0x2F6BA8];
  [3.9, 2.7, 1.5].forEach((r, k) => {
    const g = new THREE.ExtrudeGeometry(new THREE.Shape(contornoIso(r)), { depth: 0.05 + k * 0.09, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: colIso[2 - k], transparent: true, opacity: 0.4 + k * 0.12, depthWrite: false, roughness: 0.4 }));
    m.position.y = 0.01 + k * 0.004; grupoIso.add(m);
  });

  // ---------- Método 3: probabilidad de Huff (con el río como barrera: se cruza por el puente) ----------
  const tiendas = [[...local, 1.3], ...comps.map((c) => [...c, 1])];
  const lado = (x) => Math.sign(x - RIO_X);
  const dist = (x, z, [sx, sz]) => {
    if (lado(x) === lado(sx)) return Math.hypot(x - sx, z - sz);
    return Math.hypot(x - RIO_X, z - PUENTE_Z) + Math.hypot(sx - RIO_X, sz - PUENTE_Z);
  };
  const celdas = [];
  for (let x = -AN / 2 + 0.25; x < AN / 2; x += 0.5) for (let z = -PR / 2 + 0.25; z < PR / 2; z += 0.5) {
    if (Math.abs(x - RIO_X) < RIO_A / 2 + 0.1) continue;
    const u = tiendas.map((t) => t[2] / Math.max(0.5, dist(x, z, t)) ** 2);
    celdas.push({ x, z, p: u[0] / u.reduce((a, b) => a + b, 0) });
  }
  const geoCel = new THREE.BoxGeometry(0.44, 1, 0.44); geoCel.translate(0, 0.5, 0);
  const huff = new THREE.InstancedMesh(geoCel, new THREE.MeshStandardMaterial({ roughness: 0.5, transparent: true, opacity: 0.88 }), celdas.length);
  const col = new THREE.Color(), cBajo = new THREE.Color(0xDCE8F3), cMed = new THREE.Color(C.tur), cAlto = new THREE.Color(C.azul5);
  celdas.forEach((c, i) => { col.copy(cBajo).lerp(cMed, Math.min(1, c.p * 1.6)); if (c.p > 0.62) col.lerp(cAlto, (c.p - 0.62) / 0.38); huff.setColorAt(i, col); });
  escena.add(huff);

  // ---------- Interfaz: selector de método y etiquetas ----------
  const capaEt = document.createElement("div"); capaEt.className = "hero3d__etiquetas"; capaEt.setAttribute("aria-hidden", "true"); contenedor.appendChild(capaEt);
  const crearEt = (t, mod) => { const e = document.createElement("span"); e.className = "hero3d__etiqueta areas3d__et " + (mod || ""); e.textContent = t; capaEt.appendChild(e); return e; };
  const etLocal = crearEt("Local evaluado", "hero3d__etiqueta--lugar");
  const etComp = comps.map(() => crearEt("Competidor"));
  const etRio = crearEt("Río: se cruza por el puente", "areas3d__et--rio");

  const selector = contenedor.parentElement.querySelector("[data-areas3d-metodos]");
  const botones = selector ? [...selector.querySelectorAll("button")] : [];
  const explica = contenedor.parentElement.querySelector("[data-areas3d-explica]");
  const textos = [
    "Distancia geométrica: el mismo alcance en todas las direcciones, aunque el río corte el paso.",
    "Tiempo de desplazamiento por las calles: el río recorta el área y solo el puente deja pasar.",
    "Probabilidad de atracción: cada zona reparte su elección entre el local y sus competidores.",
  ];
  let metodo = 0, auto = !reducido, ultimoCambio = performance.now();
  const peso = [1, 0, 0]; // mezcla visible de cada método (0 a 1)
  function elegir(k, usuario) {
    metodo = k; ultimoCambio = performance.now();
    if (usuario) auto = false;
    botones.forEach((b, i) => b.setAttribute("aria-pressed", i === k));
    if (explica) explica.textContent = textos[k];
    pedir();
  }
  botones.forEach((b, i) => b.addEventListener("click", () => elegir(i, true)));

  // ---------- Cámara y encuadre ----------
  let ancho = 1, alto = 1, giro = 0, giroObj = 0, elev = 0, elevObj = 0, visible = true, animando = false;
  const GMAX = 0.5;
  function orientar() {
    const a = -0.55 + giro, e = 0.68 + elev;
    camara.position.set(Math.sin(a) * Math.cos(e) * 30, Math.sin(e) * 30, Math.cos(a) * Math.cos(e) * 30);
    camara.lookAt(0, 0.3, 0); camara.updateMatrixWorld();
  }
  function ajustar() {
    const r = contenedor.getBoundingClientRect(); ancho = Math.max(1, r.width); alto = Math.max(1, r.height);
    renderer.setSize(ancho, alto, false);
    const asp = ancho / alto, p = new THREE.Vector3(), g0 = giro, e0 = elev;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let a = -GMAX; a <= GMAX + 1e-6; a += GMAX / 5) {
      giro = a; elev = 0; orientar();
      for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) for (const y of [-0.22, 1.4]) {
        p.set(sx * (AN / 2 + 0.3), y, sz * (PR / 2 + 0.3)).applyMatrix4(camara.matrixWorldInverse);
        x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
      }
    }
    giro = g0; elev = e0;
    const media = Math.max((y1 - y0) / 2 * 1.03, (x1 - x0) / 2 / asp * 1.02), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    camara.left = cx - media * asp; camara.right = cx + media * asp; camara.top = cy + media; camara.bottom = cy - media;
    camara.updateProjectionMatrix(); pedir();
  }
  const v = new THREE.Vector3();
  const aPantalla = (x, y, z) => { v.set(x, y, z).project(camara); return [(v.x + 1) / 2 * ancho, (1 - v.y) / 2 * alto]; };
  const colocar = (el, x, y, z, dy = 30) => { const [sx, sy] = aPantalla(x, y, z); el.style.transform = `translate(${Math.round(Math.min(ancho - el.offsetWidth - 6, Math.max(6, sx - el.offsetWidth / 2)))}px, ${Math.round(sy - dy)}px)`; };

  const e3 = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
  const t0 = performance.now();
  let previo = t0;
  function dibujar(ahora) {
    const t = (ahora - t0) / 1000, dt = Math.min(0.05, (ahora - previo) / 1000); previo = ahora;
    if (auto && ahora - ultimoCambio > 6500) elegir((metodo + 1) % 3);
    let enMovimiento = false;
    for (let k = 0; k < 3; k++) {
      const obj = k === metodo ? 1 : 0;
      peso[k] = reducido ? obj : peso[k] + (obj - peso[k]) * Math.min(1, dt * 5);
      if (Math.abs(peso[k] - obj) > 0.002) enMovimiento = true;
    }
    const lat = reducido ? 0 : Math.sin(t * 2);
    // radios: crecen desde el local y laten suavemente
    grupoRadios.scale.setScalar(Math.max(0.001, e3(peso[0]) * (1 + 0.01 * lat)));
    grupoRadios.visible = peso[0] > 0.01;
    // isócronas: suben como terrazas
    grupoIso.scale.set(1, Math.max(0.001, e3(peso[1])), 1); grupoIso.visible = peso[1] > 0.01;
    grupoIso.children.forEach((m, k) => (m.material.opacity = (0.4 + k * 0.12) * peso[1]));
    // Huff: columnas cuya altura es la probabilidad de elegir el local evaluado
    if (peso[2] > 0.01 || huff.visible) {
      const f = e3(peso[2]);
      celdas.forEach((c, i) => { m4.makeScale(1, Math.max(0.001, (0.03 + c.p * 0.55) * f), 1).setPosition(c.x, 0.005, c.z); huff.setMatrixAt(i, m4); });
      huff.instanceMatrix.needsUpdate = true; huff.visible = peso[2] > 0.01;
    }
    bloques.material.opacity = 0.92 - 0.6 * peso[2];
    marcasComp.forEach((m) => m.scale.setScalar(0.85 + 0.25 * peso[2]));

    const vaiven = reducido ? 0 : Math.sin(t * 0.17) * 0.3;
    giro += (Math.max(-GMAX, Math.min(GMAX, vaiven + giroObj)) - giro) * 0.08; elev += (elevObj - elev) * 0.08;
    orientar();
    renderer.render(escena, camara);
    colocar(etLocal, local[0], 1.35, local[1], 34);
    comps.forEach(([x, z], k) => { colocar(etComp[k], x, 1.0, z); etComp[k].style.opacity = 0.35 + 0.65 * peso[2]; });
    colocar(etRio, RIO_X, 0.05, PR / 2 - 0.6, 8); etRio.style.opacity = Math.max(peso[0], peso[1]) > 0.5 ? 1 : 0;

    animando = visible && (!reducido || enMovimiento || arrastre);
    if (animando) requestAnimationFrame(dibujar);
  }
  function pedir() { if (!animando) { animando = true; previo = performance.now(); requestAnimationFrame(dibujar); } }

  let arrastre = null;
  contenedor.style.touchAction = "pan-y";
  contenedor.addEventListener("pointerdown", (ev) => { arrastre = { x: ev.clientX, y: ev.clientY, g: giroObj, e: elevObj }; contenedor.setPointerCapture(ev.pointerId); contenedor.classList.add("es-arrastre"); });
  contenedor.addEventListener("pointermove", (ev) => {
    if (!arrastre) return;
    giroObj = Math.max(-0.22, Math.min(0.22, arrastre.g + (ev.clientX - arrastre.x) * 0.004));
    elevObj = Math.max(-0.2, Math.min(0.3, arrastre.e - (ev.clientY - arrastre.y) * 0.003));
    if (reducido) { giro = giroObj; elev = elevObj; }
    pedir();
  });
  const soltar = () => { arrastre = null; contenedor.classList.remove("es-arrastre"); };
  contenedor.addEventListener("pointerup", soltar); contenedor.addEventListener("pointercancel", soltar);
  new ResizeObserver(ajustar).observe(contenedor);
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) pedir(); }).observe(contenedor);
  elegir(0);
  ajustar();
  contenedor.classList.add("hero3d--activo");
}
