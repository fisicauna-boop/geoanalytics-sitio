// Recorrido 4D de la portada: una nube de partículas que se transforma con el scroll
// (datos → estadística → góndola → territorio → decisión). Es una ilustración conceptual:
// las alturas, productos y rutas no son datos medidos. El contorno de Paraguay proviene de
// Natural Earth (dominio público) y las ciudades usan coordenadas aproximadas.
import * as THREE from "../vendor/three.module.min.js";

const raiz = document.querySelector("[data-recorrido]");
const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const tactil = window.matchMedia("(pointer: coarse)").matches;

const CIUDADES = [
  ["Asunción", -57.635, -25.282], ["Ciudad del Este", -54.611, -25.509], ["Encarnación", -55.866, -27.33],
  ["Concepción", -57.431, -23.406], ["Pedro Juan Caballero", -55.737, -22.547], ["Coronel Oviedo", -56.44, -25.445],
  ["Villarrica", -56.433, -25.781], ["Pilar", -58.304, -26.859], ["Filadelfia", -60.03, -22.35], ["Salto del Guairá", -54.306, -24.062],
];

function webglDisponible() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch { return false; }
}

if (raiz) {
  const capitulos = [...raiz.querySelectorAll("[data-capitulo]")];
  const puntos = [...raiz.querySelectorAll("[data-ir-capitulo]")];
  // Navegación por los puntos laterales (funciona aunque no haya WebGL)
  puntos.forEach((b) => b.addEventListener("click", () => {
    const c = capitulos[Number(b.dataset.irCapitulo)];
    c?.scrollIntoView({ behavior: reducido ? "auto" : "smooth", block: "center" });
  }));
  const marcar = (i) => {
    capitulos.forEach((c, k) => c.classList.toggle("es-activo", k === i));
    puntos.forEach((b, k) => b.setAttribute("aria-current", k === i ? "step" : "false"));
    raiz.dataset.etapa = String(i);
  };
  marcar(0);
  if (webglDisponible()) {
    // Carga diferida: la escena se arma recién cuando el recorrido se acerca a la pantalla
    const obs = new IntersectionObserver((e) => {
      if (e.some((x) => x.isIntersecting)) { obs.disconnect(); iniciar(capitulos, marcar).catch(() => {}); }
    }, { rootMargin: "600px 0px" });
    obs.observe(raiz);
  } else {
    // Sin WebGL: solo se marca el capítulo visible
    const obs = new IntersectionObserver((e) => e.forEach((x) => { if (x.isIntersecting) marcar(capitulos.indexOf(x.target)); }), { threshold: 0.6 });
    capitulos.forEach((c) => obs.observe(c));
  }
}

async function iniciar(capitulos, marcar) {
  const datos = await fetch(new URL("../datos/paraguay.json", import.meta.url)).then((r) => r.json());
  const escenaEl = raiz.querySelector(".recorrido__escena");
  const etiquetasEl = raiz.querySelector(".recorrido__etiquetas");
  const N = tactil ? 2600 : 5200;

  // ---------- Generador pseudoaleatorio con semilla (misma figura en cada visita) ----------
  let s = 20261112;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const gauss = () => { let u = 0; for (let i = 0; i < 4; i++) u += rnd(); return (u - 2) / 0.577; };

  // ---------- Paleta de marca ----------
  const PAL = {
    azul: new THREE.Color("#0B2D4A"), tec: new THREE.Color("#007BFF"), tur: new THREE.Color("#00C2C7"),
    verde: new THREE.Color("#39D98A"), claro: new THREE.Color("#9DB6CC"), gris: new THREE.Color("#C9DCEC"),
    naranja: new THREE.Color("#F2A93B"),
  };

  // Cada forma llena dos arreglos: posiciones (N×3) y colores (N×3)
  const forma = () => ({ p: new Float32Array(N * 3), c: new Float32Array(N * 3) });
  const poner = (f, i, x, y, z, col) => { f.p[i * 3] = x; f.p[i * 3 + 1] = y; f.p[i * 3 + 2] = z; f.c[i * 3] = col.r; f.c[i * 3 + 1] = col.g; f.c[i * 3 + 2] = col.b; };
  const tmp = new THREE.Color();

  // 1. Datos dispersos: varios cúmulos dentro de una esfera
  const F1 = forma();
  const cumulos = Array.from({ length: 7 }, () => [gauss() * 1.6, gauss() * 1.1, gauss() * 1.6]);
  for (let i = 0; i < N; i++) {
    const k = cumulos[i % cumulos.length], dispersa = rnd() < 0.35;
    const x = dispersa ? (rnd() - 0.5) * 7 : k[0] + gauss() * 0.45;
    const y = dispersa ? (rnd() - 0.5) * 4.5 : k[1] + gauss() * 0.45;
    const z = dispersa ? (rnd() - 0.5) * 7 : k[2] + gauss() * 0.45;
    poner(F1, i, x, y, z, tmp.copy(PAL.claro).lerp(PAL.tec, rnd() * 0.7));
  }

  // 2. Estadística: gráfico de barras 3D (alturas ilustrativas)
  const F2 = forma();
  const BX = 7, BZ = 4, ANCHO = 0.46, PASO = 0.78;
  const alturas = [];
  for (let a = 0; a < BX; a++) for (let b = 0; b < BZ; b++) alturas.push(0.5 + 2.6 * (0.5 + 0.5 * Math.sin(a * 0.9 + b * 0.6)) * (0.55 + 0.45 * (a / (BX - 1))));
  for (let i = 0; i < N; i++) {
    const k = i % alturas.length, a = Math.floor(k / BZ), b = k % BZ, h = alturas[k];
    const cx = (a - (BX - 1) / 2) * PASO, cz = (b - (BZ - 1) / 2) * PASO;
    // punto sobre la superficie de la barra (tapa o caras laterales)
    let x, y, z;
    const cara = rnd();
    if (cara < 0.2) { x = cx + (rnd() - 0.5) * ANCHO; z = cz + (rnd() - 0.5) * ANCHO; y = h; }
    else {
      y = rnd() * h; const t = (rnd() - 0.5) * ANCHO, lado = Math.floor(rnd() * 4);
      x = cx + (lado === 0 ? ANCHO / 2 : lado === 1 ? -ANCHO / 2 : t);
      z = cz + (lado === 2 ? ANCHO / 2 : lado === 3 ? -ANCHO / 2 : t);
    }
    poner(F2, i, x, y - 1.3, z, tmp.copy(PAL.tec).lerp(PAL.tur, y / 3.2).lerp(PAL.verde, Math.max(0, (y - 2.4) / 1.5)));
  }

  // 3. Mercado: una góndola con productos y algunos huecos (quiebres de stock)
  const F3 = forma();
  const productos = [], NIV = 4, ANCHO_G = 6.4, ALTO_N = 0.95;
  const coloresProd = [PAL.tec, PAL.tur, PAL.verde, PAL.azul, PAL.naranja, PAL.claro];
  for (let n = 0; n < NIV; n++) {
    let x = -ANCHO_G / 2 + 0.1;
    while (x < ANCHO_G / 2 - 0.4) {
      const w = 0.3 + rnd() * 0.22, h = 0.45 + rnd() * 0.38;
      if (rnd() > 0.1) productos.push({ x: x + w / 2, y: n * ALTO_N, w, h, d: 0.55, col: coloresProd[Math.floor(rnd() * coloresProd.length)] });
      x += w + 0.05;
    }
  }
  for (let i = 0; i < N; i++) {
    if (i % 5 === 0) {
      // estantes y laterales del mueble
      const n = Math.floor(rnd() * (NIV + 1));
      if (rnd() < 0.8) poner(F3, i, (rnd() - 0.5) * ANCHO_G, n * ALTO_N - 1.7, (rnd() - 0.5) * 0.9, PAL.gris);
      else poner(F3, i, (rnd() < 0.5 ? -1 : 1) * ANCHO_G / 2, rnd() * NIV * ALTO_N - 1.7, (rnd() - 0.5) * 0.9, PAL.claro);
    } else {
      const pr = productos[Math.floor(rnd() * productos.length)];
      const frente = rnd() < 0.7;
      const x = pr.x + (rnd() - 0.5) * pr.w, y = pr.y + rnd() * pr.h;
      const z = frente ? pr.d / 2 : (rnd() - 0.5) * pr.d;
      poner(F3, i, x, y - 1.7, z, tmp.copy(pr.col).lerp(PAL.gris, frente ? 0 : 0.35));
    }
  }

  // 4 y 5. Territorio: Paraguay con su contorno; en "decisión" se elevan las zonas alrededor de las ciudades
  const LON0 = -58.2, LAT0 = -23.3, K = 0.78, COS = Math.cos(LAT0 * Math.PI / 180);
  const px = (lon) => (lon - LON0) * COS * K, pz = (lat) => -(lat - LAT0) * K;
  const contorno = datos.contorno.map(([lon, lat]) => [px(lon), pz(lat)]);
  const dentro = (x, z) => {
    let ok = false;
    for (let i = 0, j = contorno.length - 1; i < contorno.length; j = i++) {
      const [xi, zi] = contorno[i], [xj, zj] = contorno[j];
      if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) ok = !ok;
    }
    return ok;
  };
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  contorno.forEach(([x, z]) => { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); });
  const largos = [0];
  for (let i = 1; i <= contorno.length; i++) { const a = contorno[i - 1], b = contorno[i % contorno.length]; largos.push(largos[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
  const perimetro = largos.at(-1);
  const enContorno = (u) => {
    const d = u * perimetro; let i = 1; while (largos[i] < d) i++;
    const a = contorno[i - 1], b = contorno[i % contorno.length], t = (d - largos[i - 1]) / (largos[i] - largos[i - 1] || 1);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  };
  const ciudades = CIUDADES.map(([nombre, lon, lat]) => ({ nombre, x: px(lon), z: pz(lat) }));
  const F4 = forma(), F5 = forma();
  for (let i = 0; i < N; i++) {
    let x, z, borde = i % 4 === 0;
    if (borde) [x, z] = enContorno(rnd());
    else do { x = minX + rnd() * (maxX - minX); z = minZ + rnd() * (maxZ - minZ); } while (!dentro(x, z));
    const chaco = x < px(-58.5) && z < pz(-24.6); // aproximación: oeste del río Paraguay
    const base = borde ? PAL.tur : chaco ? tmp.copy(PAL.claro).lerp(PAL.gris, 0.4) : tmp.copy(PAL.tec).lerp(PAL.claro, 0.35);
    poner(F4, i, x, borde ? 0.02 : (rnd() - 0.5) * 0.04, z, base);
    // potencial ilustrativo: suma de campanas alrededor de cada ciudad
    let h = 0;
    ciudades.forEach((c, k) => { const d = Math.hypot(x - c.x, z - c.z); h += (k === 0 ? 2.4 : 1.2) * Math.exp(-(d * d) / (k === 0 ? 0.32 : 0.16)); });
    const col = borde ? PAL.tur : tmp.copy(base).lerp(PAL.tur, Math.min(1, h * 0.9)).lerp(PAL.verde, Math.max(0, Math.min(1, h - 0.9)));
    poner(F5, i, x, borde ? 0.02 : h * (0.65 + rnd() * 0.35), z, col);
  }
  const FORMAS = [F1, F2, F3, F4, F5];

  // ---------- Renderizador y escena ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, tactil ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.className = "recorrido__lienzo";
  canvas.setAttribute("aria-hidden", "true");
  escenaEl.prepend(canvas);

  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  const grupo = new THREE.Group();
  escena.add(grupo);

  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), fase = new Float32Array(N);
  for (let i = 0; i < N; i++) fase[i] = rnd() * Math.PI * 2;
  pos.set(F1.p); col.set(F1.c);
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.setAttribute("fase", new THREE.BufferAttribute(fase, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTiempo: { value: 0 }, uTam: { value: (tactil ? 44 : 46) * renderer.getPixelRatio() }, uAgita: { value: 1 } },
    vertexShader: `
      attribute vec3 color; attribute float fase; varying vec3 vColor; varying float vBrillo;
      uniform float uTiempo, uTam, uAgita;
      void main() {
        vec3 p = position;
        p.y += sin(uTiempo * 1.2 + fase) * 0.025 * uAgita;
        p.x += cos(uTiempo * 0.9 + fase * 1.3) * 0.02 * uAgita;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uTam / -mv.z;
        vColor = color; vBrillo = 0.75 + 0.25 * sin(uTiempo * 2.0 + fase);
      }`,
    fragmentShader: `
      varying vec3 vColor; varying float vBrillo;
      void main() {
        vec2 d = gl_PointCoord - 0.5; float r = length(d);
        if (r > 0.5) discard;
        float a = smoothstep(0.5, 0.18, r);
        gl_FragColor = vec4(vColor * (0.82 + 0.3 * vBrillo), a);
      }`,
  });
  const nube = new THREE.Points(geo, mat);
  grupo.add(nube);

  // Rutas de la etapa final: arcos desde Asunción hacia cada ciudad
  const rutas = new THREE.Group();
  const asu = ciudades[0];
  const curvas = ciudades.slice(1).map((c) => {
    const medio = new THREE.Vector3((asu.x + c.x) / 2, 1.1 + Math.hypot(c.x - asu.x, c.z - asu.z) * 0.35, (asu.z + c.z) / 2);
    return new THREE.QuadraticBezierCurve3(new THREE.Vector3(asu.x, 0.4, asu.z), medio, new THREE.Vector3(c.x, 0.2, c.z));
  });
  const lineas = curvas.map((cv) => {
    const g = new THREE.BufferGeometry().setFromPoints(cv.getPoints(80));
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: PAL.tec, transparent: true, opacity: 0.9 }));
    g.setDrawRange(0, 0); rutas.add(l); return l;
  });
  const pulsos = curvas.map(() => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshBasicMaterial({ color: PAL.verde, transparent: true }));
    rutas.add(m); return m;
  });
  rutas.visible = false;
  grupo.add(rutas);

  // Etiquetas de ciudades (HTML encima del lienzo)
  const etiquetas = ciudades.map((c, k) => {
    const e = document.createElement("span");
    e.className = "recorrido__ciudad" + (k === 0 ? " recorrido__ciudad--origen" : "");
    e.textContent = c.nombre;
    etiquetasEl.appendChild(e);
    return e;
  });

  // ---------- Cámaras por etapa ----------
  const CAM = [
    { p: [0, 1.2, 11.5], m: [0, 0, 0] },
    { p: [6.4, 4.4, 9.4], m: [0, 0.1, 0] },
    { p: [2.2, 0.9, 11.2], m: [0, 0.1, 0] },
    { p: [0.4, 10.4, 6.6], m: [0, 0, 0.4] },
    { p: [-2.4, 8.2, 8.6], m: [0, 0.5, 0.3] },
  ];
  let lejos = 1; // en pantallas verticales la cámara se aleja
  const vA = new THREE.Vector3(), vB = new THREE.Vector3(), mira = new THREE.Vector3();
  const suave = (t) => t * t * (3 - 2 * t);
  const meseta = (t) => suave(Math.min(1, Math.max(0, (t - 0.18) / 0.64))); // la forma descansa antes y después de cambiar

  function ajustar() {
    const w = escenaEl.clientWidth, h = escenaEl.clientHeight;
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    // en pantallas angostas la cámara se aleja para que entre el mapa
    camara.fov = 38;
    lejos = camara.aspect < 1 ? 1 + (1 - camara.aspect) * 1.5 : 1;
    // en escritorio la figura se corre a la derecha y en el celular hacia arriba, para no quedar detrás del texto
    if (w > 760) camara.setViewOffset(w, h, -w * 0.13, 0, w, h);
    else camara.setViewOffset(w, h, 0, h * 0.2, w, h);
    camara.updateProjectionMatrix();
  }
  new ResizeObserver(ajustar).observe(escenaEl);
  ajustar();

  // ---------- Interacción: inclinación con el puntero y giro con arrastre en la etapa final ----------
  let px0 = 0, py0 = 0, giro = 0, giroObj = 0, arrastrando = null;
  escenaEl.addEventListener("pointermove", (e) => {
    const r = escenaEl.getBoundingClientRect();
    px0 = ((e.clientX - r.left) / r.width - 0.5) * 2; py0 = ((e.clientY - r.top) / r.height - 0.5) * 2;
    if (arrastrando !== null) { giroObj = arrastrando.g + (e.clientX - arrastrando.x) * 0.008; }
  });
  escenaEl.addEventListener("pointerdown", (e) => { if (etapa >= 3.5) { arrastrando = { x: e.clientX, g: giroObj }; escenaEl.setPointerCapture(e.pointerId); escenaEl.classList.add("es-arrastre"); } });
  const soltar = () => { arrastrando = null; escenaEl.classList.remove("es-arrastre"); };
  escenaEl.addEventListener("pointerup", soltar);
  escenaEl.addEventListener("pointercancel", soltar);
  escenaEl.addEventListener("pointerleave", () => { px0 = 0; py0 = 0; });

  // ---------- Progreso del scroll ----------
  let etapa = 0, etapaSuave = 0, ultimaMarca = -1, visible = true;
  function leerScroll() {
    const r = raiz.getBoundingClientRect(), total = r.height - window.innerHeight;
    const p = Math.min(1, Math.max(0, -r.top / (total || 1)));
    etapa = p * (FORMAS.length - 1);
    const m = Math.min(FORMAS.length - 1, Math.round(etapa));
    if (m !== ultimaMarca) { ultimaMarca = m; marcar(m); }
  }
  window.addEventListener("scroll", leerScroll, { passive: true });
  new IntersectionObserver((e) => { visible = e[0].isIntersecting; if (visible) pedir(); }, { rootMargin: "100px" }).observe(raiz);
  leerScroll();
  if (reducido) etapaSuave = etapa;

  const proy = new THREE.Vector3();
  let animando = false, t0 = performance.now();
  function cuadro(ahora) {
    animando = false;
    if (!visible) return;
    const tiempo = (ahora - t0) / 1000;
    etapaSuave += (etapa - etapaSuave) * (reducido ? 1 : 0.085);
    const i = Math.min(FORMAS.length - 2, Math.floor(etapaSuave)), t = meseta(etapaSuave - i);
    const A = FORMAS[i], B = FORMAS[i + 1];
    for (let k = 0; k < N * 3; k++) { pos[k] = A.p[k] + (B.p[k] - A.p[k]) * t; col[k] = A.c[k] + (B.c[k] - A.c[k]) * t; }
    geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
    mat.uniforms.uTiempo.value = reducido ? 0 : tiempo;
    mat.uniforms.uAgita.value = 1 - 0.7 * Math.min(1, Math.max(0, etapaSuave - 2.5));

    // cámara interpolada entre etapas + leve órbita
    const ca = CAM[i], cb = CAM[i + 1];
    vA.fromArray(ca.p).lerp(vB.fromArray(cb.p), t);
    mira.fromArray(ca.m).lerp(vB.fromArray(cb.m), t);
    const orbita = reducido ? 0 : Math.sin(tiempo * 0.18) * 0.35;
    vA.sub(mira).multiplyScalar(lejos).add(mira);
    camara.position.set(vA.x + orbita + px0 * 0.5, vA.y - py0 * 0.35, vA.z);
    camara.lookAt(mira);
    if (!reducido && arrastrando === null && etapaSuave < 3.5) giroObj += (0 - giroObj) * 0.05;
    giro += (giroObj - giro) * 0.12;
    grupo.rotation.y = giro + (reducido || etapaSuave >= 3.5 ? 0 : Math.sin(tiempo * 0.25) * 0.25);

    // rutas: se dibujan durante la última transición
    const tr = Math.max(0, Math.min(1, (etapaSuave - 3.35) / 0.6));
    rutas.visible = tr > 0;
    lineas.forEach((l, k) => l.geometry.setDrawRange(0, Math.floor(81 * Math.min(1, tr * 1.4 - k * 0.04))));
    pulsos.forEach((m, k) => {
      const u = ((tiempo * 0.22 + k * 0.13) % 1);
      m.position.copy(curvas[k].getPoint(u)); m.material.opacity = tr; m.visible = tr > 0.6 && !reducido;
    });

    // etiquetas visibles en las etapas de territorio
    const vis = Math.max(0, Math.min(1, (etapaSuave - 2.6) / 0.6));
    etiquetasEl.style.opacity = String(vis);
    if (vis > 0) {
      const w = escenaEl.clientWidth, h = escenaEl.clientHeight;
      grupo.updateMatrixWorld();
      ciudades.forEach((c, k) => {
        proy.set(c.x, (k === 0 ? 0.45 : 0.25) * Math.min(1, tr + 0.2), c.z).applyMatrix4(grupo.matrixWorld).project(camara);
        etiquetas[k].style.transform = `translate(${((proy.x + 1) / 2 * w).toFixed(1)}px, ${((1 - proy.y) / 2 * h).toFixed(1)}px)`;
      });
    }
    renderer.render(escena, camara);
    escenaEl.classList.add("recorrido__escena--activa");
    if (!reducido || Math.abs(etapa - etapaSuave) > 0.001) pedir();
  }
  function pedir() { if (!animando) { animando = true; requestAnimationFrame(cuadro); } }
  window.addEventListener("scroll", pedir, { passive: true });
  pedir();
  window.__recorridoListo = true;
}
