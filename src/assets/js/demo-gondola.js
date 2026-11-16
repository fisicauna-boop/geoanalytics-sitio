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
export const CATEGORIAS = ["Cereales y snacks", "Bebidas", "Conservas", "Limpieza", "Aguas y jugos"];
const LETRA = ["X", "A", "B", "C", "O"];

// Genera la góndola: cada estante es una secuencia de posiciones con marca o vacío
export function generar(semilla) {
  const r = rng(semilla);
  const pesos = [0.14 + r() * 0.2, 0.18 + r() * 0.12, 0.12 + r() * 0.1, 0.08 + r() * 0.08, 0.06 + r() * 0.06];
  const total = pesos.reduce((a, b) => a + b, 0);
  const tasaVacio = 0.04 + r() * 0.08;
  const estantes = [];
  for (let e = 0; e < ESTANTES; e++) {
    const fila = [];
    const nPorMarca = MARCAS.map(() => 0);
    // bloques por marca (las marcas se agrupan en la góndola); cada bloque es un SKU
    while (fila.length < POSICIONES) {
      let u = r() * total, m = 0;
      while (u > pesos[m]) { u -= pesos[m]; m++; }
      const largo = 1 + Math.floor(r() * 4);
      const alto = 0.55 + r() * 0.3;
      nPorMarca[m]++;
      const sku = `${LETRA[m]}-${String(e + 1)}${String(nPorMarca[m]).padStart(2, "0")}`;
      for (let k = 0; k < largo && fila.length < POSICIONES; k++) fila.push(r() < tasaVacio ? { vacio: true, marca: m, sku } : { marca: m, sku, alto: alto * (0.94 + r() * 0.08) });
    }
    estantes.push(fila);
  }
  return estantes;
}

// Detalle de un SKU: frentes con producto, frentes planificados (incluye sus huecos) y disponibilidad
export function detalleSku(estantes, sku) {
  let frentes = 0, plan = 0, estante = -1, desde = Infinity, hasta = -1, marca = 0;
  estantes.forEach((fila, e) => fila.forEach((p, i) => {
    if (p.sku !== sku) return;
    plan++; if (!p.vacio) frentes++; estante = e; marca = p.marca; desde = Math.min(desde, i); hasta = Math.max(hasta, i);
  }));
  return { sku, marca, frentes, plan, osa: plan ? frentes / plan : 0, estante, desde, hasta };
}

export function indicadores(estantes, marca) {
  let ocupados = 0, vacios = 0, propios = 0, ojosOcup = 0, ojosPropios = 0, planMarca = 0;
  const porMarca = MARCAS.map(() => 0);
  estantes.forEach((fila, e) => fila.forEach((p) => {
    if (p.marca === marca) planMarca++;
    if (p.vacio) { vacios++; return; }
    ocupados++; porMarca[p.marca]++;
    if (p.marca === marca) propios++;
    if (e === 1 || e === 2) { ojosOcup++; if (p.marca === marca) ojosPropios++; }
  }));
  return {
    share: propios / ocupados, frentes: propios, ojos: ojosOcup ? ojosPropios / ojosOcup : 0,
    osa: 1 - vacios / (ESTANTES * POSICIONES), osaMarca: planMarca ? propios / planMarca : 0,
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
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  cont.appendChild(renderer.domElement);
  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  escena.add(new THREE.HemisphereLight(0xffffff, 0xaab9c9, 1.15));
  const luz = new THREE.DirectionalLight(0xffffff, 1.9);
  luz.position.set(4, 9, 9); luz.castShadow = true;
  luz.shadow.mapSize.set(2048, 2048); Object.assign(luz.shadow.camera, { left: -7, right: 7, top: 8, bottom: -2, near: 1, far: 30 }); luz.shadow.bias = -0.0008;
  escena.add(luz);
  const relleno = new THREE.DirectionalLight(0xcfe9ff, 0.6); relleno.position.set(-6, 4, 5); escena.add(relleno);

  const ANCHO = 9, ALTO_E = 1.15, PROF = 1.1, paso = ANCHO / POSICIONES;
  const mueble = new THREE.Group();
  const pieza = (geo, mat, x, y, z, sombra = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = sombra; m.receiveShadow = true; return m; };
  const lienzo = (w, h, dibujar) => { const c = document.createElement("canvas"); c.width = w; c.height = h; dibujar(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

  // Fondo perforado del mueble
  const texFondo = lienzo(256, 256, (g, w, h) => { g.fillStyle = "#EEF2F6"; g.fillRect(0, 0, w, h); g.fillStyle = "#C9D3DD"; for (let y = 8; y < h; y += 16) for (let x = 8; x < w; x += 16) { g.beginPath(); g.arc(x, y, 2.2, 0, Math.PI * 2); g.fill(); } });
  texFondo.wrapS = texFondo.wrapT = THREE.RepeatWrapping; texFondo.repeat.set(7, 4);
  const matMueble = new THREE.MeshStandardMaterial({ color: 0xf3f6f9, roughness: 0.55, metalness: 0.15 });
  const matBorde = new THREE.MeshStandardMaterial({ color: 0x0b2d4a, roughness: 0.35, metalness: 0.5 });
  mueble.add(pieza(new THREE.BoxGeometry(ANCHO + 0.3, ESTANTES * ALTO_E + 0.4, 0.08), new THREE.MeshStandardMaterial({ map: texFondo, roughness: 0.8 }), 0, (ESTANTES * ALTO_E) / 2, -PROF / 2));
  [-1, 1].forEach((lado) => mueble.add(pieza(new THREE.BoxGeometry(0.14, ESTANTES * ALTO_E + 0.9, PROF + 0.1), matBorde, lado * (ANCHO / 2 + 0.12), (ESTANTES * ALTO_E + 0.5) / 2 - 0.1, 0)));
  // Cartel superior iluminado
  const texCartel = lienzo(2048, 100, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, "#0B2D4A"); gr.addColorStop(1, "#0F4C78"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = "#00C2C7"; g.fillRect(0, h - 8, w, 8);
    g.fillStyle = "#FFFFFF"; g.font = "800 50px Inter, Segoe UI, Arial, sans-serif"; g.textBaseline = "middle"; g.fillText("ALMACÉN · BEBIDAS · LIMPIEZA", 48, h / 2 - 4);
    g.fillStyle = "#9FF3F2"; g.font = "600 34px Inter, Segoe UI, Arial, sans-serif"; g.textAlign = "right"; g.fillText("Góndola simulada", w - 48, h / 2 - 4);
  });
  const cartel = pieza(new THREE.BoxGeometry(ANCHO + 0.38, 0.46, 0.12), [matBorde, matBorde, matBorde, matBorde, new THREE.MeshBasicMaterial({ map: texCartel, toneMapped: false }), matBorde], 0, ESTANTES * ALTO_E + 0.42, PROF / 2 - 0.05);
  mueble.add(cartel);
  // Estantes con frentes de precio
  const texRiel = lienzo(1024, 32, (g, w, h) => { g.fillStyle = "#0B2D4A"; g.fillRect(0, 0, w, h); for (let i = 0; i < POSICIONES; i++) { const x = (i + 0.5) * (w / POSICIONES); g.fillStyle = "#FFFFFF"; g.fillRect(x - 18, 5, 36, h - 10); g.fillStyle = "#0B2D4A"; g.fillRect(x - 12, 11, 24, 3); g.fillRect(x - 12, 17, 15, 3); } });
  for (let e = 0; e <= ESTANTES; e++) {
    const y = e * ALTO_E;
    mueble.add(pieza(new THREE.BoxGeometry(ANCHO + 0.1, 0.06, PROF), matMueble, 0, y, 0));
    if (e < ESTANTES) mueble.add(pieza(new THREE.BoxGeometry(ANCHO + 0.1, 0.13, 0.03), [matBorde, matBorde, matBorde, matBorde, new THREE.MeshStandardMaterial({ map: texRiel, roughness: 0.5 }), matBorde], 0, y + 0.02, PROF / 2, false));
  }
  escena.add(mueble);
  // Piso con baldosas y sombra de contacto
  const texPiso = lienzo(512, 512, (g, w, h) => { g.fillStyle = "#E6ECF2"; g.fillRect(0, 0, w, h); g.strokeStyle = "#D2DBE4"; g.lineWidth = 3; for (let k = 0; k <= w; k += 128) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, h); g.stroke(); g.beginPath(); g.moveTo(0, k); g.lineTo(w, k); g.stroke(); } });
  texPiso.wrapS = texPiso.wrapT = THREE.RepeatWrapping; texPiso.repeat.set(8, 8);
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ map: texPiso, roughness: 0.35, metalness: 0.1 }));
  piso.rotation.x = -Math.PI / 2; piso.position.y = -0.02; piso.receiveShadow = true; escena.add(piso);

  // Etiquetas de cada marca (frente del envase)
  const etiquetas = MARCAS.map((m, k) => lienzo(128, 256, (g, w, h) => {
    g.fillStyle = m.color; g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(255,255,255,.92)"; g.fillRect(0, h * 0.34, w, h * 0.3);
    g.fillStyle = m.color; g.font = "800 44px Inter, Segoe UI, Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(k === 0 ? "X" : k === 4 ? "•" : String.fromCharCode(64 + k), w / 2, h * 0.49);
    g.fillStyle = "rgba(255,255,255,.35)"; g.fillRect(0, h * 0.78, w, 10);
    const brillo = g.createLinearGradient(0, 0, w, 0); brillo.addColorStop(0, "rgba(255,255,255,.0)"); brillo.addColorStop(.35, "rgba(255,255,255,.22)"); brillo.addColorStop(.5, "rgba(255,255,255,0)"); g.fillStyle = brillo; g.fillRect(0, 0, w, h);
  }));
  const matsProducto = new Map();
  const matProd = (marca, destacado) => {
    const clave = marca + (destacado ? "d" : "n");
    if (!matsProducto.has(clave)) {
      const base = new THREE.Color(MARCAS.at(marca).color);
      matsProducto.set(clave, new THREE.MeshStandardMaterial({
        map: etiquetas.at(marca), roughness: 0.42, metalness: 0.05,
        color: destacado ? 0xffffff : 0xdfe6ec, emissive: destacado ? base : 0x000000, emissiveIntensity: destacado ? 0.18 : 0,
      }));
    }
    return matsProducto.get(clave);
  };
  // Formas de envase por estante: cajas arriba, botellas, latas, cajas grandes y bidones abajo
  const anchoEnv = paso * 0.84, hondo = PROF * 0.62;
  const GEO = {
    caja: new THREE.BoxGeometry(anchoEnv, 1, hondo * 0.7).translate(0, 0.5, 0),
    botella: new THREE.CylinderGeometry(anchoEnv * 0.36, anchoEnv * 0.42, 1, 24).translate(0, 0.5, 0),
    cuello: new THREE.CylinderGeometry(anchoEnv * 0.13, anchoEnv * 0.3, 0.3, 16).translate(0, 0.15, 0),
    tapa: new THREE.CylinderGeometry(anchoEnv * 0.14, anchoEnv * 0.14, 0.07, 16).translate(0, 0.035, 0),
    lata: new THREE.CylinderGeometry(anchoEnv * 0.42, anchoEnv * 0.42, 1, 28).translate(0, 0.5, 0),
  };
  const TIPO = ["caja", "botella", "lata", "caja", "botella"];
  const matTapa = new THREE.MeshStandardMaterial({ color: 0xf2f5f8, roughness: 0.3, metalness: 0.4 });

  const productos = new THREE.Group(); escena.add(productos);
  const quiebres = [];
  const geoVacio = new THREE.EdgesGeometry(new THREE.BoxGeometry(paso * 0.86, 0.55, PROF * 0.7));
  const geoAviso = new THREE.PlaneGeometry(paso * 0.86, 0.55);
  const geoZona = new THREE.BoxGeometry(paso * 0.98, ALTO_E - 0.08, PROF * 0.9);
  const matZona = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false });

  let semilla = 7, estantes = generar(semilla), marcaFoco = 0, seleccion = null;

  function envase(tipo, marca, alto, destacado, datos) {
    const g = new THREE.Group(); const mat = matProd(marca, destacado);
    const agregar = (geo, m, y, sy = 1) => { const x = new THREE.Mesh(geo, m); x.position.y = y; x.scale.y = sy; x.castShadow = true; x.receiveShadow = true; x.userData = datos; g.add(x); return x; };
    if (tipo === "botella") { const cuerpo = alto * 0.72; agregar(GEO.botella, mat, 0, cuerpo); agregar(GEO.cuello, mat, cuerpo, alto * 0.85); agregar(GEO.tapa, matTapa, cuerpo + 0.3 * alto * 0.85); }
    else if (tipo === "lata") { const h = Math.min(0.62, alto * 0.78); agregar(GEO.lata, mat, 0, h * 0.5); agregar(GEO.lata, mat, h * 0.5 + 0.01, h * 0.5); }
    else agregar(GEO.caja, mat, 0, alto);
    return g;
  }

  function construir() {
    productos.clear(); quiebres.length = 0;
    estantes.forEach((fila, e) => {
      const yBase = (ESTANTES - 1 - e) * ALTO_E + 0.03; // e = 0 es el estante de arriba
      const tipo = TIPO.at(e);
      fila.forEach((p, i) => {
        const x = -ANCHO / 2 + paso * (i + 0.5);
        // zona de clic invisible que cubre toda la posición del estante
        const zona = new THREE.Mesh(geoZona, matZona);
        zona.position.set(x, yBase + (ALTO_E - 0.08) / 2, 0.05);
        zona.userData = { zona: true, e, i, sku: p.sku, marca: MARCAS.at(p.marca).nombre, vacio: !!p.vacio };
        productos.add(zona);
        if (p.vacio) {
          const l = new THREE.LineSegments(geoVacio, new THREE.LineBasicMaterial({ color: 0xd9342b, transparent: true }));
          l.position.set(x, yBase + 0.275, 0.1); l.userData = { vacio: true, e, i, sku: p.sku }; l.visible = chkVacios.checked;
          const aviso = new THREE.Mesh(geoAviso, new THREE.MeshBasicMaterial({ color: 0xff4d3d, transparent: true, opacity: 0.12, depthWrite: false }));
          aviso.position.set(x, yBase + 0.275, PROF * 0.38); aviso.userData = { vacio: true, e, i, sku: p.sku, marca: MARCAS.at(p.marca).nombre }; aviso.visible = chkVacios.checked;
          productos.add(l, aviso); quiebres.push({ l, aviso, x, sku: p.sku }); return;
        }
        const destacado = p.marca === marcaFoco;
        const datos = { marca: MARCAS.at(p.marca).nombre, e, i, destacado, sku: p.sku };
        // dos frentes de fondo, como en una góndola real
        [0.16, -0.2].forEach((z, k) => {
          const g = envase(tipo, p.marca, p.alto * (k ? 0.97 : 1), destacado, datos);
          g.position.set(x, yBase, z);
          g.userData = { ...datos, z0: z, alto: p.alto };
          productos.add(g);
        });
      });
    });
    actualizarPanel();
    llenarListaSku();
    if (seleccion && !estantes.some((f) => f.some((p) => p.sku === seleccion))) seleccion = null;
    mostrarSeleccion();
  }

  // Haz de escaneo que recorre la góndola (auditoría simulada)
  const haz = new THREE.Mesh(new THREE.PlaneGeometry(0.5, ESTANTES * ALTO_E + 0.3), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color(0x00c2c7) } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: "varying vec2 vUv; uniform vec3 uColor; void main(){ float a = pow(1.0 - abs(vUv.x - 0.5) * 2.0, 3.0) * 0.55; gl_FragColor = vec4(uColor, a); }",
  }));
  haz.position.set(-ANCHO / 2, (ESTANTES * ALTO_E) / 2, PROF / 2 + 0.06); escena.add(haz);
  const lineaHaz = new THREE.Mesh(new THREE.PlaneGeometry(0.025, ESTANTES * ALTO_E + 0.3), new THREE.MeshBasicMaterial({ color: 0x5fe3ff, transparent: true, opacity: 0.9 }));
  haz.add(lineaHaz);

  // ---------- Selección de SKU ----------
  const panelSel = raiz.querySelector("#g-sel"), listaSku = raiz.querySelector("#g-sku");
  const capa = raiz.querySelector(".gondola-capa");
  const flotShare = capa.querySelector('[data-flot="share"]'), flotOsa = capa.querySelector('[data-flot="osa"]'), flotSku = capa.querySelector('[data-flot="sku"]');
  function llenarListaSku() {
    const vistos = new Map();
    estantes.forEach((f) => f.forEach((p) => { if (!vistos.has(p.sku)) vistos.set(p.sku, p.marca); }));
    listaSku.innerHTML = '<option value="">Elegir un producto…</option>' + [...vistos.entries()].sort().map(([k, m]) => `<option value="${k}">${k} · ${MARCAS.at(m).nombre}</option>`).join("");
    listaSku.value = seleccion || "";
  }
  function seleccionar(sku) {
    seleccion = sku || null;
    if (seleccion) {
      const d = detalleSku(estantes, seleccion);
      if (d.marca !== marcaFoco && d.marca < 4) { marcaFoco = d.marca; sel.value = String(d.marca); construir(); return; }
    }
    mostrarSeleccion();
  }
  function mostrarSeleccion() {
    listaSku.value = seleccion || "";
    productos.children.forEach((o) => {
      if (!o.isGroup) return;
      const es = seleccion && o.userData.sku === seleccion;
      o.userData.objetivo = es ? 0.22 : 0;
      o.children.forEach((m) => { m.material = es ? matSel(m.material) : (m.material.userData.base || m.material); });
    });
    if (!seleccion) { panelSel.hidden = true; flotSku.hidden = true; pedir(); return; }
    const d = detalleSku(estantes, seleccion);
    const m = MARCAS.at(d.marca);
    panelSel.hidden = false;
    panelSel.querySelector("[data-s=sku]").textContent = d.sku;
    panelSel.querySelector("[data-s=marca]").textContent = m.nombre;
    panelSel.querySelector("[data-s=cat]").textContent = CATEGORIAS.at(d.estante);
    panelSel.querySelector("[data-s=pos]").textContent = `Estante ${d.estante + 1} · posiciones ${d.desde + 1} a ${d.hasta + 1}`;
    panelSel.querySelector("[data-s=frentes]").textContent = `${d.frentes} de ${d.plan}`;
    panelSel.querySelector("[data-s=osa]").textContent = fmt(d.osa);
    const est = panelSel.querySelector("[data-s=estado]");
    est.textContent = d.osa === 1 ? "Disponible: todos los frentes con producto" : `Quiebre: faltan ${d.plan - d.frentes} ${d.plan - d.frentes === 1 ? "frente" : "frentes"}`;
    est.className = "gsel__estado " + (d.osa === 1 ? "gsel__estado--ok" : "gsel__estado--alerta");
    flotSku.querySelector("b").textContent = d.sku;
    flotSku.querySelector("span").textContent = `${d.frentes}/${d.plan} frentes · ${fmt(d.osa)}`;
    flotSku.classList.toggle("gflot--alerta", d.osa < 1);
    flotSku.hidden = false;
    pedir();
  }
  const matsSel = new Map();
  function matSel(base) {
    if (base.userData.base) base = base.userData.base;
    if (!matsSel.has(base)) { const m = base.clone(); m.emissive = new THREE.Color(0x00c2c7); m.emissiveIntensity = 0.55; m.userData = { base }; matsSel.set(base, m); }
    return matsSel.get(base);
  }
  listaSku.addEventListener("change", () => seleccionar(listaSku.value));
  panelSel.querySelector("[data-cerrar]").addEventListener("click", () => seleccionar(null));

  // ---------- Indicadores flotantes anclados a la góndola ----------
  const proy = new THREE.Vector3();
  const anclar = (el, x, y, z, alinear = 0) => {
    proy.set(x, y, z).project(camara);
    const visible = proy.z < 1;
    // alinear: 0 = a la izquierda del punto, 1 = a la derecha, 0.5 = centrado; se mantiene dentro del lienzo
    const w = el.offsetWidth, h = el.offsetHeight;
    const px = Math.min(ancho - w - 8, Math.max(8, (proy.x + 1) / 2 * ancho - w * alinear));
    const py = Math.min(alto - h - 8, Math.max(8, (1 - proy.y) / 2 * alto - h / 2));
    el.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px)`;
    el.style.opacity = visible ? "" : "0";
  };
  function moverFlotantes() {
    anclar(flotShare, -ANCHO / 2 - 0.25, ESTANTES * ALTO_E - 0.55, PROF / 2 + 0.3, 0);
    anclar(flotOsa, ANCHO / 2 + 0.25, ESTANTES * ALTO_E - 0.55, PROF / 2 + 0.3, 1);
    if (seleccion) {
      const d = detalleSku(estantes, seleccion);
      const x = -ANCHO / 2 + paso * ((d.desde + d.hasta) / 2 + 0.5), y = (ESTANTES - 1 - d.estante) * ALTO_E + 1.05;
      anclar(flotSku, x, y + 0.35, PROF / 2 + 0.25, 0.5);
    }
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
    flotShare.querySelector("b").textContent = fmt(k.share);
    flotShare.querySelector("span").textContent = `Share of shelf · ${nombre}`;
    flotOsa.querySelector("b").textContent = fmt(k.osa);
    flotOsa.querySelector("span").textContent = `Disponibilidad (OSA) · ${nombre}: ${fmt(k.osaMarca)}`;
    flotOsa.classList.toggle("gflot--alerta", k.osa < 0.92);
    const filas = MARCAS.map((m, i) => ({ ...m, i, share: k.porMarca.at(i) / k.ocupados })).sort((a, b) => b.share - a.share);
    const max = filas[0].share;
    raiz.querySelector("#g-grafico").innerHTML = `<p class="demo__grafico-titulo">Share of shelf por marca</p>` + filas.map((f) =>
      `<div class="barra${f.i === marcaFoco ? " barra--foco" : ""}"><span class="barra__nombre">${f.nombre}</span><span class="barra__pista"><span class="barra__valor" style="width:${(f.share / max) * 100}%;background:${f.color}"></span></span><span class="barra__num">${fmt(f.share)}</span></div>`).join("");
  }

  // Cámara: giro por arrastre y leve vaivén automático (4D)
  let amp = 0, azim = -0.25, elev = 0.12, arrastre = null, ancho = 1, alto = 1, quieto = performance.now(), zoom = 1, zoomObj = 1;
  const punteros = new Map(); let pinza = null;
  const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function ajustar() {
    const r = cont.getBoundingClientRect(); ancho = Math.max(1, r.width); alto = Math.max(1, r.height);
    renderer.setSize(ancho, alto, false); camara.aspect = ancho / alto; camara.updateProjectionMatrix(); pedir();
  }
  function colocarCamara(t) {
    zoom += (zoomObj - zoom) * 0.18;
    const dist = (camara.aspect < 1 ? 23 : 14.6) / zoom;
    const libre = !arrastre && !reducido && !seleccion && t - quieto > 2500;
    amp += ((libre ? 1 : 0) - amp) * 0.02;
    const va = Math.sin(t / 2600) * 0.16 * amp, ve = Math.sin(t / 3700) * 0.04 * amp;
    camara.position.set(Math.sin(azim + va) * dist, 3 + Math.sin(elev + ve) * dist, Math.cos(azim + va) * dist);
    camara.lookAt(0, (ESTANTES * ALTO_E) / 2 + 0.15, 0);
  }
  const fijarZoom = (z) => { zoomObj = Math.min(2.4, Math.max(0.85, z)); quieto = performance.now(); pedir(); };
  cont.addEventListener("wheel", (e) => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); fijarZoom(zoomObj * (e.deltaY < 0 ? 1.12 : 1 / 1.12)); }, { passive: false });
  raiz.querySelector("[data-zoom=mas]").addEventListener("click", () => fijarZoom(zoomObj * 1.25));
  raiz.querySelector("[data-zoom=menos]").addEventListener("click", () => fijarZoom(zoomObj / 1.25));
  raiz.querySelector("[data-zoom=centro]").addEventListener("click", () => { azim = -0.25; elev = 0.12; fijarZoom(1); });
  let visible = true, corriendo = false;
  new IntersectionObserver((e) => { visible = e[0].isIntersecting; if (visible) pedir(); }).observe(cont);
  function cuadro(t) {
    corriendo = false;
    colocarCamara(t);
    // el haz cruza la góndola cada 6 segundos; los quiebres laten al ser detectados
    const u = reducido ? 1.2 : ((t / 6000) % 1) * 1.25 - 0.1;
    const xh = -ANCHO / 2 + u * ANCHO;
    haz.visible = !reducido && u >= 0 && u <= 1;
    haz.position.x = xh;
    quiebres.forEach((q) => {
      const detectado = xh >= q.x;
      const latido = detectado ? 0.5 + 0.5 * Math.sin(t / 180) : 0;
      q.aviso.material.opacity = detectado ? 0.12 + latido * 0.28 : 0.08;
      q.l.material.opacity = detectado ? 0.6 + latido * 0.4 : 0.5;
    });
    let moviendo = Math.abs(zoomObj - zoom) > 0.002;
    productos.children.forEach((o) => {
      if (!o.isGroup) return;
      const obj = o.userData.objetivo || 0, z = o.position.z - o.userData.z0;
      if (Math.abs(obj - z) > 0.002) { o.position.z += (obj - z) * 0.2; moviendo = true; }
      if (obj && !reducido) o.position.y = (ESTANTES - 1 - o.userData.e) * ALTO_E + 0.03 + Math.abs(Math.sin(t / 260)) * 0.04;
      else o.position.y = (ESTANTES - 1 - o.userData.e) * ALTO_E + 0.03;
    });
    renderer.render(escena, camara);
    moverFlotantes();
    if (visible && (!reducido || moviendo)) pedir();
  }
  function pedir() { if (!corriendo) { corriendo = true; requestAnimationFrame(cuadro); } }
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  function tocar(e) {
    const r = cont.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camara);
    const hit = ray.intersectObjects(productos.children.filter((o) => o.userData.zona), false)[0];
    return hit ? hit.object.userData : null;
  }
  cont.addEventListener("pointerdown", (e) => {
    punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    cont.setPointerCapture(e.pointerId); quieto = performance.now();
    if (punteros.size === 2) { const [a, b] = [...punteros.values()]; pinza = { d: Math.hypot(a.x - b.x, a.y - b.y), z: zoomObj }; arrastre = null; return; }
    arrastre = { x: e.clientX, y: e.clientY, a: azim, el: elev, movio: false, hit: tocar(e) };
  });
  const soltar = (e) => {
    const fue = arrastre;
    punteros.delete(e.pointerId); if (punteros.size < 2) pinza = null;
    if (fue && !fue.movio && e.type === "pointerup") { const d = fue.hit; seleccionar(d && d.sku !== seleccion ? d.sku : null); }
    arrastre = null; quieto = performance.now();
  };
  cont.addEventListener("pointerup", soltar);
  cont.addEventListener("pointercancel", soltar);
  cont.addEventListener("pointermove", (e) => {
    if (punteros.has(e.pointerId)) punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinza && punteros.size === 2) { const [a, b] = [...punteros.values()]; fijarZoom(pinza.z * Math.hypot(a.x - b.x, a.y - b.y) / pinza.d); return; }
    if (arrastre) {
      if (Math.hypot(e.clientX - arrastre.x, e.clientY - arrastre.y) > 5) arrastre.movio = true;
      if (arrastre.movio) {
        azim = Math.max(-0.9, Math.min(0.9, arrastre.a + (e.clientX - arrastre.x) * 0.006));
        elev = Math.max(-0.05, Math.min(0.5, arrastre.el + (e.clientY - arrastre.y) * 0.004));
        tip.hidden = true; pedir(); return;
      }
    }
    const d = tocar(e);
    cont.style.cursor = d ? "pointer" : "";
    if (d) {
      const r = cont.getBoundingClientRect();
      tip.textContent = d.vacio ? `Quiebre · ${d.sku} · estante ${d.e + 1}, posición ${d.i + 1}` : `${d.sku} · ${d.marca} · estante ${d.e + 1}, posición ${d.i + 1} · clic para ver detalle`;
      tip.style.transform = `translate(${e.clientX - r.left + 12}px, ${e.clientY - r.top + 12}px)`;
      tip.hidden = false;
    } else tip.hidden = true;
  });
  cont.addEventListener("pointerleave", () => (tip.hidden = true));

  sel.addEventListener("change", () => { marcaFoco = Number(sel.value); seleccion = null; construir(); pedir(); });
  chkVacios.addEventListener("change", () => { productos.children.forEach((o) => { if (o.userData.vacio && !o.userData.zona) o.visible = chkVacios.checked; }); pedir(); });
  raiz.querySelector("#g-nueva").addEventListener("click", () => { semilla += 1; estantes = generar(semilla); seleccion = null; construir(); pedir(); });

  new ResizeObserver(ajustar).observe(cont);
  ajustar(); construir(); pedir();
  window.__demoListo = true;
}

if (raiz) iniciar();
export { MARCAS, ESTANTES, POSICIONES };
