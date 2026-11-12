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
    // Paleta del manual de marca sobre fondo claro
    suelo: 0xc9def0, calle: 0xf4f9ff, vereda: 0xaecbe3, edif: new THREE.Color("#4F82B5"), edif2: new THREE.Color("#86AED6"),
    tienda: new THREE.Color("#00C2C7"), comp: new THREE.Color("#0B2D4A"), cian: 0x007bff, turC: 0xbff0f1, blanco: 0xffffff,
  };

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.className = "hero3d__lienzo";
  canvas.setAttribute("aria-hidden", "true");
  const escena = new THREE.Scene();
  const camara = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  escena.add(new THREE.HemisphereLight(0xffffff, 0x9fb9d2, 1.45));
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
  const pulso = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 14), new THREE.MeshBasicMaterial({ color: 0x39d98a }));
  escena.add(pulso);

  // ---------- Paneles de análisis: gráficos que se redibujan solos (decorativos) ----------
  const PW = 768, PH = 480;
  function dibujarPanel(p, tiempo) {
    const g = p.ctx, W = PW, H = PH;
    g.clearRect(0, 0, W, H);
    const redondo = (x, y, w, h, rr) => { g.beginPath(); g.moveTo(x + rr, y); g.arcTo(x + w, y, x + w, y + h, rr); g.arcTo(x + w, y + h, x, y + h, rr); g.arcTo(x, y + h, x, y, rr); g.arcTo(x, y, x + w, y, rr); g.closePath(); };
    redondo(6, 6, W - 12, H - 12, 26);
    const fondo = g.createLinearGradient(0, 0, 0, H); fondo.addColorStop(0, "rgba(13,52,86,0.97)"); fondo.addColorStop(1, "rgba(9,36,62,0.97)");
    g.fillStyle = fondo; g.fill(); g.lineWidth = 4; g.strokeStyle = "rgba(0,194,199,0.95)"; g.stroke();
    // título y subtítulo grandes y con buen contraste
    g.fillStyle = "#FFFFFF"; g.font = "800 62px 'Inter', 'Segoe UI', Arial, sans-serif"; g.fillText(p.t, 40, 88);
    g.fillStyle = "#9FF3F2"; g.font = "600 40px 'Inter', 'Segoe UI', Arial, sans-serif"; g.fillText(p.s, 40, 142);
    g.strokeStyle = "rgba(255,255,255,0.14)"; g.lineWidth = 2;
    for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(40, 200 + k * 62); g.lineTo(W - 40, 200 + k * 62); g.stroke(); }
    const ola = (k, v = 1) => 0.5 + 0.5 * Math.sin(tiempo * 1.3 * v + k * 0.9 + p.fase);
    if (p.tipo === "barras") {
      for (let k = 0; k < 7; k++) { const h = 60 + (0.35 + 0.65 * ola(k)) * 170; g.fillStyle = k === 5 ? "#39D98A" : "#00C2C7"; g.fillRect(58 + k * 94, 420 - h, 58, h); }
    } else if (p.tipo === "dona") {
      const cx = 200, cy = 305, rad = 104, colores = ["#00C2C7", "#007BFF", "#39D98A", "#9DB6CC"];
      const partes = [0.38, 0.27, 0.2, 0.15].map((v, k) => v * (0.85 + 0.3 * ola(k, 0.7)));
      const tot = partes.reduce((a, v) => a + v, 0);
      let a0 = -Math.PI / 2 + tiempo * 0.35;
      partes.forEach((v, k) => { const a1 = a0 + (v / tot) * Math.PI * 2; g.beginPath(); g.lineWidth = 44; g.strokeStyle = colores[k]; g.arc(cx, cy, rad, a0 + 0.03, a1 - 0.03); g.stroke(); a0 = a1; });
      partes.forEach((v, k) => { g.fillStyle = colores[k]; g.fillRect(390, 222 + k * 50, 32, 32); g.fillStyle = "rgba(255,255,255,0.7)"; g.fillRect(440, 232 + k * 50, 260 * (v / tot) * 1.8, 12); });
    } else if (p.tipo === "linea") {
      const n = 12, avance = (tiempo * 0.9) % 1, base = Math.floor(tiempo * 0.9), pts = [];
      for (let k = 0; k <= n + 1; k++) {
        const x = 58 + ((k - avance) * (W - 116)) / n;
        const y = 330 - 70 * (0.5 + 0.5 * Math.sin((k + base) * 0.75 + p.fase)) - (k + base) % 6 * 8;
        pts.push([x, y]);
      }
      g.save(); g.beginPath(); g.rect(58, 170, W - 116, 280); g.clip();
      const area = g.createLinearGradient(0, 200, 0, 440); area.addColorStop(0, "rgba(57,217,138,0.35)"); area.addColorStop(1, "rgba(57,217,138,0)");
      g.fillStyle = area; g.beginPath(); g.moveTo(pts[0][0], 440); pts.forEach(([x, y]) => g.lineTo(x, y)); g.lineTo(pts.at(-1)[0], 440); g.closePath(); g.fill();
      g.beginPath(); g.lineWidth = 7; g.strokeStyle = "#39D98A"; pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
      g.restore();
      const fin = pts.find(([x]) => x >= W - 58 - (W - 116) / n) || pts.at(-1);
      g.fillStyle = "#FFFFFF"; g.beginPath(); g.arc(Math.min(fin[0], W - 58), fin[1], 12, 0, Math.PI * 2); g.fill();
    } else {
      for (let k = 0; k < 4; k++) { const w = (0.3 + 0.65 * ola(k, 0.8)) * (W - 116); g.fillStyle = "rgba(255,255,255,0.14)"; g.fillRect(58, 196 + k * 58, W - 116, 34); g.fillStyle = k === 0 ? "#39D98A" : "#00C2C7"; g.fillRect(58, 196 + k * 58, w, 34); }
    }
    p.tex.needsUpdate = true;
  }
  const paneles = [
    { t: "Market Research", s: "Satisfacción por zona", tipo: "horizontal", pos: [-7.0, 3.4, 2.4], ancla: tiendas.at(3) },
    { t: "Data Analytics", s: "Indicadores y tendencias", tipo: "barras", pos: [-5.4, 4.9, -2.4], ancla: lotes.at(idx.at(20)) },
    { t: "Trade Intelligence", s: "Share of shelf por marca", tipo: "dona", pos: [-2.4, 4.9, -5.4], ancla: competencia.at(0) },
    { t: "Field Operations", s: "Visitas completadas", tipo: "linea", pos: [2.4, 3.4, -7.0], ancla: tiendas.at(0) },
  ].map((p, k) => {
    const c = document.createElement("canvas"); c.width = PW; c.height = PH;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const panel = { ...p, ctx: c.getContext("2d"), tex, fase: k * 1.7 };
    dibujarPanel(panel, 0);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0, toneMapped: false });
    const plano = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 2.375), mat);
    plano.position.set(...p.pos);
    const geoLinea = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...p.pos), new THREE.Vector3(p.ancla.x, p.ancla.alto + 0.02, p.ancla.z)]);
    const linea = new THREE.Line(geoLinea, new THREE.LineDashedMaterial({ color: C.cian, dashSize: 0.12, gapSize: 0.08, transparent: true, opacity: 0 }));
    linea.computeLineDistances();
    escena.add(plano, linea);
    return Object.assign(panel, { plano, linea, mat, base: new THREE.Vector3(...p.pos) });
  });
  let turnoPanel = 0;

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
    paneles.forEach((p, i) => {
      const opi = reducido ? 1 : e3((tiempo - 1.9 - i * 0.18) / 0.8);
      p.mat.opacity = opi; p.linea.material.opacity = opi * 0.8;
      // flotación en tres ejes y un leve acercamiento: los paneles "respiran" en el espacio
      const w = reducido ? 0 : tiempo;
      p.plano.position.set(p.base.x + Math.sin(w * 0.7 + i) * 0.22, p.base.y + Math.sin(w * 1.1 + i * 1.3) * 0.28 + (1 - opi) * -0.8, p.base.z + Math.cos(w * 0.6 + i) * 0.22);
      p.plano.scale.setScalar(0.85 + 0.15 * opi);
      const pos = p.linea.geometry.attributes.position; pos.setXYZ(0, p.plano.position.x, p.plano.position.y - 1.1, p.plano.position.z); pos.needsUpdate = true; p.linea.computeLineDistances();
    });
    if (!reducido) { const p = paneles[turnoPanel]; dibujarPanel(p, tiempo); turnoPanel = (turnoPanel + 1) % paneles.length; }
    const u = reducido ? 0.32 : dib < 1 ? dib : ((tiempo - 3) / 14) % 1;
    pulso.position.copy(camino.getPointAt(Math.max(0, Math.min(1, u))));
    pulso.visible = dib > 0.02;
    marcas.children.forEach((a, i) => { a.position.y = a.userData.y0 + (reducido ? 0 : Math.sin(tiempo * 1.6 + i) * 0.05); a.visible = (reducido ? 1 : e3((tiempo - 0.9) / 0.6)) > 0.5; });
  }
  function orientar(az, el) {
    const a = Math.PI / 4 + az, e = 0.6 + el;
    camara.position.set(Math.sin(a) * Math.cos(e) * 40, Math.sin(e) * 40, Math.cos(a) * Math.cos(e) * 40);
    camara.lookAt(0, 1.0, 0); camara.updateMatrixWorld();
    const tt = reducido ? 0 : (performance.now() - t0) / 1000;
    paneles.forEach((p, i) => {
      p.plano.quaternion.copy(camara.quaternion);
      p.plano.rotateY(Math.sin(tt * 0.8 + i * 1.1) * 0.22);
      p.plano.rotateX(Math.cos(tt * 0.65 + i) * 0.1);
    });
  }
  let centro = new THREE.Vector2(), media = 1;
  function encuadre() {
    orientar(0, 0);
    const inv = camara.matrixWorldInverse, v = new THREE.Vector3();
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    const incl = (x, y, z) => { v.set(x, y, z).applyMatrix4(inv); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); };
    const h = LADO / 2;
    [[-h, -h], [h, -h], [h, h], [-h, h]].forEach(([x, z]) => { incl(x, -0.4, z); incl(x, 1.2, z); });
    paneles.forEach((p) => { const q = p.plano.position; const ox = 1.4, oz = 1.4; incl(q.x - ox, q.y + 1.75, q.z + oz); incl(q.x + ox, q.y + 1.75, q.z - oz); incl(q.x - ox, q.y - 1.3, q.z + oz); incl(q.x + ox, q.y - 1.3, q.z - oz); });
    const asp = ancho / alto;
    media = Math.max(((y1 - y0) / 2) * 1.12, ((x1 - x0) / 2 / asp) * 1.12);
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
    const giro = reducido ? 0 : Math.sin(t * 0.16) * 0.5 + Math.sin(t * 0.07) * 0.18;
    const desdeScroll = reducido ? 0 : Math.min(1, window.scrollY / Math.max(1, alto)) * 0.6;
    poner(t); orientar(azim + giro + desdeScroll, elev + Math.sin(t * 0.21) * (reducido ? 0 : 0.05)); renderer.render(escena, camara);
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
