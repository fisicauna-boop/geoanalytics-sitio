// Demostración: góndola 3D simulada con indicadores de trade marketing.
// Todos los datos se generan en el navegador; no representan marcas ni resultados reales.
import * as THREE from "../vendor/three.module.min.js";

const raiz = document.querySelector("[data-demo-gondola]");

function rng(semilla) { let s = (semilla * 2654435761) >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

const MARCAS = [
  { id: "foco", nombre: "Marca X", color: "#13A89E" },
  { id: "a", nombre: "Competidor A", color: "#1D4068" },
  { id: "b", nombre: "Competidor B", color: "#5B7FA6" },
  { id: "c", nombre: "Competidor C", color: "#9DB4CC" },
  { id: "otras", nombre: "Otras marcas", color: "#C9D3DD" },
];
const ESTANTES = 5, POSICIONES = 18;

// Genera la góndola: cada estante es una secuencia de posiciones con marca o vacío
function generar(semilla) {
  const r = rng(semilla);
  const pesos = [0.14 + r() * 0.2, 0.18 + r() * 0.12, 0.12 + r() * 0.1, 0.08 + r() * 0.08, 0.06 + r() * 0.06];
  const total = pesos.reduce((a, b) => a + b, 0);
  const tasaVacio = 0.04 + r() * 0.08;
  const estantes = [];
  for (let e = 0; e < ESTANTES; e++) {
    const fila = [];
    // bloques por marca (las marcas se agrupan en la góndola)
    while (fila.length < POSICIONES) {
      let u = r() * total, m = 0;
      while (u > pesos[m]) { u -= pesos[m]; m++; }
      const largo = 1 + Math.floor(r() * 4);
      const alto = 0.55 + r() * 0.3;
      for (let k = 0; k < largo && fila.length < POSICIONES; k++) fila.push(r() < tasaVacio ? null : { marca: m, alto: alto * (0.94 + r() * 0.08) });
    }
    estantes.push(fila);
  }
  return estantes;
}

function indicadores(estantes, marca) {
  let ocupados = 0, vacios = 0, propios = 0, ojosOcup = 0, ojosPropios = 0;
  const porMarca = MARCAS.map(() => 0);
  estantes.forEach((fila, e) => fila.forEach((p) => {
    if (!p) { vacios++; return; }
    ocupados++; porMarca[p.marca]++;
    if (p.marca === marca) propios++;
    if (e === 1 || e === 2) { ojosOcup++; if (p.marca === marca) ojosPropios++; }
  }));
  return {
    share: propios / ocupados, frentes: propios, ojos: ojosOcup ? ojosPropios / ojosOcup : 0,
    vacios, posiciones: ESTANTES * POSICIONES, porMarca, ocupados,
  };
}

function iniciar() {
  const cont = raiz.querySelector(".gondola3d");
  const tip = raiz.querySelector(".gondola-tip");
  const sel = raiz.querySelector("#g-marca");
  const chkVacios = raiz.querySelector("#g-quiebres");
  MARCAS.slice(0, 4).forEach((m, i) => sel.add(new Option(m.nombre, i)));

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  cont.appendChild(renderer.domElement);
  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  escena.add(new THREE.HemisphereLight(0xffffff, 0xb8c6d4, 1.6));
  const luz = new THREE.DirectionalLight(0xffffff, 1.4); luz.position.set(3, 6, 8); escena.add(luz);

  const ANCHO = 9, ALTO_E = 1.15, PROF = 1.1, paso = ANCHO / POSICIONES;
  const mueble = new THREE.Group();
  const pieza = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; };
  const matMueble = new THREE.MeshStandardMaterial({ color: 0xe9eef3, roughness: 0.9 });
  const matBorde = new THREE.MeshStandardMaterial({ color: 0x0e2a47, roughness: 0.6 });
  mueble.add(pieza(new THREE.BoxGeometry(ANCHO + 0.3, ESTANTES * ALTO_E + 0.4, 0.08), matMueble, 0, (ESTANTES * ALTO_E) / 2, -PROF / 2));
  [-1, 1].forEach((lado) => mueble.add(pieza(new THREE.BoxGeometry(0.12, ESTANTES * ALTO_E + 0.4, PROF), matBorde, lado * (ANCHO / 2 + 0.11), (ESTANTES * ALTO_E) / 2, 0)));
  for (let e = 0; e <= ESTANTES; e++) {
    const y = e * ALTO_E;
    mueble.add(pieza(new THREE.BoxGeometry(ANCHO + 0.1, 0.07, PROF), matMueble, 0, y, 0));
    if (e < ESTANTES) mueble.add(pieza(new THREE.BoxGeometry(ANCHO + 0.1, 0.12, 0.03), matBorde, 0, y + 0.02, PROF / 2));
  }
  escena.add(mueble);

  const productos = new THREE.Group(); escena.add(productos);
  const geoProd = new THREE.BoxGeometry(paso * 0.86, 1, PROF * 0.7);
  geoProd.translate(0, 0.5, 0);
  const geoVacio = new THREE.EdgesGeometry(new THREE.BoxGeometry(paso * 0.86, 0.55, PROF * 0.7));

  let semilla = 7, estantes = generar(semilla), marcaFoco = 0;

  function construir() {
    productos.clear();
    estantes.forEach((fila, e) => {
      const yBase = (ESTANTES - 1 - e) * ALTO_E + 0.035; // e = 0 es el estante de arriba
      fila.forEach((p, i) => {
        const x = -ANCHO / 2 + paso * (i + 0.5);
        if (!p) {
          const l = new THREE.LineSegments(geoVacio, new THREE.LineBasicMaterial({ color: 0xc0392b }));
          l.position.set(x, yBase + 0.275, 0); l.userData = { vacio: true, e, i }; l.visible = chkVacios.checked;
          productos.add(l); return;
        }
        const m = MARCAS.at(p.marca);
        const destacado = p.marca === marcaFoco;
        const mesh = new THREE.Mesh(geoProd, new THREE.MeshStandardMaterial({
          color: m.color, roughness: 0.55, transparent: !destacado, opacity: destacado ? 1 : 0.55,
        }));
        mesh.scale.y = p.alto; mesh.position.set(x, yBase, 0);
        mesh.userData = { marca: m.nombre, e, i };
        productos.add(mesh);
      });
    });
    actualizarPanel();
    pedir();
  }

  // Panel de indicadores y gráfico de barras
  const fmt = (x) => `${(x * 100).toFixed(1).replace(".", ",")} %`;
  function actualizarPanel() {
    const k = indicadores(estantes, marcaFoco);
    const nombre = MARCAS.at(marcaFoco).nombre;
    raiz.querySelectorAll("[data-marca-nombre]").forEach((el) => (el.textContent = nombre));
    raiz.querySelector("#k-share").textContent = fmt(k.share);
    raiz.querySelector("#k-frentes").textContent = `${k.frentes} de ${k.ocupados}`;
    raiz.querySelector("#k-ojos").textContent = fmt(k.ojos);
    raiz.querySelector("#k-quiebres").textContent = `${k.vacios} de ${k.posiciones} (${fmt(k.vacios / k.posiciones)})`;
    const filas = MARCAS.map((m, i) => ({ ...m, i, share: k.porMarca.at(i) / k.ocupados })).sort((a, b) => b.share - a.share);
    const max = filas[0].share;
    raiz.querySelector("#g-grafico").innerHTML = `<p class="demo__grafico-titulo">Share of shelf por marca</p>` + filas.map((f) =>
      `<div class="barra${f.i === marcaFoco ? " barra--foco" : ""}"><span class="barra__nombre">${f.nombre}</span><span class="barra__pista"><span class="barra__valor" style="width:${(f.share / max) * 100}%;background:${f.color}"></span></span><span class="barra__num">${fmt(f.share)}</span></div>`).join("");
  }

  // Cámara con giro por arrastre
  let azim = -0.25, elev = 0.12, arrastre = null, ancho = 1, alto = 1;
  function ajustar() {
    const r = cont.getBoundingClientRect(); ancho = Math.max(1, r.width); alto = Math.max(1, r.height);
    renderer.setSize(ancho, alto, false); camara.aspect = ancho / alto; camara.updateProjectionMatrix(); pedir();
  }
  function colocarCamara() {
    const dist = camara.aspect < 1 ? 22 : 13.5;
    camara.position.set(Math.sin(azim) * dist, 3 + Math.sin(elev) * dist, Math.cos(azim) * dist);
    camara.lookAt(0, (ESTANTES * ALTO_E) / 2 - 0.2, 0);
  }
  let pendiente = false;
  function pedir() { if (!pendiente) { pendiente = true; requestAnimationFrame(() => { pendiente = false; colocarCamara(); renderer.render(escena, camara); }); } }
  cont.addEventListener("pointerdown", (e) => { arrastre = { x: e.clientX, y: e.clientY, a: azim, el: elev }; cont.setPointerCapture(e.pointerId); });
  cont.addEventListener("pointerup", () => (arrastre = null));
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  cont.addEventListener("pointermove", (e) => {
    if (arrastre) {
      azim = Math.max(-0.9, Math.min(0.9, arrastre.a + (e.clientX - arrastre.x) * 0.006));
      elev = Math.max(-0.05, Math.min(0.5, arrastre.el + (e.clientY - arrastre.y) * 0.004));
      tip.hidden = true; pedir(); return;
    }
    const r = cont.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camara);
    const hit = ray.intersectObjects(productos.children.filter((o) => o.isMesh), false)[0];
    if (hit) {
      const d = hit.object.userData;
      tip.textContent = `${d.marca} · estante ${d.e + 1} · posición ${d.i + 1}`;
      tip.style.transform = `translate(${e.clientX - r.left + 12}px, ${e.clientY - r.top + 12}px)`;
      tip.hidden = false;
    } else tip.hidden = true;
  });
  cont.addEventListener("pointerleave", () => (tip.hidden = true));

  sel.addEventListener("change", () => { marcaFoco = Number(sel.value); construir(); });
  chkVacios.addEventListener("change", () => { productos.children.forEach((o) => { if (o.userData.vacio) o.visible = chkVacios.checked; }); pedir(); });
  raiz.querySelector("#g-nueva").addEventListener("click", () => { semilla += 1; estantes = generar(semilla); construir(); });

  new ResizeObserver(ajustar).observe(cont);
  ajustar(); construir();
  window.__demoListo = true;
}

if (raiz) iniciar();
