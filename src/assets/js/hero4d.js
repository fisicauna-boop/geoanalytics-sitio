// Portada 4D: una ciudad comercial sobre una plataforma de datos, con flujos de luz, tránsito animado
// y paneles holográficos curvos cuyos gráficos se actualizan solos. Es una ilustración conceptual:
// ningún gráfico ni valor representa datos reales de clientes.
import * as THREE from "../vendor/three.module.min.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const contenedor = document.querySelector("[data-hero4d]");
const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const tactil = window.matchMedia("(pointer: coarse)").matches;

function webglDisponible() {
  try { const c = document.createElement("canvas"); return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl"))); }
  catch { return false; }
}
if (contenedor && webglDisponible()) { try { iniciar(); } catch (e) { /* queda la imagen fija */ } }

function iniciar() {
  // ---------- Semilla: la misma ciudad en cada visita ----------
  let s = 7331;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const entre = (a, b) => a + rnd() * (b - a);

  const C = { fondo: 0x061829, azul: 0x0b2d4a, tec: 0x007bff, tur: 0x00c2c7, verde: 0x39d98a, naranja: 0xf2a93b, cian: 0x5fe3ff };

  // ---------- Renderizador ----------
  const renderer = new THREE.WebGLRenderer({ antialias: !tactil, powerPreference: "high-performance" });
  const dpr = Math.min(window.devicePixelRatio || 1, tactil ? 1.25 : 1.75);
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const lienzo = renderer.domElement;
  lienzo.className = "hero4d__lienzo";
  lienzo.setAttribute("aria-hidden", "true");
  contenedor.prepend(lienzo);

  const escena = new THREE.Scene();
  escena.background = new THREE.Color(C.fondo);
  escena.fog = new THREE.FogExp2(C.fondo, 0.028);
  const camara = new THREE.PerspectiveCamera(34, 1, 0.1, 200);

  escena.add(new THREE.HemisphereLight(0x9fd8ff, 0x0b1a2a, 0.9));
  const luna = new THREE.DirectionalLight(0xcfe9ff, 1.5);
  luna.position.set(-8, 14, 6);
  escena.add(luna);
  const brilloCentro = new THREE.PointLight(C.tur, 18, 14, 1.6);
  brilloCentro.position.set(0, 3, 0);
  escena.add(brilloCentro);

  const mundo = new THREE.Group();
  escena.add(mundo);

  // ---------- Texturas generadas en el navegador ----------
  const lienzoTex = (w, h, dibujar) => {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    dibujar(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return t;
  };
  // ventanas iluminadas (tres variantes de color)
  const ventanas = [["#ffd9a0", "#7fd4ff"], ["#9be7ff", "#ffffff"], ["#ffc46b", "#5fe3ff"]].map(([a, b]) =>
    lienzoTex(64, 128, (g, w, h) => {
      g.fillStyle = "#000"; g.fillRect(0, 0, w, h);
      for (let y = 4; y < h; y += 8) for (let x = 4; x < w; x += 8) {
        const r = rnd(); if (r < 0.42) continue;
        g.fillStyle = r > 0.9 ? b : a; g.globalAlpha = 0.35 + rnd() * 0.65; g.fillRect(x, y, 4, 4);
      }
    }));
  ventanas.forEach((t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; });

  // ---------- Plataforma de dos niveles ----------
  const TAM = 12;
  const losa = new THREE.Mesh(new THREE.BoxGeometry(TAM, 0.34, TAM), new THREE.MeshStandardMaterial({ color: 0x0d2440, metalness: 0.55, roughness: 0.32 }));
  losa.position.y = -0.17; mundo.add(losa);
  const borde = (geo, color, op) => new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color, transparent: true, opacity: op }));
  const b1 = borde(new THREE.BoxGeometry(TAM, 0.34, TAM), C.cian, 0.9); b1.position.y = -0.17; mundo.add(b1);
  // franja luminosa en el canto superior
  // canto luminoso: cuatro varillas finas en el borde superior
  const canto = (lado, y, color, grosor) => {
    const g = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color });
    [[0, lado / 2, lado, grosor], [0, -lado / 2, lado, grosor], [lado / 2, 0, grosor, lado], [-lado / 2, 0, grosor, lado]].forEach(([x, z, w, d]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, grosor, d), mat); m.position.set(x, y, z); g.add(m);
    });
    return g;
  };
  mundo.add(canto(TAM + 0.02, 0.0, C.cian, 0.05));

  // nivel inferior de vidrio: la "capa de datos"
  const vidrio = new THREE.Mesh(new THREE.BoxGeometry(TAM * 0.9, 1.7, TAM * 0.9),
    new THREE.MeshStandardMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.08, metalness: 0.2, roughness: 0.05, depthWrite: false }));
  vidrio.position.y = -1.25; mundo.add(vidrio);
  const b2 = borde(new THREE.BoxGeometry(TAM * 0.9, 1.7, TAM * 0.9), C.tur, 0.55); b2.position.y = -1.25; mundo.add(b2);
  mundo.add(canto(TAM * 0.9 + 0.02, -2.1, C.tec, 0.04));
  // columnas de datos dentro del vidrio
  const nCol = 140;
  const columnas = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 1, 0.12), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }), nCol);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v3 = new THREE.Vector3(), esc = new THREE.Vector3(), colTmp = new THREE.Color();
  const datosCol = [];
  for (let i = 0; i < nCol; i++) {
    const x = entre(-4.9, 4.9), z = entre(-4.9, 4.9), h = 0.15 + rnd() * 1.25;
    datosCol.push({ x, z, h, f: rnd() * 6.28 });
    columnas.setColorAt(i, colTmp.set(rnd() < 0.55 ? C.tec : rnd() < 0.6 ? C.tur : C.verde));
  }
  mundo.add(columnas);
  // mapa de calor bajo la ciudad
  const calorCanvas = document.createElement("canvas"); calorCanvas.width = calorCanvas.height = 256;
  const calorTex = new THREE.CanvasTexture(calorCanvas); calorTex.colorSpace = THREE.SRGBColorSpace;
  const focos = Array.from({ length: 6 }, () => ({ x: entre(0.2, 0.8), y: entre(0.2, 0.8), r: entre(0.12, 0.26), f: rnd() * 6.28 }));
  function dibujarCalor(t) {
    const g = calorCanvas.getContext("2d"), W = 256;
    g.clearRect(0, 0, W, W); g.globalCompositeOperation = "lighter";
    focos.forEach((p, k) => {
      const x = (p.x + Math.sin(t * 0.3 + p.f) * 0.05) * W, y = (p.y + Math.cos(t * 0.25 + p.f) * 0.05) * W, r = p.r * W * (0.9 + 0.1 * Math.sin(t + k));
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, "rgba(255,90,60,0.9)"); gr.addColorStop(0.35, "rgba(255,200,60,0.55)"); gr.addColorStop(0.7, "rgba(0,194,199,0.35)"); gr.addColorStop(1, "rgba(0,60,160,0)");
      g.fillStyle = gr; g.fillRect(0, 0, W, W);
    });
    g.globalCompositeOperation = "source-over";
    calorTex.needsUpdate = true;
  }
  dibujarCalor(0);
  const calor = new THREE.Mesh(new THREE.PlaneGeometry(TAM * 0.86, TAM * 0.86), new THREE.MeshBasicMaterial({ map: calorTex, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
  calor.rotation.x = -Math.PI / 2; calor.position.y = -2.05; mundo.add(calor);
  // piso de grilla que se pierde en la niebla
  const grilla = new THREE.GridHelper(80, 80, 0x1a5c8a, 0x0f3556);
  grilla.position.y = -2.6; grilla.material.transparent = true; grilla.material.opacity = 0.45; escena.add(grilla);

  // ---------- Ciudad ----------
  const BLOQUES = 6, PASO = 1.75, CALLE = 0.42, LADO = PASO - CALLE, ORIGEN = -((BLOQUES - 1) * PASO) / 2;
  const matVidrio = (tex, rep) => {
    const t = tex.clone(); t.needsUpdate = true; t.repeat.set(1, rep);
    return new THREE.MeshStandardMaterial({ color: 0x2d5a86, metalness: 0.7, roughness: 0.2, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 1.35 });
  };
  const edificios = new THREE.Group(); mundo.add(edificios);
  const bordes = [];
  const arboles = [];
  for (let a = 0; a < BLOQUES; a++) for (let b = 0; b < BLOQUES; b++) {
    const cx = ORIGEN + a * PASO, cz = ORIGEN + b * PASO;
    const dc = Math.hypot(a - 2.5, b - 2.5) / 3.6; // 0 en el centro, 1 en el borde
    // vereda del bloque
    const vereda = new THREE.Mesh(new THREE.BoxGeometry(LADO, 0.06, LADO), new THREE.MeshStandardMaterial({ color: 0x163252, metalness: 0.3, roughness: 0.6 }));
    vereda.position.set(cx, 0.03, cz); edificios.add(vereda);
    if (a === 2 && b === 3) { // plaza con anillo de luz
      const anillo = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.025, 8, 48), new THREE.MeshBasicMaterial({ color: C.verde }));
      anillo.rotation.x = Math.PI / 2; anillo.position.set(cx, 0.08, cz); edificios.add(anillo);
      const cesped = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.04, 32), new THREE.MeshStandardMaterial({ color: 0x1f7a4d, roughness: 0.9 }));
      cesped.position.set(cx, 0.07, cz); edificios.add(cesped);
      for (let k = 0; k < 14; k++) { const ang = (k / 14) * Math.PI * 2; arboles.push([cx + Math.cos(ang) * 0.62, cz + Math.sin(ang) * 0.62, 0.9 + rnd() * 0.4]); }
      continue;
    }
    if (a === 3 && b === 2) { // torre principal (aguja)
      const alto = 7.2;
      const torre = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.62, alto, 4, 1), matVidrio(ventanas[1], 9));
      torre.rotation.y = Math.PI / 4; torre.position.set(cx, alto / 2 + 0.06, cz); edificios.add(torre);
      const bt = borde(new THREE.CylinderGeometry(0.16, 0.62, alto, 4, 1), C.cian, 0.95); bt.rotation.y = Math.PI / 4; bt.position.copy(torre.position); edificios.add(bt);
      const antena = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.4, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      antena.position.set(cx, alto + 0.75, cz); edificios.add(antena);
      const faro = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff5a5a }));
      faro.position.set(cx, alto + 1.45, cz); faro.userData.faro = true; edificios.add(faro);
      continue;
    }
    const cuantos = dc < 0.5 ? 1 + Math.floor(rnd() * 2) : 2 + Math.floor(rnd() * 3);
    const celdas = cuantos === 1 ? [[0, 0, 1]] : cuantos === 2 ? [[-0.25, 0, 0.5], [0.25, 0, 0.5]] : [[-0.25, -0.25, 0.5], [0.25, -0.25, 0.5], [-0.25, 0.25, 0.5], [0.25, 0.25, 0.5]].slice(0, cuantos);
    celdas.forEach(([ox, oz, f]) => {
      const w = LADO * f * entre(0.72, 0.9), d = (cuantos === 2 ? LADO * entre(0.6, 0.88) : LADO * f * entre(0.72, 0.9));
      const alto = Math.max(0.35, (1 - dc) * entre(2.2, 5.2) * (cuantos > 2 ? 0.55 : 1) + entre(0, 0.6));
      const x = cx + ox * LADO, z = cz + oz * LADO;
      const tipo = rnd();
      let geo;
      if (tipo < 0.16 && alto > 1.6) geo = new THREE.CylinderGeometry(w * 0.48, w * 0.5, alto, 20);
      else if (tipo < 0.26 && alto > 2) geo = new THREE.CylinderGeometry(w * 0.3, w * 0.56, alto, 4, 1);
      else geo = new THREE.BoxGeometry(w, alto, d);
      const bajo = alto < 0.9;
      const mat = bajo ? new THREE.MeshStandardMaterial({ color: 0x2a4a6b, metalness: 0.2, roughness: 0.7, emissive: 0xffffff, emissiveMap: ventanas[0], emissiveIntensity: 0.5 })
        : matVidrio(ventanas[Math.floor(rnd() * 3)], Math.max(1, alto * 1.4));
      const e = new THREE.Mesh(geo, mat);
      if (geo.type === "CylinderGeometry" && geo.parameters.radialSegments === 4) e.rotation.y = Math.PI / 4;
      e.position.set(x, alto / 2 + 0.06, z); edificios.add(e);
      if (alto > 2.6 && rnd() < 0.55) { const be = borde(geo, rnd() < 0.5 ? C.cian : C.tur, 0.55); be.rotation.copy(e.rotation); be.position.copy(e.position); edificios.add(be); bordes.push(be); }
      if (bajo) { const techo = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 0.03, d * 0.8), new THREE.MeshStandardMaterial({ color: 0x2f8f5b, roughness: 0.9 })); techo.position.set(x, alto + 0.075, z); edificios.add(techo); }
      if (cuantos > 2 && rnd() < 0.5) arboles.push([x + entre(-0.3, 0.3), z + entre(-0.3, 0.3), 0.7 + rnd() * 0.4]);
    });
  }
  // árboles
  const arbol = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.11, 0), new THREE.MeshStandardMaterial({ color: 0x2fae6a, roughness: 0.8, flatShading: true }), arboles.length);
  arboles.forEach(([x, z, k], i) => { m4.compose(v3.set(x, 0.18, z), q.identity(), esc.set(k, k * 1.3, k)); arbol.setMatrixAt(i, m4); });
  mundo.add(arbol);

  // calles: líneas guía y tránsito de luces
  const lineasCalle = [];
  for (let k = 0; k <= BLOQUES; k++) {
    const p = ORIGEN - PASO / 2 + k * PASO;
    lineasCalle.push(new THREE.Vector3(p, 0.012, -TAM / 2 + 0.3), new THREE.Vector3(p, 0.012, TAM / 2 - 0.3));
    lineasCalle.push(new THREE.Vector3(-TAM / 2 + 0.3, 0.012, p), new THREE.Vector3(TAM / 2 - 0.3, 0.012, p));
  }
  mundo.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(lineasCalle), new THREE.LineDashedMaterial({ color: 0x3d8fc4, dashSize: 0.12, gapSize: 0.12, transparent: true, opacity: 0.7 })).computeLineDistances());
  const nAutos = tactil ? 70 : 130;
  const autos = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.045, 0.07), new THREE.MeshBasicMaterial({ color: 0xffffff }), nAutos);
  const trafico = Array.from({ length: nAutos }, () => {
    const k = Math.floor(rnd() * (BLOQUES + 1)), horizontal = rnd() < 0.5, sentido = rnd() < 0.5 ? 1 : -1;
    const carril = ORIGEN - PASO / 2 + k * PASO + sentido * 0.08;
    return { horizontal, carril, sentido, u: rnd(), vel: entre(0.04, 0.09) };
  });
  trafico.forEach((t, i) => autos.setColorAt(i, colTmp.set(t.sentido > 0 ? 0xfff2d6 : 0xff8a3d)));
  mundo.add(autos);

  // ---------- Flujos de datos: tubos de luz con pulsos que viajan ----------
  const matFlujo = (color, vel, fase) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uC: { value: new THREE.Color(color) }, uV: { value: vel }, uF: { value: fase } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: `varying vec2 vUv; uniform float uT, uV, uF; uniform vec3 uC;
      void main(){
        float base = 0.18;
        float p1 = pow(fract(vUv.x * 3.0 - uT * uV + uF), 10.0);
        float p2 = pow(fract(vUv.x * 7.0 - uT * uV * 1.6 + uF * 2.0), 24.0);
        float a = (base * 0.7 + p1 * 1.3 + p2 * 0.7) * smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
        gl_FragColor = vec4(uC * (0.6 + p1 * 1.8), a);
      }`,
  });
  const flujos = [];
  const coloresFlujo = [C.cian, 0xffffff, C.tec, C.naranja, C.tur, 0xffd28a, C.cian, C.verde, 0xffffff, C.tec];
  for (let k = 0; k < (tactil ? 6 : 10); k++) {
    const ang = entre(0, Math.PI), r = 22, y0 = entre(0.6, 4.5), y1 = entre(0.6, 4.5);
    const a = new THREE.Vector3(Math.cos(ang) * r, y0, Math.sin(ang) * r), b = a.clone().multiplyScalar(-1); b.y = y1;
    const medio = new THREE.Vector3(entre(-2.5, 2.5), entre(1, 4), entre(-2.5, 2.5));
    const curva = new THREE.CatmullRomCurve3([a, a.clone().lerp(medio, 0.6).setY(y0 * 0.7 + 0.8), medio, b.clone().lerp(medio, 0.6).setY(y1 * 0.7 + 0.8), b]);
    const m = new THREE.Mesh(new THREE.TubeGeometry(curva, 160, k % 3 === 0 ? 0.035 : 0.018, 6, false), matFlujo(coloresFlujo[k], entre(0.12, 0.3), rnd()));
    escena.add(m); flujos.push(m);
  }
  // haces verticales desde algunas azoteas
  const haces = [];
  edificios.children.filter((e) => e.isMesh && e.geometry.parameters && e.geometry.parameters.height > 3.4).slice(0, 5).forEach((e, k) => {
    const h = 6;
    const haz = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.05, h, 8, 1, true), matFlujo(k % 2 ? C.tur : C.cian, 0.35, rnd()));
    haz.geometry.attributes.uv.array.forEach((_, i, arr) => { if (i % 2 === 0) { const vy = arr[i + 1]; arr[i] = vy; } });
    haz.position.set(e.position.x, e.geometry.parameters.height + h / 2 + 0.06, e.position.z);
    mundo.add(haz); haces.push(haz);
  });

  // ---------- Paneles holográficos curvos ----------
  const TITULOS = [
    ["Ventas por categoría", "barras"], ["Tendencia semanal", "linea"], ["Share of shelf", "dona"],
    ["Potencial por zona", "calor"], ["Cobertura de rutas", "area"], ["Satisfacción por segmento", "barrasH"],
  ];
  const W = 512, H = 320;
  const paneles = TITULOS.map(([titulo, tipo], k) => {
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const serie = Array.from({ length: 28 }, (_, i) => 0.35 + 0.3 * Math.sin(i * 0.5 + k) + 0.2 * rnd());
    return { titulo, tipo, c, tex, serie, fase: rnd() * 6 };
  });
  const paleta = ["#00C2C7", "#007BFF", "#39D98A", "#F2A93B", "#5FE3FF", "#9DB6CC"];
  function dibujarPanel(p, t) {
    const g = p.c.getContext("2d");
    g.clearRect(0, 0, W, H);
    // vidrio
    const fondo = g.createLinearGradient(0, 0, 0, H);
    fondo.addColorStop(0, "rgba(40,120,190,0.30)"); fondo.addColorStop(1, "rgba(10,40,80,0.18)");
    g.fillStyle = fondo; g.fillRect(4, 4, W - 8, H - 8);
    g.strokeStyle = "rgba(120,220,255,0.95)"; g.lineWidth = 3; g.strokeRect(4, 4, W - 8, H - 8);
    g.strokeStyle = "rgba(120,220,255,0.25)"; g.lineWidth = 1;
    for (let y = 70; y < H - 30; y += 45) { g.beginPath(); g.moveTo(40, y); g.lineTo(W - 24, y); g.stroke(); }
    g.fillStyle = "#E8F7FF"; g.font = "600 24px Inter, Segoe UI, Arial, sans-serif"; g.fillText(p.titulo, 24, 42);
    g.fillStyle = "rgba(200,235,255,0.55)"; g.font = "500 15px Inter, Segoe UI, Arial, sans-serif"; g.fillText("datos ilustrativos", W - 160, 42);
    const x0 = 44, x1 = W - 28, y0 = H - 34, y1 = 76, ancho = x1 - x0, alto = y0 - y1;
    const val = (i) => Math.max(0.05, Math.min(1, p.serie[i % p.serie.length] + 0.12 * Math.sin(t * 1.4 + i * 0.7 + p.fase)));
    if (p.tipo === "barras") {
      const n = 12;
      for (let i = 0; i < n; i++) {
        const h = val(i) * alto, x = x0 + (i * ancho) / n + 4, w = ancho / n - 10;
        const gr = g.createLinearGradient(0, y0 - h, 0, y0); gr.addColorStop(0, "#5FE3FF"); gr.addColorStop(1, "#007BFF");
        g.fillStyle = gr; g.fillRect(x, y0 - h, w, h);
      }
      g.strokeStyle = "#F2A93B"; g.lineWidth = 3; g.beginPath();
      for (let i = 0; i < 12; i++) { const x = x0 + ((i + 0.5) * ancho) / 12, y = y0 - val(i + 3) * alto * 0.9; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    } else if (p.tipo === "linea" || p.tipo === "area") {
      const n = 26, desl = (t * 2) % 1;
      const pts = Array.from({ length: n }, (_, i) => [x0 + ((i - desl) * ancho) / (n - 2), y0 - val(i + Math.floor(t * 2)) * alto]);
      if (p.tipo === "area") {
        const gr = g.createLinearGradient(0, y1, 0, y0); gr.addColorStop(0, "rgba(255,120,80,0.85)"); gr.addColorStop(0.5, "rgba(242,169,59,0.55)"); gr.addColorStop(1, "rgba(0,123,255,0.25)");
        g.fillStyle = gr; g.beginPath(); g.moveTo(pts[0][0], y0); pts.forEach(([x, y]) => g.lineTo(x, y)); g.lineTo(pts.at(-1)[0], y0); g.closePath(); g.save(); g.beginPath(); g.rect(x0, y1 - 10, ancho, alto + 10); g.clip();
        g.beginPath(); g.moveTo(pts[0][0], y0); pts.forEach(([x, y]) => g.lineTo(x, y)); g.lineTo(pts.at(-1)[0], y0); g.closePath(); g.fill(); g.restore();
      }
      g.save(); g.beginPath(); g.rect(x0, y1 - 10, ancho, alto + 10); g.clip();
      [["#5FE3FF", 0], ["#F2A93B", 5]].forEach(([col, off], j) => {
        if (p.tipo === "area" && j) return;
        g.strokeStyle = col; g.lineWidth = 3.5; g.beginPath();
        pts.forEach(([x], i) => { const y = y0 - val(i + off + Math.floor(t * 2)) * alto * (j ? 0.75 : 1); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
      });
      g.restore();
    } else if (p.tipo === "dona") {
      const cx = W * 0.32, cy = (y0 + y1) / 2 + 6, r = alto * 0.48;
      let a0 = -Math.PI / 2 + t * 0.15;
      const partes = [0.34, 0.24, 0.18, 0.14, 0.1].map((v, i) => v * (1 + 0.15 * Math.sin(t + i)));
      const tot = partes.reduce((s, v) => s + v, 0);
      partes.forEach((v, i) => { const a1 = a0 + (v / tot) * Math.PI * 2; g.strokeStyle = paleta[i]; g.lineWidth = 28; g.beginPath(); g.arc(cx, cy, r, a0 + 0.03, a1 - 0.03); g.stroke(); a0 = a1; });
      partes.forEach((v, i) => { const y = y1 + 22 + i * 38; g.fillStyle = paleta[i]; g.fillRect(W * 0.6, y - 12, 18, 18); g.fillStyle = "rgba(220,240,255,0.85)"; g.fillRect(W * 0.6 + 30, y - 6, 120 * (v / tot) * 2.6, 6); });
    } else if (p.tipo === "calor") {
      const cols = 16, filas = 7, cw = ancho / cols, ch = alto / filas;
      for (let i = 0; i < cols; i++) for (let j = 0; j < filas; j++) {
        const v = 0.5 + 0.5 * Math.sin(i * 0.45 + t * 0.8) * Math.cos(j * 0.6 - t * 0.5 + p.fase);
        const hue = 230 - v * 230;
        g.fillStyle = `hsla(${hue}, 95%, ${45 + v * 12}%, 0.9)`; g.fillRect(x0 + i * cw + 1, y1 + j * ch + 1, cw - 2, ch - 2);
      }
    } else if (p.tipo === "barrasH") {
      for (let i = 0; i < 6; i++) {
        const y = y1 + 8 + i * (alto / 6), w = val(i * 2) * ancho * 0.85;
        g.fillStyle = "rgba(200,235,255,0.6)"; g.fillRect(x0, y + 8, 26, 10);
        const gr = g.createLinearGradient(x0 + 40, 0, x0 + 40 + w, 0); gr.addColorStop(0, "#007BFF"); gr.addColorStop(1, i % 2 ? "#39D98A" : "#00C2C7");
        g.fillStyle = gr; g.fillRect(x0 + 40, y + 2, w, alto / 6 - 14);
      }
    }
    p.tex.needsUpdate = true;
  }
  // posiciones: tres atrás y arriba, y tres a los costados y abajo, todos mirando al centro
  const ANILLO = 10.6;
  const ubicaciones = [[-0.55, 4.6], [0.05, 5.0], [0.65, 4.6], [-1.35, 0.9], [1.45, 0.9], [-2.2, 3.6]];
  const grupoPaneles = new THREE.Group(); escena.add(grupoPaneles);
  paneles.forEach((p, k) => {
    dibujarPanel(p, 0);
    const [az, y] = ubicaciones[k], ancho = 0.5;
    const geo = new THREE.CylinderGeometry(ANILLO, ANILLO, 2.9, 24, 1, true, az - ancho / 2 + Math.PI, ancho);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: p.tex, transparent: true, side: THREE.BackSide, depthWrite: false, opacity: 0.95, toneMapped: false }));
    // el cilindro se mira desde adentro: se invierte en x para que el texto no quede espejado
    m.scale.x = -1;
    m.position.y = y;
    p.malla = m; grupoPaneles.add(m);
  });

  // polvo luminoso
  const nPolvo = tactil ? 250 : 500;
  const polvoGeo = new THREE.BufferGeometry();
  const polvoPos = new Float32Array(nPolvo * 3);
  for (let i = 0; i < nPolvo; i++) { polvoPos[i * 3] = entre(-16, 16); polvoPos[i * 3 + 1] = entre(-2, 9); polvoPos[i * 3 + 2] = entre(-16, 16); }
  polvoGeo.setAttribute("position", new THREE.BufferAttribute(polvoPos, 3));
  const polvo = new THREE.Points(polvoGeo, new THREE.PointsMaterial({ color: 0x9fe6ff, size: 0.05, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
  escena.add(polvo);

  // ---------- Posprocesado: resplandor ----------
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(escena, camara));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), tactil ? 0.7 : 0.85, 0.55, 0.62);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  function ajustar() {
    const w = contenedor.clientWidth, h = contenedor.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.resolution.set(w * 0.5, h * 0.5);
    camara.aspect = w / h;
    camara.fov = camara.aspect < 1 ? 46 : 34;
    camara.updateProjectionMatrix();
  }
  new ResizeObserver(ajustar).observe(contenedor);
  ajustar();

  // ---------- Interacción y tiempo ----------
  let objX = 0, objY = 0, mx = 0, my = 0;
  contenedor.addEventListener("pointermove", (e) => {
    const r = contenedor.getBoundingClientRect();
    objX = ((e.clientX - r.left) / r.width - 0.5) * 2; objY = ((e.clientY - r.top) / r.height - 0.5) * 2;
  });
  contenedor.addEventListener("pointerleave", () => { objX = 0; objY = 0; });
  let visible = true;
  new IntersectionObserver((e) => { visible = e[0].isIntersecting; if (visible) pedir(); }).observe(contenedor);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) pedir(); });

  const mira = new THREE.Vector3(0, 0.6, 0);
  let animando = false, panelTurno = 0, ultimoPanel = 0;
  const t0 = performance.now();
  function cuadro(ahora) {
    animando = false;
    if (!visible || document.hidden) return;
    const t = reducido ? 6 : (ahora - t0) / 1000;
    mx += (objX - mx) * 0.05; my += (objY - my) * 0.05;
    // 4D: el scroll acerca y baja la cámara mientras la portada sale de pantalla
    const prog = Math.min(1, Math.max(0, window.scrollY / Math.max(1, contenedor.getBoundingClientRect().height)));
    const az = Math.PI / 4 + (reducido ? 0 : Math.sin(t * 0.06) * 0.32) + mx * 0.25 + prog * 0.5;
    const dist = 24.5 - prog * 7, alt = 12.5 - prog * 5 - my * 1.2;
    camara.position.set(Math.cos(az) * dist, alt, Math.sin(az) * dist);
    camara.lookAt(mira);
    grupoPaneles.rotation.y = -az + Math.PI / 4 + Math.PI / 2 - Math.PI / 4; // los paneles acompañan a la cámara

    // tránsito
    trafico.forEach((c, i) => {
      c.u = (c.u + c.vel * 0.016 * c.sentido + 1) % 1;
      const d = -TAM / 2 + 0.4 + c.u * (TAM - 0.8);
      if (c.horizontal) m4.compose(v3.set(d, 0.05, c.carril), q.identity(), esc.set(1, 1, 1));
      else m4.compose(v3.set(c.carril, 0.05, d), q.setFromAxisAngle(v3.set(0, 1, 0), Math.PI / 2), esc.set(1, 1, 1));
      autos.setMatrixAt(i, m4);
    });
    autos.instanceMatrix.needsUpdate = true;
    // columnas de datos que respiran
    datosCol.forEach((c, i) => {
      const h = c.h * (0.75 + 0.25 * Math.sin(t * 1.3 + c.f));
      m4.compose(v3.set(c.x, -2.08 + h / 2, c.z), q.identity(), esc.set(1, h, 1)); columnas.setMatrixAt(i, m4);
    });
    columnas.instanceMatrix.needsUpdate = true;
    flujos.forEach((f) => { f.material.uniforms.uT.value = t; });
    haces.forEach((f) => { f.material.uniforms.uT.value = t; });
    bordes.forEach((b, k) => { b.material.opacity = 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.5 + k)); });
    edificios.children.forEach((e) => { if (e.userData.faro) e.visible = Math.sin(t * 3) > 0; });
    polvo.rotation.y = t * 0.01;
    brilloCentro.intensity = 16 + 4 * Math.sin(t * 0.8);
    // un panel por vez se redibuja, a unos 24 cuadros por segundo
    if (ahora - ultimoPanel > 40) { ultimoPanel = ahora; dibujarPanel(paneles[panelTurno], t); panelTurno = (panelTurno + 1) % paneles.length; }
    if (Math.floor(t * 4) % 3 === 0) dibujarCalor(t);

    composer.render();
    contenedor.classList.add("hero4d--activo");
    if (!reducido) pedir();
  }
  function pedir() { if (!animando) { animando = true; requestAnimationFrame(cuadro); } }
  pedir();
  window.__hero4dListo = true;
}
