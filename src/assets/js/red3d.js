// Escena 3D de portada: una red de puntos de venta sobre una ciudad conceptual.
// Todo es ilustrativo: la ciudad, las ubicaciones y las áreas no representan un lugar ni datos reales.
// Secuencia (la "cuarta dimensión"): la ciudad se eleva, aparecen los puntos, se expanden las áreas
// de influencia, se trazan las conexiones y por último se iluminan la brecha y la oportunidad.
import * as THREE from "../vendor/three.module.min.js";

const contenedor = document.querySelector("[data-red3d]");
const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function webglDisponible() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch { return false; }
}
if (contenedor && webglDisponible()) iniciar();

function iniciar() {
  const COL = {
    suelo: 0xF4F8FC, calle: 0xD5E2EE, bloque: 0xFFFFFF, bloqueAlto: 0xE3EDF6,
    propio: 0x00C2C7, propioOsc: 0x0B2D4A, comp: 0x5B6B7C, sup: 0xF2A93B, brecha: 0xE0457B, oport: 0x39D98A,
  };
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const renderer = new THREE.WebGLRenderer({ antialias: dpr < 1.5, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.className = "hero3d__lienzo";
  canvas.setAttribute("aria-hidden", "true");
  contenedor.appendChild(canvas);

  const escena = new THREE.Scene();
  const camara = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  escena.add(new THREE.HemisphereLight(0xffffff, 0x9fb6cc, 1.5));
  const sol = new THREE.DirectionalLight(0xffffff, 1.4);
  sol.position.set(-5, 10, 4);
  escena.add(sol);

  const mundo = new THREE.Group();
  escena.add(mundo);
  const AN = 12, PR = 8; // tamaño de la ciudad

  // ---------- Suelo y calles ----------
  const suelo = new THREE.Mesh(new THREE.BoxGeometry(AN + 0.6, 0.22, PR + 0.6), new THREE.MeshStandardMaterial({ color: COL.suelo, roughness: 0.95 }));
  suelo.position.y = -0.11;
  mundo.add(suelo);
  const lineas = [];
  for (let x = -AN / 2; x <= AN / 2 + 1e-6; x += 1) lineas.push(new THREE.Vector3(x, 0.002, -PR / 2), new THREE.Vector3(x, 0.002, PR / 2));
  for (let z = -PR / 2; z <= PR / 2 + 1e-6; z += 1) lineas.push(new THREE.Vector3(-AN / 2, 0.002, z), new THREE.Vector3(AN / 2, 0.002, z));
  mundo.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(lineas), new THREE.LineBasicMaterial({ color: COL.calle })));

  // ---------- Ubicaciones conceptuales ----------
  const propios = [[-3.6, 1.5], [-2.3, 0.6], [-0.6, -1.9], [1.1, 2.0], [-4.6, -2.1], [2.5, 0.0]];
  const competidores = [[0.4, 0.4], [-1.5, 2.9], [3.4, 2.6], [-3.1, -0.9], [4.8, 0.9]];
  const RINF = 1.45;
  const brecha = { x: 3.9, z: -2.2, r: 1.05 };

  // ---------- Manzanas (instanciadas); la zona de brecha es más densa ----------
  let semilla = 7;
  const azar = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);
  const geoBloque = new THREE.BoxGeometry(1, 1, 1);
  geoBloque.translate(0, 0.5, 0);
  const manzanas = [];
  for (let i = 0; i < AN; i++) for (let j = 0; j < PR; j++) {
    const cx = -AN / 2 + i + 0.5, cz = -PR / 2 + j + 0.5;
    const enBrecha = Math.hypot(cx - brecha.x, cz - brecha.z) < brecha.r + 0.6;
    const ocupado = [...propios, ...competidores].some(([x, z]) => Math.abs(x - cx) < 0.5 && Math.abs(z - cz) < 0.5);
    const n = ocupado ? 1 : 2;
    for (let k = 0; k < n; k++) {
      const s = n === 1 ? 0.3 : 0.32;
      const ox = n === 1 ? (cx < 0 ? 0.25 : -0.25) : (k ? 0.19 : -0.19);
      const h = enBrecha ? 0.35 + azar() * 0.45 : 0.06 + azar() * 0.22;
      manzanas.push({ x: cx + ox, z: cz + (azar() - 0.5) * 0.3, w: s, d: s + azar() * 0.2, h, alto: enBrecha });
    }
  }
  const matBloque = new THREE.MeshStandardMaterial({ color: COL.bloque, roughness: 0.8 });
  const bloques = new THREE.InstancedMesh(geoBloque, matBloque, manzanas.length);
  manzanas.forEach((m, k) => bloques.setColorAt(k, new THREE.Color(m.alto ? COL.bloqueAlto : COL.bloque)));
  mundo.add(bloques);
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), esc = new THREE.Vector3(), pos = new THREE.Vector3();
  function alturaManzanas(f) {
    manzanas.forEach((m, k) => { pos.set(m.x, 0, m.z); esc.set(m.w, Math.max(0.001, m.h * f), m.d); bloques.setMatrixAt(k, mtx.compose(pos, q, esc)); });
    bloques.instanceMatrix.needsUpdate = true;
  }

  // ---------- Áreas de influencia ----------
  const geoDisco = new THREE.CircleGeometry(1, 64); geoDisco.rotateX(-Math.PI / 2);
  const geoAro = new THREE.RingGeometry(0.985, 1, 64); geoAro.rotateX(-Math.PI / 2);
  const areas = propios.map(([x, z], k) => {
    const g = new THREE.Group(); g.position.set(x, 0.01 + k * 0.001, z);
    g.add(new THREE.Mesh(geoDisco, new THREE.MeshBasicMaterial({ color: COL.propio, transparent: true, opacity: 0.16, depthWrite: false })));
    g.add(new THREE.Mesh(geoAro, new THREE.MeshBasicMaterial({ color: COL.propio, transparent: true, opacity: 0.8, depthWrite: false })));
    g.scale.setScalar(0.001); mundo.add(g); return g;
  });

  // Superposición entre los dos primeros puntos propios (lente entre dos círculos iguales)
  const [A, B] = [propios[0], propios[1]];
  const dAB = Math.hypot(B[0] - A[0], B[1] - A[1]), dir = Math.atan2(B[1] - A[1], B[0] - A[0]), h = Math.acos(dAB / (2 * RINF));
  const lente = [];
  for (let k = 0; k <= 24; k++) { const a = dir - h + (2 * h * k) / 24; lente.push(new THREE.Vector2(A[0] + Math.cos(a) * RINF, A[1] + Math.sin(a) * RINF)); }
  for (let k = 0; k <= 24; k++) { const a = dir + Math.PI - h + (2 * h * k) / 24; lente.push(new THREE.Vector2(B[0] + Math.cos(a) * RINF, B[1] + Math.sin(a) * RINF)); }
  const geoLente = new THREE.ShapeGeometry(new THREE.Shape(lente.map((p) => new THREE.Vector2(p.x, -p.y))));
  geoLente.rotateX(-Math.PI / 2);
  const matLente = new THREE.MeshBasicMaterial({ color: COL.sup, transparent: true, opacity: 0, depthWrite: false, depthTest: false });
  const mallaLente = new THREE.Mesh(geoLente, matLente); mallaLente.position.y = 0.03; mundo.add(mallaLente);
  const centroLente = { x: (A[0] + B[0]) / 2, z: (A[1] + B[1]) / 2 };

  // Brecha: zona densa sin cobertura propia (anillo discontinuo que late)
  const ptsBrecha = []; for (let k = 0; k <= 96; k++) { const a = (k / 96) * Math.PI * 2; ptsBrecha.push(new THREE.Vector3(Math.cos(a) * brecha.r, 0, Math.sin(a) * brecha.r)); }
  const aroBrecha = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ptsBrecha), new THREE.LineDashedMaterial({ color: COL.brecha, dashSize: 0.14, gapSize: 0.09, transparent: true, opacity: 0 }));
  aroBrecha.computeLineDistances(); aroBrecha.position.set(brecha.x, 0.04, brecha.z); mundo.add(aroBrecha);
  const matDiscoBrecha = new THREE.MeshBasicMaterial({ color: COL.brecha, transparent: true, opacity: 0, depthWrite: false });
  const discoBrecha = new THREE.Mesh(geoDisco, matDiscoBrecha); discoBrecha.scale.setScalar(brecha.r); discoBrecha.position.set(brecha.x, 0.02, brecha.z); mundo.add(discoBrecha);

  // Oportunidad: haz de luz y marcador en el centro de la brecha
  const matHaz = new THREE.MeshBasicMaterial({ color: COL.oport, transparent: true, opacity: 0, depthWrite: false });
  const haz = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.2, 2.2, 24, 1, true), matHaz);
  haz.position.set(brecha.x, 1.1, brecha.z); mundo.add(haz);
  const marcaOport = new THREE.Mesh(new THREE.OctahedronGeometry(0.16), new THREE.MeshStandardMaterial({ color: COL.oport, emissive: COL.oport, emissiveIntensity: 0.5 }));
  marcaOport.position.set(brecha.x, 1.3, brecha.z); marcaOport.scale.setScalar(0.001); mundo.add(marcaOport);

  // ---------- Puntos de venta ----------
  const geoPoste = new THREE.CylinderGeometry(0.035, 0.035, 0.55, 10); geoPoste.translate(0, 0.275, 0);
  const geoCabeza = new THREE.SphereGeometry(0.13, 20, 14);
  const geoLocal = new THREE.BoxGeometry(0.42, 0.22, 0.42); geoLocal.translate(0, 0.11, 0);
  const matPropio = new THREE.MeshStandardMaterial({ color: COL.propio, roughness: 0.4, emissive: COL.propio, emissiveIntensity: 0.15 });
  const matLocal = new THREE.MeshStandardMaterial({ color: COL.propioOsc, roughness: 0.6 });
  const marcasPropias = propios.map(([x, z]) => {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    g.add(new THREE.Mesh(geoLocal, matLocal));
    const poste = new THREE.Mesh(geoPoste, matPropio); poste.position.y = 0.22; g.add(poste);
    const cab = new THREE.Mesh(geoCabeza, matPropio); cab.position.y = 0.86; g.add(cab);
    g.scale.setScalar(0.001); mundo.add(g); return g;
  });
  const geoComp = new THREE.ConeGeometry(0.17, 0.42, 4); geoComp.translate(0, 0.21, 0);
  const matComp = new THREE.MeshStandardMaterial({ color: COL.comp, roughness: 0.6 });
  const marcasComp = competidores.map(([x, z]) => { const m = new THREE.Mesh(geoComp, matComp); m.position.set(x, 0, z); m.rotation.y = Math.PI / 4; m.scale.setScalar(0.001); mundo.add(m); return m; });

  // ---------- Conexiones de la red propia ----------
  const orden = [4, 0, 1, 2, 5, 3, 1];
  const ptsRed = [];
  for (let k = 0; k < orden.length - 1; k++) {
    const [x0, z0] = propios[orden[k]], [x1, z1] = propios[orden[k + 1]];
    const curva = new THREE.QuadraticBezierCurve3(new THREE.Vector3(x0, 0.86, z0), new THREE.Vector3((x0 + x1) / 2, 1.6, (z0 + z1) / 2), new THREE.Vector3(x1, 0.86, z1));
    ptsRed.push(...curva.getPoints(30));
  }
  const geoRed = new THREE.BufferGeometry().setFromPoints(ptsRed);
  const red = new THREE.Line(geoRed, new THREE.LineBasicMaterial({ color: COL.propio, transparent: true, opacity: 0.85 }));
  geoRed.setDrawRange(0, 0); mundo.add(red);

  // ---------- Etiquetas ----------
  const capaEt = document.createElement("div"); capaEt.className = "hero3d__etiquetas"; contenedor.appendChild(capaEt);
  const crear = (texto, mod) => { const e = document.createElement("span"); e.className = "hero3d__etiqueta red3d__et red3d__et--" + mod; e.textContent = texto; e.style.opacity = 0; capaEt.appendChild(e); return e; };
  const ets = [
    { el: crear("Punto de venta propio", "propio"), p: new THREE.Vector3(propios[2][0], 1.05, propios[2][1]), desde: 1.8 },
    { el: crear("Competidor", "comp"), p: new THREE.Vector3(competidores[2][0], 0.5, competidores[2][1]), desde: 2.2 },
    { el: crear("Área de influencia", "propio"), p: new THREE.Vector3(propios[4][0], 0.02, propios[4][1] + RINF), desde: 3.2 },
    { el: crear("Superposición", "sup"), p: new THREE.Vector3(centroLente.x, 0.05, centroLente.z), desde: 4.2 },
    { el: crear("Sin cobertura propia", "brecha"), p: new THREE.Vector3(brecha.x, 0.05, brecha.z + brecha.r), desde: 5.6 },
    { el: crear("Oportunidad de expansión", "oport"), p: new THREE.Vector3(brecha.x, 1.55, brecha.z), desde: 6.4 },
  ];

  // ---------- Cámara y encuadre ----------
  let ancho = 1, alto = 1, giro = 0, giroObj = 0, elev = 0, elevObj = 0, visible = true, animando = false;
  const GIRO_MAX = 0.55;
  function orientar() {
    const a = -0.62 + giro, e = 0.62 + elev;
    camara.position.set(Math.sin(a) * Math.cos(e) * 30, Math.sin(e) * 30, Math.cos(a) * Math.cos(e) * 30);
    camara.lookAt(0, 0.3, 0); camara.updateMatrixWorld();
  }
  function ajustar() {
    const r = contenedor.getBoundingClientRect();
    ancho = Math.max(1, r.width); alto = Math.max(1, r.height);
    renderer.setSize(ancho, alto, false);
    const asp = ancho / alto;
    // Encuadre: se recorre todo el giro permitido y se toma el rectángulo que contiene la ciudad
    const g0 = giro, e0 = elev, p = new THREE.Vector3();
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let a = -GIRO_MAX; a <= GIRO_MAX + 1e-6; a += GIRO_MAX / 6) {
      giro = a; elev = 0; orientar();
      for (const [cx, cz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) for (const y of [-0.22, 0.4]) {
        p.set(cx * (AN / 2 + 0.3), y, cz * (PR / 2 + 0.3)).applyMatrix4(camara.matrixWorldInverse);
        x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
      }
    }
    giro = g0; elev = e0;
    y1 += 1.1; // pines y haz de luz
    const media = Math.max((y1 - y0) / 2 * 1.04, (x1 - x0) / 2 / asp * 1.02), cy = (y0 + y1) / 2, cx = (x0 + x1) / 2;
    camara.left = cx - media * asp; camara.right = cx + media * asp; camara.top = cy + media; camara.bottom = cy - media;
    camara.updateProjectionMatrix();
    pedir();
  }
  const v = new THREE.Vector3();
  const aPantalla = (p) => { v.copy(p).applyMatrix4(mundo.matrixWorld).project(camara); return [(v.x + 1) / 2 * ancho, (1 - v.y) / 2 * alto, v.z]; };

  const e3 = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
  const t0 = performance.now();
  function dibujar(ahora) {
    const t = reducido ? 99 : (ahora - t0) / 1000;
    alturaManzanas(e3((t - 0.1) / 1.2));
    marcasPropias.forEach((m, k) => m.scale.setScalar(Math.max(0.001, e3((t - 0.9 - k * 0.12) / 0.5))));
    marcasComp.forEach((m, k) => m.scale.setScalar(Math.max(0.001, e3((t - 1.4 - k * 0.12) / 0.5))));
    const latido = reducido ? 0.5 : 0.5 + 0.5 * Math.sin(t * 2.2);
    areas.forEach((g, k) => g.scale.setScalar(Math.max(0.001, RINF * e3((t - 2.2 - k * 0.15) / 1.3) * (1 + 0.015 * latido))));
    geoRed.setDrawRange(0, Math.floor(ptsRed.length * e3((t - 3.4) / 1.8)));
    const fSup = e3((t - 4.0) / 0.8); matLente.opacity = fSup * (0.6 + 0.25 * latido);
    const fBr = e3((t - 5.2) / 0.8); aroBrecha.material.opacity = fBr; matDiscoBrecha.opacity = fBr * (0.1 + 0.12 * latido);
    aroBrecha.rotation.y = reducido ? 0 : t * 0.15;
    const fOp = e3((t - 6.0) / 0.9); matHaz.opacity = fOp * (0.22 + 0.12 * latido);
    marcaOport.scale.setScalar(Math.max(0.001, fOp)); marcaOport.position.y = 1.3 + (reducido ? 0 : Math.sin(t * 1.6) * 0.08); marcaOport.rotation.y = t * 0.8;

    // Vaivén lento y continuo, más el giro que agregue el usuario al arrastrar
    const vaiven = reducido ? 0 : Math.sin(t * 0.16) * 0.3;
    giro += (Math.max(-GIRO_MAX, Math.min(GIRO_MAX, vaiven + giroObj)) - giro) * 0.08; elev += (elevObj - elev) * 0.08;
    orientar();
    mundo.updateMatrixWorld();
    renderer.render(escena, camara);

    ets.forEach(({ el, p, desde }) => {
      const [x, y] = aPantalla(p);
      el.style.transform = `translate(${Math.round(Math.min(ancho - el.offsetWidth - 6, Math.max(6, x - el.offsetWidth / 2)))}px, ${Math.round(y - 30)}px)`;
      el.style.opacity = t > desde ? 1 : 0;
    });

    animando = visible && !(reducido && !arrastre);
    if (animando) requestAnimationFrame(dibujar);
  }
  function pedir() { if (!animando) { animando = true; requestAnimationFrame(dibujar); } }

  // Arrastre para girar
  let arrastre = null;
  contenedor.style.touchAction = "pan-y";
  contenedor.addEventListener("pointerdown", (ev) => { arrastre = { x: ev.clientX, y: ev.clientY, g: giroObj, e: elevObj }; contenedor.setPointerCapture(ev.pointerId); contenedor.classList.add("es-arrastre"); });
  contenedor.addEventListener("pointermove", (ev) => {
    if (!arrastre) return;
    giroObj = Math.max(-0.25, Math.min(0.25, arrastre.g + (ev.clientX - arrastre.x) * 0.004));
    elevObj = Math.max(-0.25, Math.min(0.35, arrastre.e - (ev.clientY - arrastre.y) * 0.003));
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
