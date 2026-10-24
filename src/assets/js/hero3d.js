// Escena 3D de la portada: capas de un análisis territorial sobre el contorno de Paraguay.
// El contorno proviene de Natural Earth (dominio público). Los valores de las capas son ilustrativos:
// la altura de los hexágonos es solo una función de la distancia a Asunción, no un dato medido.
import * as THREE from "../vendor/three.module.min.js";

const contenedor = document.querySelector("[data-hero3d]");
const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function webglDisponible() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch { return false; }
}

if (contenedor && webglDisponible()) iniciar().catch(() => { /* se mantiene la imagen fija */ });

async function iniciar() {
  const datos = await fetch(new URL("../datos/paraguay.json", import.meta.url)).then((r) => r.json());

  // ---------- Proyección simple (equirectangular corregida por latitud) ----------
  const LON0 = -58.35, LAT0 = -23.45, K = 0.56, COS = Math.cos(LAT0 * Math.PI / 180);
  const px = (lon) => (lon - LON0) * COS * K;
  const pz = (lat) => -(lat - LAT0) * K;
  const contorno = datos.contorno.map(([lon, lat]) => [px(lon), pz(lat)]);
  const asu = { x: px(datos.asuncion[0]), z: pz(datos.asuncion[1]) };

  const dentro = (x, z) => {
    let ok = false;
    for (let i = 0, j = contorno.length - 1; i < contorno.length; j = i++) {
      const [xi, zi] = contorno[i], [xj, zj] = contorno[j];
      if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) ok = !ok;
    }
    return ok;
  };

  // ---------- Colores (iguales a la hoja de estilos) ----------
  const C = {
    azul: new THREE.Color("#0E2A47"), azul7: new THREE.Color("#1D4068"), azul5: new THREE.Color("#2E5A86"),
    tur: new THREE.Color("#13A89E"), turM: new THREE.Color("#6CCFC6"), turC: new THREE.Color("#BFEDE8"),
    blanco: new THREE.Color("#FFFFFF"),
  };

  // ---------- Renderizador, cámara y luces ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.className = "hero3d__lienzo";
  canvas.setAttribute("aria-hidden", "true");

  const escena = new THREE.Scene();
  const camara = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  escena.add(new THREE.HemisphereLight(0xdff6f3, 0x0a1d33, 1.15));
  const sol = new THREE.DirectionalLight(0xffffff, 1.6);
  sol.position.set(-4, 10, 6);
  escena.add(sol);

  const forma = new THREE.Shape(contorno.map(([x, z]) => new THREE.Vector2(x, -z)));
  const lineaContorno = (y, mat) => {
    const g = new THREE.BufferGeometry().setFromPoints(contorno.map(([x, z]) => new THREE.Vector3(x, y, z)));
    const l = new THREE.LineLoop(g, mat);
    if (mat.isLineDashedMaterial) l.computeLineDistances();
    return l;
  };

  // Grilla hexagonal recortada al contorno
  const R = 0.12, DX = Math.sqrt(3) * R, DZ = 1.5 * R;
  const celdas = [];
  for (let fila = -24; fila <= 24; fila++) for (let col = -24; col <= 24; col++) {
    const x = col * DX + (fila & 1 ? DX / 2 : 0), z = fila * DZ;
    if (dentro(x, z)) celdas.push({ x, z, d: Math.hypot(x - asu.x, z - asu.z) });
  }
  const hexGeo = new THREE.CylinderGeometry(R * 0.9, R * 0.9, 1, 6);
  hexGeo.translate(0, 0.5, 0);

  // ---------- Capa 1: Territorio ----------
  const capa1 = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.ExtrudeGeometry(forma, { depth: 0.16, bevelEnabled: false }).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: C.azul7, roughness: 0.85, metalness: 0.05 }),
  );
  capa1.add(base);
  capa1.add(lineaContorno(0.162, new THREE.LineBasicMaterial({ color: C.tur })));
  // Paralelos y meridianos cada 2 grados, recortados al contorno
  const puntosGrilla = [];
  const tramo = (a, b) => { puntosGrilla.push(new THREE.Vector3(a[0], 0.163, a[1]), new THREE.Vector3(b[0], 0.163, b[1])); };
  for (let lon = -62; lon <= -54; lon += 2) for (let lat = -27.8; lat < -19.2; lat += 0.05) {
    const a = [px(lon), pz(lat)], b = [px(lon), pz(lat + 0.05)];
    if (dentro(...a) && dentro(...b)) tramo(a, b);
  }
  for (let lat = -27; lat <= -20; lat += 2) for (let lon = -62.8; lon < -54; lon += 0.05) {
    const a = [px(lon), pz(lat)], b = [px(lon + 0.05), pz(lat)];
    if (dentro(...a) && dentro(...b)) tramo(a, b);
  }
  capa1.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(puntosGrilla),
    new THREE.LineBasicMaterial({ color: C.azul5, transparent: true, opacity: 0.9 })));

  // ---------- Capa 2: Accesibilidad (hexágonos con altura ilustrativa) ----------
  const capa2 = new THREE.Group();
  const placa2 = new THREE.Mesh(new THREE.ShapeGeometry(forma).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: C.azul5, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
  capa2.add(placa2);
  capa2.add(lineaContorno(0.002, new THREE.LineBasicMaterial({ color: C.turM, transparent: true, opacity: 0.55 })));
  const hexes = new THREE.InstancedMesh(hexGeo, new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.08 }), celdas.length);
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  const alturas = celdas.map((c) => 0.04 + 0.95 * Math.exp(-c.d / 1.05));
  celdas.forEach((c, i) => {
    const t = Math.min(1, (alturas[i] - 0.04) / 0.95);
    col.copy(C.azul5).lerp(C.tur, Math.min(1, t * 1.6));
    if (t > 0.6) col.lerp(C.turC, (t - 0.6) / 0.4 * 0.7);
    hexes.setColorAt(i, col);
  });
  capa2.add(hexes);

  // ---------- Capa 3: Área de influencia (bandas alrededor de Asunción) ----------
  const capa3 = new THREE.Group();
  capa3.add(new THREE.Mesh(new THREE.ShapeGeometry(forma).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: C.blanco, transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false })));
  capa3.add(lineaContorno(0.002, new THREE.LineDashedMaterial({ color: C.turC, dashSize: 0.09, gapSize: 0.07, transparent: true, opacity: 0.85 })));
  const bandas = [[0.75, C.turC, 0.95], [1.45, C.turM, 0.75], [2.2, C.tur, 0.55]];
  bandas.forEach(([radio, color, opac], k) => {
    const sel = celdas.filter((c) => c.d <= radio && (k === 0 || c.d > bandas[k - 1][0]));
    const im = new THREE.InstancedMesh(hexGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: opac }), sel.length);
    sel.forEach((c, i) => { m4.makeScale(1, 0.035, 1).setPosition(c.x, 0, c.z); im.setMatrixAt(i, m4); });
    capa3.add(im);
  });

  escena.add(capa1, capa2, capa3);

  // ---------- Línea que une Asunción a través de las capas ----------
  const ejeGeo = new THREE.BufferGeometry().setFromPoints([0, 1, 2, 3].map(() => new THREE.Vector3()));
  const ejeLinea = new THREE.Line(ejeGeo, new THREE.LineBasicMaterial({ color: C.turC }));
  const nodoGeo = new THREE.SphereGeometry(0.055, 20, 14);
  const nodos = [0, 1, 2].map(() => new THREE.Mesh(nodoGeo, new THREE.MeshStandardMaterial({ color: C.blanco, emissive: C.tur, emissiveIntensity: 0.5 })));
  const punta = new THREE.Mesh(new THREE.SphereGeometry(0.085, 24, 16), new THREE.MeshStandardMaterial({ color: C.blanco, emissive: C.tur, emissiveIntensity: 0.8 }));
  escena.add(ejeLinea, punta, ...nodos);

  // ---------- Etiquetas HTML ----------
  const capaEtiquetas = document.createElement("div");
  capaEtiquetas.className = "hero3d__etiquetas";
  capaEtiquetas.setAttribute("aria-hidden", "true");
  const nombres = ["Territorio", "Accesibilidad", "Área de influencia"];
  const etiquetas = nombres.map((n) => {
    const e = document.createElement("span"); e.className = "hero3d__etiqueta"; e.textContent = n; capaEtiquetas.appendChild(e); return e;
  });
  const etAsu = document.createElement("span"); etAsu.className = "hero3d__etiqueta hero3d__etiqueta--lugar"; etAsu.textContent = "Asunción";
  capaEtiquetas.appendChild(etAsu);
  // Ancla de cada etiqueta: el vértice más oriental del contorno
  const este = contorno.reduce((m, p) => (p[0] > m[0] ? p : m), contorno[0]);

  contenedor.appendChild(canvas);
  contenedor.appendChild(capaEtiquetas);

  // ---------- Estado y animación ----------
  let apertura = reducido ? 1 : 0;   // 0 = capas juntas, 1 = capas separadas
  let crecimiento = reducido ? 1 : 0;
  let azim = 0, azimObj = 0, elev = 0, elevObj = 0;
  const t0 = performance.now();
  let animando = true, visible = true, ancho = 1, alto = 1;
  const SEP = 1.05, DESPL = 1.45;     // separación vertical y desplazamiento diagonal entre capas
  const capas = [capa1, capa2, capa3];
  const BASE_Y = 0.16;

  // Posición de cada capa según la apertura (0 a 1)
  function posicionar(ap, cr) {
    capas.forEach((c, k) => c.position.set(k * DESPL * ap, k === 0 ? 0 : BASE_Y + k * SEP * ap, -k * DESPL * ap));
    celdas.forEach((c, i) => { m4.makeScale(1, Math.max(0.001, alturas[i] * cr), 1).setPosition(c.x, 0, c.z); hexes.setMatrixAt(i, m4); });
    hexes.instanceMatrix.needsUpdate = true;
    const pts = capas.map((c, k) => new THREE.Vector3(asu.x + c.position.x, (k === 0 ? BASE_Y : c.position.y) + 0.01, asu.z + c.position.z));
    const top = capas[2].position, alto = 0.75;
    pts.push(new THREE.Vector3(asu.x + top.x, top.y + alto, asu.z + top.z));
    ejeGeo.setFromPoints(pts);
    nodos.forEach((n, k) => n.position.copy(pts[k]));
    punta.position.copy(pts[3]);
    return pts;
  }
  function orientar(az, el) {
    const a = Math.PI / 4 + az, e = 0.52 + el;
    camara.position.set(Math.sin(a) * Math.cos(e) * 30, Math.sin(e) * 30, Math.cos(a) * Math.cos(e) * 30);
    camara.lookAt(0, 0, 0);
    camara.updateMatrixWorld();
  }

  // Encuadre: calcula el tamaño de la vista para que la escena final ocupe el lienzo
  let centro = new THREE.Vector2(), media = 1;
  function encuadre() {
    posicionar(1, 1); orientar(0, 0);
    const inv = camara.matrixWorldInverse, p = new THREE.Vector3();
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    const incluir = (x, y, z) => { p.set(x, y, z).applyMatrix4(inv); x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); };
    capas.forEach((c, k) => {
      const yAlto = k === 1 ? 1.0 : 0.17;
      contorno.forEach(([x, z]) => { incluir(x + c.position.x, c.position.y, z + c.position.z); incluir(x + c.position.x, c.position.y + yAlto, z + c.position.z); });
    });
    const t = capas[2].position; incluir(asu.x + t.x, t.y + 0.95, asu.z + t.z);
    const asp = ancho / alto;
    // Se reserva a la derecha el espacio que ocupan las etiquetas (en píxeles)
    const reservaPx = ancho < 520 ? 112 : 118;
    const anchoNec = (x1 - x0) / Math.max(0.5, 1 - reservaPx / ancho) * 1.03, altoNec = (y1 - y0) * 1.06;
    media = Math.max(altoNec / 2, anchoNec / 2 / asp);
    centro.set(x0 - (x1 - x0) * 0.015 + media * asp, (y0 + y1) / 2);
  }

  function ajustar() {
    const r = contenedor.getBoundingClientRect();
    ancho = Math.max(1, r.width); alto = Math.max(1, r.height);
    renderer.setSize(ancho, alto, false);
    encuadre();
    const asp = ancho / alto;
    camara.left = centro.x - media * asp; camara.right = centro.x + media * asp;
    camara.top = centro.y + media; camara.bottom = centro.y - media;
    camara.updateProjectionMatrix();
    pedir();
  }

  const v = new THREE.Vector3();
  function aPantalla(p) {
    v.copy(p).project(camara);
    return [(v.x + 1) / 2 * ancho, (1 - v.y) / 2 * alto];
  }

  function dibujar(ahora) {
    const t = (ahora - t0) / 1000;
    if (!reducido) {
      const e = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
      apertura = e((t - 0.25) / 1.6);
      crecimiento = e((t - 0.9) / 1.4);
      azim += (azimObj - azim) * 0.06; elev += (elevObj - elev) * 0.06;
    }
    const pts = posicionar(apertura, crecimiento);
    orientar(azim, elev);
    renderer.render(escena, camara);

    capas.forEach((c, i) => {
      const [sx, sy] = aPantalla(new THREE.Vector3(este[0] + c.position.x, c.position.y + (i === 0 ? 0.16 : 0), este[1] + c.position.z));
      etiquetas[i].style.transform = `translate(${Math.round(sx + 14)}px, ${Math.round(sy - 12)}px)`;
      etiquetas[i].style.opacity = i === 0 || apertura > 0.6 ? 1 : 0;
    });
    const [ax, ay] = aPantalla(pts[3]);
    etAsu.style.transform = `translate(${Math.round(ax + 12)}px, ${Math.round(ay - 12)}px)`;
    etAsu.style.opacity = apertura > 0.8 ? 1 : 0;

    const quieto = Math.abs(azimObj - azim) < 1e-4 && Math.abs(elevObj - elev) < 1e-4;
    animando = !(reducido || (t > 2.5 && quieto));
    if (animando && visible) requestAnimationFrame(dibujar);
  }
  function pedir() { if (!animando) { animando = true; requestAnimationFrame(dibujar); } }

  // Inclinación suave según el puntero
  if (!reducido) {
    contenedor.closest(".portada")?.addEventListener("pointermove", (ev) => {
      const r = contenedor.getBoundingClientRect();
      azimObj = ((ev.clientX - (r.left + r.width / 2)) / window.innerWidth) * 0.45;
      elevObj = ((ev.clientY - (r.top + r.height / 2)) / window.innerHeight) * -0.18;
      pedir();
    });
  }
  new ResizeObserver(ajustar).observe(contenedor);
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) pedir(); }).observe(contenedor);

  ajustar();
  contenedor.classList.add("hero3d--activo");
  requestAnimationFrame(dibujar);
}
