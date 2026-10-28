// Escena 3D de la portada: una ciudad comercial isométrica con tiendas, competencia,
// una ruta de visitas iluminada y paneles de análisis. Es una ilustración: los gráficos
// de los paneles son decorativos y no representan resultados reales.
import * as THREE from "../vendor/three.module.min.js";

const contenedor = document.querySelector("[data-hero3d]");
const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function webglDisponible() {
  try { const c = document.createElement("canvas"); return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl"))); }
  catch { return false; }
}
if (contenedor && webglDisponible()) { try { iniciar(); } catch { /* queda la imagen fija */ } }

function rng(semilla) { let s = (semilla * 2654435761) >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function iniciar() {
  const r = rng(17);
  const C = {
    suelo: 0x0f2c4b, calle: 0x16395f, vereda: 0x1d4068, edif: new THREE.Color("#2B5683"), edif2: new THREE.Color("#3A6A99"),
    tienda: new THREE.Color("#13A89E"), comp: new THREE.Color("#9DB4CC"), cian: 0x3fd0e8, turC: 0xbfede8, blanco: 0xffffff,
  };

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.className = "hero3d__lienzo";
  canvas.setAttribute("aria-hidden", "true");
  const escena = new THREE.Scene();
  const camara = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  escena.add(new THREE.HemisphereLight(0xdff6f3, 0x0a1d33, 1.2));
  const sol = new THREE.DirectionalLight(0xffffff, 1.7); sol.position.set(-5, 12, 7); escena.add(sol);

  // ---------- Trazado urbano ----------
  const N = 5, B = 1.9, S = 0.6, PASO = B + S, INI = -(N * B + (N - 1) * S) / 2;
  const calle = (k) => INI - S / 2 + k * PASO;           // coordenada de la calle k (0..N)
  const LADO = N * B + (N + 1) * S + 0.4;
  const losa = new THREE.Mesh(new THREE.BoxGeometry(LADO, 0.4, LADO), new THREE.MeshStandardMaterial({ color: C.suelo, roughness: 0.9 }));
  losa.position.y = -0.2; escena.add(losa);
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(LADO - 0.1, LADO - 0.1).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: C.calle, roughness: 1 }));
  piso.position.y = 0.001; escena.add(piso);
  const bordeLosa = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(LADO, 0.4, LADO)), new THREE.LineBasicMaterial({ color: C.cian, transparent: true, opacity: 0.35 }));
  bordeLosa.position.y = -0.2; escena.add(bordeLosa);

  // manzanas (veredas)
  const veredas = new THREE.InstancedMesh(new THREE.BoxGeometry(B, 0.08, B), new THREE.MeshStandardMaterial({ color: C.vereda, roughness: 0.85 }), N * N);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { m4.makeTranslation(INI + i * PASO + B / 2, 0.04, INI + j * PASO + B / 2); veredas.setMatrixAt(i * N + j, m4); }
  escena.add(veredas);

  // lotes: 2 x 2 por manzana; cada lote toca la esquina (intersección) bi+qx, bj+qz
  const LOTE = B / 2 - 0.12;
  const lotes = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) for (let qx = 0; qx < 2; qx++) for (let qz = 0; qz < 2; qz++) {
    const x = INI + i * PASO + 0.08 + qx * (B / 2) + LOTE / 2 - 0.02 + qx * 0.04, z = INI + j * PASO + 0.08 + qz * (B / 2) + LOTE / 2 - 0.02 + qz * 0.04;
    const dc = Math.hypot(x, z) / (LADO / 2);
    lotes.push({ x, z, kx: i + qx, kz: j + qz, alto: 0.25 + Math.pow(r(), 1.6) * 1.9 * (1.15 - dc), tipo: "edif" });
  }
  // tiendas propias y competencia
  const idx = [...lotes.keys()].sort(() => r() - 0.5);
  const tiendas = idx.slice(0, 9).map((k) => lotes.at(k));
  const competencia = idx.slice(9, 15).map((k) => lotes.at(k));
  tiendas.forEach((l) => { l.tipo = "tienda"; l.alto = 0.32 + r() * 0.12; });
  competencia.forEach((l) => { l.tipo = "comp"; l.alto = 0.3 + r() * 0.12; });
  const deposito = lotes.at(idx.at(15)); deposito.tipo = "deposito"; deposito.alto = 0.55;

  const edificios = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.05 }), lotes.length);
  const col = new THREE.Color();
  lotes.forEach((l, k) => {
    if (l.tipo === "tienda") col.copy(C.tienda);
    else if (l.tipo === "comp") col.copy(C.comp);
    else if (l.tipo === "deposito") col.set(0xe8f6f4);
    else col.copy(C.edif).lerp(C.edif2, r() * 0.8);
    edificios.setColorAt(k, col);
  });
  escena.add(edificios);

  // marcadores flotantes sobre las tiendas
  const marcas = new THREE.Group();
  const geoAro = new THREE.TorusGeometry(0.16, 0.035, 8, 28).rotateX(Math.PI / 2);
  tiendas.forEach((l) => { const a = new THREE.Mesh(geoAro, new THREE.MeshBasicMaterial({ color: C.turC })); a.position.set(l.x, l.alto + 0.35, l.z); a.userData.y0 = l.alto + 0.35; marcas.add(a); });
  escena.add(marcas);

  // ---------- Ruta de visitas por las calles ----------
  const nodo = (l) => ({ kx: l.kx, kz: l.kz });
  const orden = [];
  let actual = nodo(deposito);
  const pend = tiendas.map(nodo);
  while (pend.length) {
    let mejor = 0, dm = Infinity;
    pend.forEach((p, i) => { const d = Math.abs(p.kx - actual.kx) + Math.abs(p.kz - actual.kz); if (d < dm) { dm = d; mejor = i; } });
    actual = pend.splice(mejor, 1)[0]; orden.push(actual);
  }
  const Y = 0.1, puntos = [];
  let prev = nodo(deposito);
  puntos.push(new THREE.Vector3(calle(prev.kx), Y, calle(prev.kz)));
  [...orden, nodo(deposito)].forEach((n) => {
    if (n.kx !== prev.kx) puntos.push(new THREE.Vector3(calle(n.kx), Y, calle(prev.kz)));
    if (n.kz !== prev.kz) puntos.push(new THREE.Vector3(calle(n.kx), Y, calle(n.kz)));
    prev = n;
  });
  const camino = new THREE.CurvePath();
  for (let i = 1; i < puntos.length; i++) if (puntos[i].distanceTo(puntos[i - 1]) > 1e-6) camino.add(new THREE.LineCurve3(puntos[i - 1], puntos[i]));
  const SEG = 600;
  const tubo = new THREE.Mesh(new THREE.TubeGeometry(camino, SEG, 0.045, 6, false), new THREE.MeshBasicMaterial({ color: C.cian }));
  const halo = new THREE.Mesh(new THREE.TubeGeometry(camino, SEG, 0.13, 8, false), new THREE.MeshBasicMaterial({ color: C.cian, transparent: true, opacity: 0.16, depthWrite: false }));
  escena.add(tubo, halo);
  const totalTubo = tubo.geometry.index.count, totalHalo = halo.geometry.index.count;
  const pulso = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  escena.add(pulso);

  // ---------- Paneles de análisis (texturas dibujadas en canvas) ----------
  function textura(titulo, sub, tipo) {
    const W = 640, H = 400, c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d");
    const redondo = (x, y, w, h, rr) => { g.beginPath(); g.moveTo(x + rr, y); g.arcTo(x + w, y, x + w, y + h, rr); g.arcTo(x + w, y + h, x, y + h, rr); g.arcTo(x, y + h, x, y, rr); g.arcTo(x, y, x + w, y, rr); g.closePath(); };
    redondo(6, 6, W - 12, H - 12, 22); g.fillStyle = "rgba(10,32,56,0.88)"; g.fill(); g.lineWidth = 3; g.strokeStyle = "rgba(63,208,232,0.75)"; g.stroke();
    g.fillStyle = "#FFFFFF"; g.font = "700 50px 'Public Sans', Arial, sans-serif"; g.fillText(titulo, 36, 74);
    g.fillStyle = "#8FD9D2"; g.font = "34px 'Public Sans', Arial, sans-serif"; g.fillText(sub, 36, 120);
    const rr = rng(titulo.length * 13);
    g.strokeStyle = "rgba(255,255,255,0.12)"; g.lineWidth = 2;
    for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(36, 170 + k * 52); g.lineTo(W - 36, 170 + k * 52); g.stroke(); }
    if (tipo === "barras") {
      for (let k = 0; k < 7; k++) { const h = 40 + rr() * 150; g.fillStyle = k === 5 ? "#3FD0E8" : "#13A89E"; g.fillRect(48 + k * 76, 342 - h, 46, h); }
    } else if (tipo === "dona") {
      const cx = 180, cy = 255, rad = 92, partes = [0.38, 0.27, 0.2, 0.15], colores = ["#13A89E", "#3FD0E8", "#5B7FA6", "#9DB4CC"];
      let a0 = -Math.PI / 2; partes.forEach((p, k) => { g.beginPath(); g.lineWidth = 38; g.strokeStyle = colores.at(k); g.arc(cx, cy, rad, a0, a0 + p * Math.PI * 2 - 0.04); g.stroke(); a0 += p * Math.PI * 2; });
      for (let k = 0; k < 4; k++) { g.fillStyle = colores.at(k); g.fillRect(330, 190 + k * 40, 26, 26); g.fillStyle = "rgba(255,255,255,0.55)"; g.fillRect(370, 198 + k * 40, 120 + rr() * 90, 10); }
    } else if (tipo === "linea") {
      g.beginPath(); g.lineWidth = 6; g.strokeStyle = "#3FD0E8"; let y = 300;
      for (let k = 0; k <= 10; k++) { y = Math.max(170, Math.min(330, y - 18 + (rr() - 0.35) * 40)); const x = 48 + k * 54; if (k) g.lineTo(x, y); else g.moveTo(x, y); }
      g.stroke(); g.fillStyle = "#FFFFFF"; g.beginPath(); g.arc(588, y, 10, 0, Math.PI * 2); g.fill();
    } else {
      for (let k = 0; k < 4; k++) { const w = 140 + rr() * 380; g.fillStyle = "rgba(255,255,255,0.14)"; g.fillRect(48, 168 + k * 46, W - 96, 28); g.fillStyle = k === 0 ? "#3FD0E8" : "#13A89E"; g.fillRect(48, 168 + k * 46, w, 28); }
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  }
  const paneles = [
    { t: "Market Research", s: "Satisfacción por zona", tipo: "horizontal", pos: [-7.0, 3.4, 2.4], ancla: tiendas.at(3) },
    { t: "Data Analytics", s: "Indicadores y tendencias", tipo: "barras", pos: [-5.4, 4.7, -2.4], ancla: lotes.at(idx.at(20)) },
    { t: "Trade Intelligence", s: "Share of shelf por marca", tipo: "dona", pos: [-2.4, 4.7, -5.4], ancla: competencia.at(0) },
    { t: "Field Operations", s: "Visitas completadas", tipo: "linea", pos: [2.4, 3.4, -7.0], ancla: tiendas.at(0) },
  ].map((p) => {
    const mat = new THREE.MeshBasicMaterial({ map: textura(p.t, p.s, p.tipo), transparent: true, depthWrite: false, opacity: 0 });
    const plano = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 2.06), mat);
    plano.position.set(...p.pos);
    const linea = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(p.pos[0], p.pos[1] - 1.03, p.pos[2]), new THREE.Vector3(p.ancla.x, p.ancla.alto + 0.02, p.ancla.z)]),
      new THREE.LineDashedMaterial({ color: C.cian, dashSize: 0.12, gapSize: 0.08, transparent: true, opacity: 0 }));
    linea.computeLineDistances();
    escena.add(plano, linea);
    return { plano, linea, mat };
  });

  contenedor.appendChild(canvas);

  // ---------- Animación ----------
  const t0 = performance.now();
  let azim = 0, azimObj = 0, elev = 0, elevObj = 0, visible = true, ancho = 1, alto = 1, corriendo = false;
  const e3 = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

  function poner(tiempo) {
    const crec = reducido ? 1 : null;
    lotes.forEach((l, k) => {
      const retardo = (Math.hypot(l.x, l.z) / (LADO / 2)) * 0.6;
      const f = crec ?? e3((tiempo - 0.1 - retardo) / 0.9);
      const lado = l.tipo === "edif" ? LOTE : LOTE * 0.92;
      m4.makeScale(lado, Math.max(0.001, l.alto * f), lado).setPosition(l.x, 0.08, l.z);
      edificios.setMatrixAt(k, m4);
    });
    edificios.instanceMatrix.needsUpdate = true;
    const dib = reducido ? 1 : e3((tiempo - 1.2) / 1.8);
    tubo.geometry.setDrawRange(0, Math.floor((totalTubo * dib) / 3) * 3);
    halo.geometry.setDrawRange(0, Math.floor((totalHalo * dib) / 3) * 3);
    const op = reducido ? 1 : e3((tiempo - 1.9) / 0.8);
    paneles.forEach((p, i) => { p.mat.opacity = op; p.linea.material.opacity = op * 0.8; p.plano.position.y = p.plano.position.y; });
    const u = reducido ? 0.32 : dib < 1 ? dib : ((tiempo - 3) / 14) % 1;
    pulso.position.copy(camino.getPointAt(Math.max(0, Math.min(1, u))));
    pulso.visible = dib > 0.02;
    marcas.children.forEach((a, i) => { a.position.y = a.userData.y0 + (reducido ? 0 : Math.sin(tiempo * 1.6 + i) * 0.05); a.visible = (reducido ? 1 : e3((tiempo - 0.9) / 0.6)) > 0.5; });
  }
  function orientar(az, el) {
    const a = Math.PI / 4 + az, e = 0.6 + el;
    camara.position.set(Math.sin(a) * Math.cos(e) * 40, Math.sin(e) * 40, Math.cos(a) * Math.cos(e) * 40);
    camara.lookAt(0, 1.0, 0); camara.updateMatrixWorld();
    paneles.forEach((p) => p.plano.quaternion.copy(camara.quaternion));
  }
  let centro = new THREE.Vector2(), media = 1;
  function encuadre() {
    orientar(0, 0);
    const inv = camara.matrixWorldInverse, v = new THREE.Vector3();
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    const incl = (x, y, z) => { v.set(x, y, z).applyMatrix4(inv); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); };
    const h = LADO / 2;
    [[-h, -h], [h, -h], [h, h], [-h, h]].forEach(([x, z]) => { incl(x, -0.4, z); incl(x, 1.2, z); });
    paneles.forEach((p) => { const q = p.plano.position; const ox = 1.17, oz = 1.17; incl(q.x - ox, q.y + 1.05, q.z + oz); incl(q.x + ox, q.y + 1.05, q.z - oz); incl(q.x - ox, q.y - 1.05, q.z + oz); incl(q.x + ox, q.y - 1.05, q.z - oz); });
    const asp = ancho / alto;
    media = Math.max(((y1 - y0) / 2) * 1.04, ((x1 - x0) / 2 / asp) * 1.04);
    centro.set((x0 + x1) / 2, (y0 + y1) / 2);
  }
  function ajustar() {
    const rc = contenedor.getBoundingClientRect(); ancho = Math.max(1, rc.width); alto = Math.max(1, rc.height);
    renderer.setSize(ancho, alto, false); encuadre();
    const asp = ancho / alto;
    camara.left = centro.x - media * asp; camara.right = centro.x + media * asp; camara.top = centro.y + media; camara.bottom = centro.y - media;
    camara.updateProjectionMatrix(); arrancar();
  }
  function cuadro(ahora) {
    const t = (ahora - t0) / 1000;
    azim += (azimObj - azim) * 0.06; elev += (elevObj - elev) * 0.06;
    poner(t); orientar(azim, elev); renderer.render(escena, camara);
    const quieto = Math.abs(azimObj - azim) < 1e-4 && Math.abs(elevObj - elev) < 1e-4;
    corriendo = visible && !(reducido && quieto);
    if (corriendo) requestAnimationFrame(cuadro);
  }
  function arrancar() { if (!corriendo) { corriendo = true; requestAnimationFrame(cuadro); } }

  if (!reducido) contenedor.closest(".portada")?.addEventListener("pointermove", (ev) => {
    const rc = contenedor.getBoundingClientRect();
    azimObj = ((ev.clientX - (rc.left + rc.width / 2)) / window.innerWidth) * 0.4;
    elevObj = ((ev.clientY - (rc.top + rc.height / 2)) / window.innerHeight) * -0.15;
    arrancar();
  });
  new ResizeObserver(ajustar).observe(contenedor);
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) arrancar(); }).observe(contenedor);
  ajustar();
  contenedor.classList.add("hero3d--activo");
  arrancar();
}
