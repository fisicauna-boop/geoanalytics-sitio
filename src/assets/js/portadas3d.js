// Generador de portadas 3D para artículos (1200 × 675 px).
// Escenas abstractas: no representan datos reales.
import * as THREE from "../vendor/three.module.min.js";

const ANCHO = 1200, ALTO = 675;
const C = {
  azul9: "#081B30", azul: "#0E2A47", azul7: "#1D4068", azul5: "#2E5A86", azul3: "#8FA6BF",
  tur: "#13A89E", turO: "#0A7A73", turM: "#6CCFC6", turC: "#BFEDE8", papel: "#F4F7F9", linea: "#D9E2EA", blanco: "#FFFFFF",
};
const FONDOS = {
  marino: { fondo: C.azul, base: C.azul7, linea: C.azul5, texto: C.turC, oscuro: true },
  blanco: { fondo: C.papel, base: C.blanco, linea: C.linea, texto: C.azul, oscuro: false },
};

// Generador pseudoaleatorio con semilla
function rng(semilla) { let s = (semilla * 2654435761) >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
// Ruido suave simple (suma de senos con fases aleatorias)
function ruido(r) {
  const ondas = Array.from({ length: 5 }, () => ({ fx: 0.3 + r() * 1.2, fz: 0.3 + r() * 1.2, f: r() * 6.28, a: 0.4 + r() * 0.6 }));
  return (x, z) => ondas.reduce((s, o) => s + o.a * Math.sin(o.fx * x + o.f) * Math.cos(o.fz * z - o.f * 0.7), 0) / 2.4;
}
// Contorno cerrado irregular (área de influencia)
function mancha(r, cx, cz, radio, irregular = 0.22, n = 64) {
  const f = [r() * 6, r() * 6, r() * 6];
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    const k = 1 + irregular * (0.55 * Math.sin(3 * t + f[0]) + 0.3 * Math.sin(5 * t + f[1]) + 0.15 * Math.sin(2 * t + f[2]));
    return new THREE.Vector2(cx + Math.cos(t) * radio * k, -(cz + Math.sin(t) * radio * k));
  });
}
const placa = (ancho, prof, alto, color, radio = 0.12) => {
  const s = new THREE.Shape(), w = ancho / 2, d = prof / 2, r = radio;
  s.moveTo(-w + r, -d); s.lineTo(w - r, -d); s.quadraticCurveTo(w, -d, w, -d + r); s.lineTo(w, d - r);
  s.quadraticCurveTo(w, d, w - r, d); s.lineTo(-w + r, d); s.quadraticCurveTo(-w, d, -w, d - r); s.lineTo(-w, -d + r);
  s.quadraticCurveTo(-w, -d, -w + r, -d);
  const g = new THREE.ExtrudeGeometry(s, { depth: alto, bevelEnabled: false }).rotateX(-Math.PI / 2);
  return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, roughness: 0.85 }));
};
const borde = (ancho, prof, y, color, opacidad = 1) => {
  const w = ancho / 2, d = prof / 2;
  const g = new THREE.BufferGeometry().setFromPoints([[-w, -d], [w, -d], [w, d], [-w, d]].map(([x, z]) => new THREE.Vector3(x, y, z)));
  return new THREE.LineLoop(g, new THREE.LineBasicMaterial({ color, transparent: opacidad < 1, opacity: opacidad }));
};

// ---------------- Escenas ----------------
const ESCENAS = {
  // Capas de análisis apiladas
  capas(g, r, F) {
    const n = ruido(r), L = 4.2;
    const c1 = new THREE.Group(), c2 = new THREE.Group(), c3 = new THREE.Group();
    // relieve
    const geo = new THREE.PlaneGeometry(L, L, 60, 60).rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, cols = [];
    const cBajo = new THREE.Color(F.oscuro ? C.azul7 : C.turC), cAlto = new THREE.Color(C.tur), tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const h = n(pos.getX(i) * 1.4, pos.getZ(i) * 1.4);
      pos.setY(i, 0.13 + Math.max(0, h) * 0.55);
      tmp.copy(cBajo).lerp(cAlto, Math.min(1, Math.max(0, h * 1.3 + 0.2))); cols.push(tmp.r, tmp.g, tmp.b);
    }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3)); geo.computeVertexNormals();
    c1.add(placa(L + 0.2, L + 0.2, 0.12, F.base), new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.8 })));
    // puntos (símbolos de la leyenda)
    c2.add(new THREE.Mesh(new THREE.BoxGeometry(L + 0.2, 0.02, L + 0.2), new THREE.MeshBasicMaterial({ color: F.oscuro ? C.azul5 : C.blanco, transparent: true, opacity: F.oscuro ? 0.35 : 0.85 })));
    c2.add(borde(L + 0.2, L + 0.2, 0.012, C.turM, 0.7));
    const formas = [new THREE.CylinderGeometry(0.07, 0.07, 0.16, 20), new THREE.BoxGeometry(0.12, 0.16, 0.12), new THREE.ConeGeometry(0.09, 0.18, 3)];
    const mats = [C.tur, F.oscuro ? C.blanco : C.azul, C.turM].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 }));
    for (let i = 0; i < 46; i++) { const k = Math.floor(r() * 3); const m = new THREE.Mesh(formas[k], mats[k]); m.position.set((r() - 0.5) * L * 0.9, 0.09, (r() - 0.5) * L * 0.9); c2.add(m); }
    // área de influencia
    c3.add(new THREE.Mesh(new THREE.BoxGeometry(L + 0.2, 0.02, L + 0.2), new THREE.MeshBasicMaterial({ color: C.blanco, transparent: true, opacity: 0.08 })));
    c3.add(borde(L + 0.2, L + 0.2, 0.012, C.turC, 0.8));
    const cx = (r() - 0.5) * 1.2, cz = (r() - 0.5) * 1.2;
    [[1.45, 0.25], [0.95, 0.45], [0.5, 0.7]].forEach(([rad, op], i) => {
      const m = new THREE.Mesh(new THREE.ExtrudeGeometry(new THREE.Shape(mancha(r, cx, cz, rad)), { depth: 0.05 + i * 0.05, bevelEnabled: false }).rotateX(-Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: C.tur, transparent: true, opacity: op, roughness: 0.4 }));
      c3.add(m);
    });
    c2.position.y = 1.5; c3.position.y = 3.0;
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 3.4, 8), new THREE.MeshBasicMaterial({ color: F.oscuro ? C.turC : C.turO }));
    pin.position.set(cx, 1.8, cz);
    const bola = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 16), new THREE.MeshStandardMaterial({ color: C.blanco, emissive: C.tur, emissiveIntensity: 0.5 }));
    bola.position.set(cx, 3.55, cz);
    g.add(c1, c2, c3, pin, bola);
  },

  // Áreas de influencia escalonadas alrededor de dos locales
  isocronas(g, r, F) {
    const L = 6.4, P = 4.2;
    g.add(placa(L, P, 0.1, F.base, 0.08));
    const calles = [];
    for (let i = 0; i < 16; i++) { const x = -L / 2 + 0.2 + i * (L - 0.4) / 15 + (r() - 0.5) * 0.12; calles.push(new THREE.Vector3(x, 0.105, -P / 2 + 0.1), new THREE.Vector3(x + (r() - 0.5) * 0.3, 0.105, P / 2 - 0.1)); }
    for (let i = 0; i < 11; i++) { const z = -P / 2 + 0.2 + i * (P - 0.4) / 10 + (r() - 0.5) * 0.12; calles.push(new THREE.Vector3(-L / 2 + 0.1, 0.105, z), new THREE.Vector3(L / 2 - 0.1, 0.105, z + (r() - 0.5) * 0.3)); }
    g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(calles), new THREE.LineBasicMaterial({ color: F.oscuro ? C.azul5 : C.linea })));
    const sitios = [{ x: -1.3 + (r() - 0.5) * 0.4, z: 0.2, color: C.tur, forma: "c" }, { x: 1.5 + (r() - 0.5) * 0.4, z: -0.3, color: F.oscuro ? C.blanco : C.azul, forma: "s" }];
    sitios.forEach((s, k) => {
      [[1.55, 0.18], [1.05, 0.3], [0.6, 0.48]].forEach(([rad, op], i) => {
        const m = new THREE.Mesh(new THREE.ExtrudeGeometry(new THREE.Shape(mancha(r, s.x, s.z, rad, 0.28)), { depth: 0.08 * (i + 1), bevelEnabled: false }).rotateX(-Math.PI / 2),
          new THREE.MeshStandardMaterial({ color: k ? (F.oscuro ? C.azul3 : C.azul5) : C.tur, transparent: true, opacity: op, roughness: 0.5 }));
        m.position.y = 0.1; g.add(m);
      });
      const geo = s.forma === "c" ? new THREE.CylinderGeometry(0.13, 0.13, 0.9, 32) : new THREE.BoxGeometry(0.24, 0.9, 0.24);
      const torre = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: s.color, roughness: 0.4 }));
      torre.position.set(s.x, 0.55, s.z); g.add(torre);
    });
  },

  // Red de distribución y puntos de venta
  red(g, r, F) {
    const L = 6.2, P = 4.4;
    g.add(placa(L, P, 0.1, F.base, 0.08));
    const grilla = [];
    for (let x = -L / 2 + 0.3; x < L / 2; x += 0.4) grilla.push(new THREE.Vector3(x, 0.102, -P / 2 + 0.05), new THREE.Vector3(x, 0.102, P / 2 - 0.05));
    for (let z = -P / 2 + 0.3; z < P / 2; z += 0.4) grilla.push(new THREE.Vector3(-L / 2 + 0.05, 0.102, z), new THREE.Vector3(L / 2 - 0.05, 0.102, z));
    g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(grilla), new THREE.LineBasicMaterial({ color: F.oscuro ? C.azul5 : C.linea })));
    const centro = new THREE.Vector3((r() - 0.5) * 0.8, 0, (r() - 0.5) * 0.6);
    const deposito = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), new THREE.MeshStandardMaterial({ color: C.tur, roughness: 0.4 }));
    deposito.position.set(centro.x, 0.375, centro.z); g.add(deposito);
    const matPunto = new THREE.MeshStandardMaterial({ color: F.oscuro ? C.blanco : C.azul, roughness: 0.5 });
    const matArco = new THREE.LineBasicMaterial({ color: F.oscuro ? C.turM : C.turO, transparent: true, opacity: 0.85 });
    for (let i = 0; i < 16; i++) {
      const a = r() * Math.PI * 2, d = 0.9 + r() * 1.9;
      const x = Math.max(-L / 2 + 0.3, Math.min(L / 2 - 0.3, centro.x + Math.cos(a) * d * 1.3)), z = Math.max(-P / 2 + 0.3, Math.min(P / 2 - 0.3, centro.z + Math.sin(a) * d * 0.85));
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), matPunto); p.position.set(x, 0.18, z); g.add(p);
      const disco = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.02, 40), new THREE.MeshBasicMaterial({ color: C.tur, transparent: true, opacity: 0.16 }));
      disco.position.set(x, 0.11, z); g.add(disco);
      const curva = new THREE.QuadraticBezierCurve3(new THREE.Vector3(centro.x, 0.65, centro.z), new THREE.Vector3((x + centro.x) / 2, 1.1 + d * 0.25, (z + centro.z) / 2), new THREE.Vector3(x, 0.26, z));
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curva.getPoints(40)), matArco));
    }
  },

  // Campo de hexágonos (mapa coroplético en 3D)
  hexagonos(g, r, F) {
    const n = ruido(r), R = 0.2, DX = Math.sqrt(3) * R, DZ = 1.5 * R;
    const geo = new THREE.CylinderGeometry(R * 0.92, R * 0.92, 1, 6); geo.translate(0, 0.5, 0);
    const celdas = [];
    for (let f = -12; f <= 12; f++) for (let c = -17; c <= 17; c++) {
      const x = c * DX + (f & 1 ? DX / 2 : 0), z = f * DZ;
      const borde = Math.hypot(x / 3.4, z / 2.4);
      if (borde > 1 + (r() - 0.5) * 0.12) continue;
      celdas.push({ x, z, h: Math.max(0.05, (n(x * 0.9, z * 0.9) + 0.6) * 0.75 * (1 - borde * 0.45)) });
    }
    const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.55 }), celdas.length);
    const m4 = new THREE.Matrix4(), col = new THREE.Color();
    const rampa = [F.oscuro ? C.azul5 : C.turC, C.turM, C.tur, C.turO, F.oscuro ? C.turC : C.azul].map((c) => new THREE.Color(c));
    const hMax = Math.max(...celdas.map((c) => c.h));
    celdas.forEach((c, i) => {
      m4.makeScale(1, c.h, 1).setPosition(c.x, 0, c.z); im.setMatrixAt(i, m4);
      const t = Math.min(0.999, c.h / hMax) * (rampa.length - 1), k = Math.floor(t);
      im.setColorAt(i, col.copy(rampa[k]).lerp(rampa[k + 1], t - k));
    });
    g.add(im);
  },
};

// ---------------- Render ----------------
export function crearGenerador(lienzoContenedor) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(ANCHO, ALTO, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  lienzoContenedor.appendChild(renderer.domElement);

  function dibujar({ escena = "capas", fondo = "marino", semilla = 1 }) {
    const F = FONDOS[fondo] || FONDOS.marino, r = rng(semilla);
    const s = new THREE.Scene();
    s.background = new THREE.Color(F.fondo);
    s.add(new THREE.HemisphereLight(0xffffff, F.oscuro ? 0x0a1d33 : 0xc9d6e3, F.oscuro ? 1.15 : 1.5));
    const sol = new THREE.DirectionalLight(0xffffff, 1.7); sol.position.set(-4, 10, 6); s.add(sol);
    const g = new THREE.Group(); s.add(g);
    (ESCENAS[escena] || ESCENAS.capas)(g, r, F);

    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
    const az = Math.PI / 4 + (r() - 0.5) * 0.25, el = 0.55;
    cam.position.set(Math.sin(az) * Math.cos(el) * 40, Math.sin(el) * 40, Math.cos(az) * Math.cos(el) * 40);
    cam.lookAt(0, 0, 0); cam.updateMatrixWorld();
    // encuadre automático
    const caja = new THREE.Box3().setFromObject(g), inv = cam.matrixWorldInverse, p = new THREE.Vector3();
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const x of [caja.min.x, caja.max.x]) for (const y of [caja.min.y, caja.max.y]) for (const z of [caja.min.z, caja.max.z]) {
      p.set(x, y, z).applyMatrix4(inv); x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
    }
    const asp = ANCHO / ALTO, media = Math.max((y1 - y0) / 2, (x1 - x0) / 2 / asp) * 1.12;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    cam.left = cx - media * asp; cam.right = cx + media * asp; cam.top = cy + media; cam.bottom = cy - media; cam.updateProjectionMatrix();
    renderer.render(s, cam);
    s.traverse((o) => { o.geometry?.dispose?.(); });
  }
  return { dibujar, lienzo: renderer.domElement };
}

// Interfaz de la página del generador
const raiz = document.querySelector("[data-generador]");
if (raiz) {
  const gen = crearGenerador(raiz.querySelector(".generador__lienzo"));
  const form = raiz.querySelector("form");
  const estado = () => Object.fromEntries(new FormData(form));
  const repintar = () => { const e = estado(); gen.dibujar({ ...e, semilla: Number(e.semilla) || 1 }); };
  form.addEventListener("input", repintar);
  raiz.querySelector("[data-otra]").addEventListener("click", () => { form.semilla.value = Math.floor(Math.random() * 9000) + 1; repintar(); });
  raiz.querySelector("[data-descargar]").addEventListener("click", () => {
    const e = estado(), a = document.createElement("a");
    a.href = gen.lienzo.toDataURL("image/png");
    a.download = `portada-${e.escena}-${e.fondo}-${e.semilla}.png`;
    document.body.appendChild(a); a.click(); a.remove();
  });
  const q = new URLSearchParams(location.search);
  ["escena", "fondo", "semilla"].forEach((k) => { if (q.get(k) && form[k]) form[k].value = q.get(k); });
  repintar();
  window.__listo = true;
}
