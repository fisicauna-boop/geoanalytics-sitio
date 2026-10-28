// Simulador de costos de estudios.
// Precio de honorarios = costo operativo / (1 − margen). El margen de cada tipo se mantiene entre
// margen_min y margen_max (50–70 %). El costo de campo baja por tramos de volumen (economía de escala)
// y los costos fijos se reparten entre más unidades. Los gastos de viaje fuera de Asunción y
// Gran Asunción se suman aparte, al costo (más margen_gastos_viaje, por defecto 0).

export function costoCampo(tipo, n) {
  // Suma por tramos: cada tramo aplica su factor solo a las unidades que caen dentro de él
  const tramos = [...tipo.escala].sort((a, b) => a.desde - b.desde);
  let total = 0;
  tramos.forEach((t, i) => {
    const desde = t.desde, hasta = i + 1 < tramos.length ? tramos[i + 1].desde - 1 : Infinity;
    const u = Math.max(0, Math.min(n, hasta) - desde + 1);
    total += u * tipo.costo_unitario * t.factor;
  });
  return total;
}

// Total con IVA de un estudio de n unidades (para buscar cuánto alcanza un presupuesto)
export const totalConIva = (cfg, tipo, n, pf, dist) => calcular(cfg, tipo, n, pf, dist).total;

// Mayor cantidad (múltiplo del paso del tipo) cuyo total con IVA no supera el presupuesto.
// Devuelve { n, estado }: "ok", "insuficiente" (no alcanza el mínimo) o "excede" (alcanza más que el máximo).
export function cuantoAlcanza(cfg, tipo, presupuesto, pf = 0, dist = "cerca") {
  const min = tipo.cantidad_min, max = tipo.cantidad_max, paso = tipo.paso || 1;
  if (totalConIva(cfg, tipo, min, pf, dist) > presupuesto) return { n: 0, estado: "insuficiente" };
  if (totalConIva(cfg, tipo, max, pf, dist) <= presupuesto) return { n: max, estado: "excede" };
  let lo = min, hi = max; // el total crece con n: búsqueda binaria
  while (hi - lo > 1) { const mid = Math.floor((lo + hi) / 2); if (totalConIva(cfg, tipo, mid, pf, dist) <= presupuesto) lo = mid; else hi = mid; }
  const n = Math.max(min, Math.floor((lo - min) / paso) * paso + min);
  return { n, estado: "ok" };
}

// Margen de error (puntos porcentuales) para una proporción del 50 % con muestreo aleatorio simple
export const margenError = (n, z = 1.96) => (n > 0 ? z * Math.sqrt(0.25 / n) * 100 : 0);

export function calcular(cfg, tipo, n, pctFuera = 0, distanciaId = "cerca") {
  const m = Math.min(cfg.margen_max, Math.max(cfg.margen_min, Number(tipo.margen)));
  const campo = costoCampo(tipo, n);
  const costo = { diseno: tipo.costo_diseno, campo, analisis: tipo.costo_analisis };
  costo.total = costo.diseno + costo.campo + costo.analisis;

  // Gastos fuera de Asunción y Gran Asunción
  const v = cfg.viaje, dist = v.distancias.find((d) => d.id === distanciaId) || v.distancias[0];
  const unidadesFuera = Math.round(n * pctFuera);
  const diasPersona = unidadesFuera > 0 ? Math.ceil(unidadesFuera / tipo.productividad_dia) : 0;
  const diasCampo = diasPersona > 0 ? Math.ceil(diasPersona / tipo.equipo) : 0;
  const viajes = diasCampo > 0 ? Math.ceil(diasCampo / v.dias_por_viaje) : 0;
  const viaje = {
    unidadesFuera, diasPersona, diasCampo, viajes, distancia: dist,
    viaticos: diasPersona * v.viatico_dia,
    hotel: dist.pernocte ? diasPersona * v.hotel_noche : 0,
    transporte: viajes * dist.km * 2 * v.costo_km,
  };
  viaje.total = (viaje.viaticos + viaje.hotel + viaje.transporte) * (1 + (cfg.margen_gastos_viaje || 0));

  const f = 1 / (1 - m);
  const honorarios = { diseno: costo.diseno * f, campo: costo.campo * f, analisis: costo.analisis * f };
  honorarios.total = costo.total * f;
  const subtotal = honorarios.total + viaje.total;
  const iva = subtotal * cfg.iva;
  return {
    margen: m, costo, honorarios, viaje, subtotal, iva, total: subtotal + iva,
    ganancia: honorarios.total - costo.total,
    precioUnidad: honorarios.total / n,
    rango: [subtotal * (1 - cfg.rango_referencial), subtotal * (1 + cfg.rango_referencial)],
  };
}

// ---------------- Interfaz ----------------
const raiz = typeof document !== "undefined" ? document.querySelector("[data-simulador]") : null;
if (raiz) {
  const cfg = JSON.parse(document.getElementById("simulador-config").textContent);
  const interno = raiz.dataset.modo === "interno";
  const $ = (s) => raiz.querySelector(s);
  const red = (x) => Math.round(x / cfg.redondeo) * cfg.redondeo;
  const fmt = (x, redondear = true) => `${cfg.moneda} ${new Intl.NumberFormat("es-PY", { maximumFractionDigits: redondear ? 0 : 2, minimumFractionDigits: redondear ? 0 : 2 }).format(redondear ? red(x) : x)}`;
  const pct = (x) => `${Math.round(x * 100)} %`;
  const n0 = new Intl.NumberFormat("es-PY");
  const dec1 = (x) => x.toFixed(1).replace(".", ",");

  const baseContacto = $("#r-cotizar").getAttribute("href").split("?")[0];
  const tipoSel = () => cfg.tipos.find((t) => t.id === raiz.querySelector('input[name="tipo"]:checked')?.value) || cfg.tipos[0];
  const modoSel = () => raiz.querySelector('input[name="calculo"]:checked')?.value || "presupuesto";
  const rango = $("#s-cantidad"), num = $("#s-cantidad-num"), fuera = $("#s-fuera"), dist = $("#s-distancia"), presu = $("#s-presupuesto");
  let ultimo = null; // última simulación, para el envío y el resumen

  function configurarCantidad(t, valor) {
    [rango, num].forEach((el) => { el.min = t.cantidad_min; el.max = t.cantidad_max; el.step = t.paso; el.value = valor ?? t.cantidad_inicial; });
    raiz.querySelectorAll("[data-unidades]").forEach((e) => (e.textContent = t.unidades));
  }

  function grafico(t, n) {
    const W = Math.max(280, Math.round($("#r-grafico").clientWidth || 520)), H = Math.round(Math.min(220, Math.max(170, W * 0.42))), ml = 46, mr = 12, mt = 16, mb = 34;
    const xs = [], pasos = 48;
    const lmin = Math.log(t.cantidad_min), lmax = Math.log(t.cantidad_max);
    for (let i = 0; i <= pasos; i++) xs.push(Math.round(Math.exp(lmin + (lmax - lmin) * i / pasos)));
    const pts = [...new Set(xs)].map((x) => [x, calcular(cfg, t, Math.max(1, x)).precioUnidad]);
    const yMax = pts[0][1] * 1.05, yMin = 0;
    const X = (x) => ml + (Math.log(x) - lmin) / ((lmax - lmin) || 1) * (W - ml - mr);
    const Y = (y) => mt + (1 - (y - yMin) / (yMax - yMin)) * (H - mt - mb);
    const linea = pts.map(([x, y], i) => `${i ? "L" : "M"}${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join("");
    const area = `${linea}L${X(pts.at(-1)[0]).toFixed(1)},${Y(0)}L${X(pts[0][0]).toFixed(1)},${Y(0)}Z`;
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((k) => yMax * k);
    const xTicks = [t.cantidad_min, Math.round(Math.exp((lmin + lmax) / 2)), t.cantidad_max];
    const nn = Math.max(t.cantidad_min, n);
    const actual = calcular(cfg, t, nn).precioUnidad;
    const cx = X(nn), cy = Y(actual);
    const etiqueta = fmt(actual, actual >= 100);
    const alinear = cx > W - 140 ? "end" : "start", dx = cx > W - 140 ? -10 : 10;
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Precio por ${t.unidad} según la cantidad de ${t.unidades}">
      ${yTicks.map((y) => `<line x1="${ml}" x2="${W - mr}" y1="${Y(y).toFixed(1)}" y2="${Y(y).toFixed(1)}" class="g-grilla"/><text x="${ml - 8}" y="${(Y(y) + 4).toFixed(1)}" text-anchor="end" class="g-texto">${y < 100 && y > 0 ? dec1(y) : Math.round(y)}</text>`).join("")}
      ${xTicks.map((x) => `<text x="${X(x).toFixed(1)}" y="${H - 12}" text-anchor="middle" class="g-texto">${n0.format(x)}</text>`).join("")}
      <path d="${area}" class="g-area"/><path d="${linea}" class="g-linea"/>
      <line x1="${cx.toFixed(1)}" x2="${cx.toFixed(1)}" y1="${cy.toFixed(1)}" y2="${Y(0)}" class="g-guia"/>
      <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="5.5" class="g-punto"/>
      <text x="${(cx + dx).toFixed(1)}" y="${(cy - 10).toFixed(1)}" text-anchor="${alinear}" class="g-valor">${etiqueta}</text>
      <text x="${ml}" y="${H - 0}" class="g-eje">${t.unidades} →</text>
    </svg>`;
  }

  function desglose(r) {
    $("#r-diseno").textContent = fmt(r.honorarios.diseno);
    $("#r-campo").textContent = fmt(r.honorarios.campo);
    $("#r-analisis").textContent = fmt(r.honorarios.analisis);
    $("#r-viaje").textContent = r.viaje.total ? fmt(r.viaje.total) : "No aplica";
    $("#r-viaje-detalle").textContent = r.viaje.total
      ? `${r.viaje.diasPersona} días-persona de campo, ${r.viaje.viajes} ${r.viaje.viajes === 1 ? "viaje" : "viajes"}${r.viaje.distancia.pernocte ? ", con hotel" : ""}`
      : "Todo el campo en Asunción y Gran Asunción";
    $("#r-subtotal").textContent = fmt(r.subtotal);
    $("#r-iva").textContent = fmt(r.iva);
    $("#r-con-iva").textContent = fmt(r.total);
  }

  function actualizar() {
    const t = tipoSel(), modo = modoSel();
    const pf = Number(fuera.value) / 100, dId = dist.value;
    $("#s-fuera-valor").textContent = `${Math.round(pf * 100)} %`;
    $("#s-distancia-campo").hidden = pf === 0;
    raiz.querySelectorAll("[data-entrada]").forEach((el) => (el.hidden = el.dataset.entrada !== modo));
    const lugar = pf > 0 ? `${Math.round(pf * 100)} % del campo fuera de Asunción y Gran Asunción (${((t) => t.charAt(0).toLowerCase() + t.slice(1))(dist.selectedOptions[0].text)})` : "campo en Asunción y Gran Asunción";

    let n, r, presupuesto = null, estado = "ok";
    if (modo === "presupuesto") {
      presupuesto = Math.max(0, Number(presu.value) || 0);
      const res = cuantoAlcanza(cfg, t, presupuesto, pf, dId);
      estado = res.estado;
      n = res.estado === "insuficiente" ? t.cantidad_min : res.n;
      r = calcular(cfg, t, n, pf, dId);
      $("#r-titulo").textContent = estado === "insuficiente" ? "Con ese presupuesto" : "Le alcanza para aproximadamente";
      if (estado === "insuficiente") {
        $("#r-total").textContent = "No alcanza el mínimo";
        $("#r-rango").textContent = `El estudio más chico (${n0.format(t.cantidad_min)} ${t.unidades}) cuesta unos ${fmt(r.total)} con IVA.`;
      } else {
        $("#r-total").textContent = `${n0.format(n)} ${t.unidades}`;
        if (estado === "excede") $("#r-rango").textContent = `Su presupuesto cubre más que el máximo de este simulador. Pida una cotización a medida.`;
        else {
          const bajo = cuantoAlcanza(cfg, t, presupuesto * (1 - cfg.rango_referencial), pf, dId), alto = cuantoAlcanza(cfg, t, presupuesto * (1 + cfg.rango_referencial), pf, dId);
          $("#r-rango").textContent = `Entre ${n0.format(bajo.n || t.cantidad_min)} y ${n0.format(alto.n)} ${t.unidades} según el alcance final, con ${lugar}.`;
        }
      }
      $("#r-desglose-titulo").textContent = `Costo estimado de ${n0.format(n)} ${t.unidades}`;
      $("#r-barra-etiqueta").textContent = "Le alcanza para";
      $("#r-barra-total").textContent = estado === "insuficiente" ? "—" : `${n0.format(n)} ${t.unidades}`;
    } else {
      n = Math.min(t.cantidad_max, Math.max(t.cantidad_min, Math.round(Number(num.value) || t.cantidad_inicial)));
      r = calcular(cfg, t, n, pf, dId);
      $("#r-titulo").textContent = "Precio referencial";
      $("#r-total").textContent = fmt(r.subtotal);
      $("#r-rango").textContent = `Entre ${fmt(r.rango[0])} y ${fmt(r.rango[1])} más IVA, con ${lugar}.`;
      $("#r-desglose-titulo").textContent = `Desglose para ${n0.format(n)} ${t.unidades}`;
      $("#r-barra-etiqueta").textContent = "Precio referencial";
      $("#r-barra-total").textContent = `${fmt(r.subtotal)} más IVA`;
    }
    desglose(r);

    const prec = $("#r-precision");
    const me = t.muestreo && estado !== "insuficiente" ? margenError(n, cfg.confianza_z) : 0;
    prec.hidden = !me;
    if (me) prec.textContent = `Con ${n0.format(n)} ${t.unidades} elegidos al azar, el margen de error es de ±${dec1(me)} puntos con 95 % de confianza.`;

    const base = calcular(cfg, t, t.cantidad_min);
    $("#r-unidad").textContent = fmt(r.precioUnidad, r.precioUnidad >= 100);
    $("#r-unidad-nombre").textContent = t.unidad;
    const ahorro = 1 - r.precioUnidad / base.precioUnidad;
    $("#r-escala").textContent = n > t.cantidad_min && ahorro > 0.005
      ? `${pct(ahorro)} menos por ${t.unidad} que con ${n0.format(t.cantidad_min)} ${t.unidades}`
      : `Con más ${t.unidades}, el precio por ${t.unidad} baja`;
    $("#r-grafico").innerHTML = grafico(t, n);

    if (interno) {
      $("#i-costo").textContent = fmt(r.costo.total, false);
      $("#i-costo-detalle").textContent = `Diseño ${fmt(r.costo.diseno, false)} · Campo ${fmt(r.costo.campo, false)} · Análisis ${fmt(r.costo.analisis, false)}`;
      $("#i-margen").textContent = pct(r.margen);
      $("#i-ganancia").textContent = fmt(r.ganancia, false);
      $("#i-proporcion").textContent = `El costo operativo es el ${pct(r.costo.total / r.honorarios.total)} del precio de honorarios`;
      $("#i-viaje").textContent = `Viáticos ${fmt(r.viaje.viaticos, false)} · Hotel ${fmt(r.viaje.hotel, false)} · Transporte ${fmt(r.viaje.transporte, false)} (${r.viaje.distancia.km} km × 2 × ${r.viaje.viajes})`;
      $("#i-campo").textContent = `${n0.format(r.viaje.unidadesFuera)} ${t.unidades} fuera de A y GA · ${r.viaje.diasCampo} días de campo con equipo de ${t.equipo}`;
      $("#i-unitario").textContent = `Costo de campo: ${fmt(r.costo.campo / n, false)} por ${t.unidad} (base ${fmt(t.costo_unitario, false)})`;
    }

    ultimo = {
      estudio: t.nombre, calculo: modo === "presupuesto" ? "¿Cuánto me alcanza?" : "¿Cuánto cuesta?",
      presupuesto_con_iva: presupuesto != null ? `${cfg.moneda} ${n0.format(presupuesto)}` : "",
      cantidad: estado === "insuficiente" ? `No alcanza el mínimo (${t.cantidad_min} ${t.unidades})` : `${n0.format(n)} ${t.unidades}`,
      lugar, precio_sin_iva: fmt(r.subtotal), iva: fmt(r.iva), precio_con_iva: fmt(r.total),
      margen_error: me ? `±${dec1(me)} puntos (95 %)` : "",
    };
    const detalle = `Simulación: ${t.nombre}, ${ultimo.cantidad}, ${lugar}. ` +
      (presupuesto != null ? `Presupuesto indicado: ${ultimo.presupuesto_con_iva} con IVA. ` : "") +
      `Precio referencial: ${ultimo.precio_sin_iva} más IVA (${ultimo.precio_con_iva} con IVA).`;
    ultimo.resumen = detalle;
    $("#r-cotizar").href = `${baseContacto}?tema=simulador&detalle=${encodeURIComponent(detalle)}`;
  }

  // ---------- Envío de la cotización (Web3Forms y, opcionalmente, Google Sheets) ----------
  const envio = $("#sim-envio"), btnPedir = $("#r-pedir"), estadoEnvio = $("#e-estado");
  btnPedir.addEventListener("click", () => {
    envio.hidden = !envio.hidden;
    btnPedir.setAttribute("aria-expanded", String(!envio.hidden));
    if (!envio.hidden) envio.querySelector("input").focus();
  });
  const idCotizacion = () => {
    const d = new Date(), p = (x) => String(x).padStart(2, "0");
    return `COT-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${Math.floor(1000 + Math.random() * 9000)}`;
  };
  envio.addEventListener("submit", async (e) => {
    e.preventDefault();
    const clave = envio.dataset.web3forms, hoja = envio.dataset.sheets;
    if (!clave && !hoja) {
      estadoEnvio.className = "formulario__estado error";
      estadoEnvio.textContent = "El envío todavía no está activado: falta la clave de Web3Forms en la configuración del sitio. Mientras tanto, use «Copiar el resumen» o el formulario completo.";
      return;
    }
    const f = Object.fromEntries(new FormData(envio));
    if (f.botcheck) return;
    delete f.botcheck;
    const id = idCotizacion();
    const datos = { formulario: "Simulador de costos", cotizacion: id, ...f, ...ultimo };
    const boton = envio.querySelector('button[type="submit"]');
    boton.disabled = true;
    estadoEnvio.className = "formulario__estado";
    estadoEnvio.textContent = "Enviando…";
    try {
      const tareas = [];
      if (clave) tareas.push(fetch("https://api.web3forms.com/submit", {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ access_key: clave, subject: `${envio.dataset.asunto} ${id}: ${ultimo.estudio}`, from_name: "Simulador Geoanalytics", ...datos }),
      }).then((r) => r.json()).then((j) => { if (!j.success) throw new Error(j.message); }));
      if (hoja) tareas.push(fetch(hoja, { method: "POST", mode: "no-cors", body: new URLSearchParams(datos) }));
      await Promise.all(tareas);
      envio.reset();
      estadoEnvio.className = "formulario__estado ok";
      estadoEnvio.textContent = `Solicitud enviada con el número ${id}. Le responderemos al correo indicado.`;
    } catch {
      estadoEnvio.className = "formulario__estado error";
      estadoEnvio.textContent = "La solicitud no se envió. Revise su conexión e intente de nuevo.";
    } finally { boton.disabled = false; }
  });

  $("#r-copiar").addEventListener("click", async (e) => {
    const b = e.currentTarget, txt = b.textContent;
    try { await navigator.clipboard.writeText(`Geoanalytics: ${ultimo.resumen}`); b.textContent = "Resumen copiado"; }
    catch { b.textContent = "No se pudo copiar"; }
    setTimeout(() => (b.textContent = txt), 2200);
  });

  raiz.querySelectorAll('input[name="tipo"]').forEach((el) => el.addEventListener("change", () => { configurarCantidad(tipoSel()); actualizar(); }));
  raiz.querySelectorAll('input[name="calculo"]').forEach((el) => el.addEventListener("change", actualizar));
  rango.addEventListener("input", () => { num.value = rango.value; actualizar(); });
  num.addEventListener("input", () => { rango.value = num.value; actualizar(); });
  num.addEventListener("change", () => { const t = tipoSel(); num.value = Math.min(t.cantidad_max, Math.max(t.cantidad_min, Number(num.value) || t.cantidad_inicial)); rango.value = num.value; actualizar(); });
  [fuera, dist, presu].forEach((el) => el.addEventListener("input", actualizar));
  // ?tipo=customer (desde las páginas de soluciones) preselecciona el estudio
  const tipoUrl = new URLSearchParams(location.search).get("tipo");
  const radioUrl = tipoUrl && raiz.querySelector(`input[name="tipo"][value="${CSS.escape(tipoUrl)}"]`);
  if (radioUrl) radioUrl.checked = true;
  configurarCantidad(tipoSel());
  actualizar();
  new ResizeObserver(() => { if (ultimo) $("#r-grafico").innerHTML = grafico(tipoSel(), Math.max(tipoSel().cantidad_min, parseInt(String(ultimo.cantidad).replace(/\D/g, ""), 10) || tipoSel().cantidad_min)); }).observe($("#r-grafico"));

  // Barra de resultado en teléfonos: visible mientras el resultado no está en pantalla
  const barra = $(".sim-barra"), resultado = $(".simulador__resultado");
  if (barra && "IntersectionObserver" in window) {
    new IntersectionObserver(([en]) => { barra.hidden = en.isIntersecting; }, { threshold: 0.15 }).observe(resultado);
    barra.querySelector("button").addEventListener("click", () => resultado.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
}
