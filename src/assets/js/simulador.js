// Estimador de inversión en estudios.
// El escenario (competitivo, medio o especializado) multiplica los honorarios por su factor; los gastos
// de viaje no cambian con el escenario. La supervisión y el control de calidad se calculan como una
// proporción del costo de campo (supervision, por tipo o general).
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
export const totalConIva = (cfg, tipo, n, pf, dist, fe = 1) => calcular(cfg, tipo, n, pf, dist, fe).total;

// Mayor cantidad (múltiplo del paso del tipo) cuyo total con IVA no supera el presupuesto.
// Devuelve { n, estado }: "ok", "insuficiente" (no alcanza el mínimo) o "excede" (alcanza más que el máximo).
export function cuantoAlcanza(cfg, tipo, presupuesto, pf = 0, dist = "cerca", fe = 1) {
  const min = tipo.cantidad_min, max = tipo.cantidad_max, paso = tipo.paso || 1;
  if (totalConIva(cfg, tipo, min, pf, dist, fe) > presupuesto) return { n: 0, estado: "insuficiente" };
  if (totalConIva(cfg, tipo, max, pf, dist, fe) <= presupuesto) return { n: max, estado: "excede" };
  let lo = min, hi = max; // el total crece con n: búsqueda binaria
  while (hi - lo > 1) { const mid = Math.floor((lo + hi) / 2); if (totalConIva(cfg, tipo, mid, pf, dist, fe) <= presupuesto) lo = mid; else hi = mid; }
  const n = Math.max(min, Math.floor((lo - min) / paso) * paso + min);
  return { n, estado: "ok" };
}

// Margen de error (puntos porcentuales) para una proporción del 50 % con muestreo aleatorio simple
export const margenError = (n, z = 1.96) => (n > 0 ? z * Math.sqrt(0.25 / n) * 100 : 0);

export function calcular(cfg, tipo, n, pctFuera = 0, distanciaId = "cerca", factorEscenario = 1) {
  const m = Math.min(cfg.margen_max, Math.max(cfg.margen_min, Number(tipo.margen)));
  const campo = costoCampo(tipo, n);
  const supervision = campo * (tipo.supervision ?? cfg.supervision ?? 0);
  const costo = { diseno: tipo.costo_diseno, campo, supervision, analisis: tipo.costo_analisis };
  costo.total = costo.diseno + costo.campo + costo.supervision + costo.analisis;

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

  const f = factorEscenario / (1 - m);
  const honorarios = { diseno: costo.diseno * f, campo: costo.campo * f, supervision: costo.supervision * f, analisis: costo.analisis * f };
  honorarios.total = costo.total * f;
  const subtotal = honorarios.total + viaje.total;
  const iva = subtotal * cfg.iva;
  return {
    margen: m, costo, honorarios, viaje, subtotal, iva, total: subtotal + iva,
    ganancia: honorarios.total - costo.total, factor: factorEscenario,
    precioUnidad: honorarios.total / n,
    rango: [subtotal * (1 - cfg.rango_referencial), subtotal * (1 + cfg.rango_referencial)],
  };
}

// ---------------- Interfaz ----------------
const raiz = typeof document !== "undefined" ? document.querySelector("[data-simulador]") : null;
if (raiz) {
  const cfg = JSON.parse(document.getElementById("simulador-config").textContent);
  const interno = raiz.dataset.modo === "interno";
  const conImportes = raiz.dataset.importes === "si";
  const $ = (s) => raiz.querySelector(s);
  const red = (x) => Math.round(x / cfg.redondeo) * cfg.redondeo;
  const n0 = new Intl.NumberFormat("es-PY");
  const fmt = (x, redondear = true) => `${cfg.moneda} ${new Intl.NumberFormat("es-PY", { maximumFractionDigits: redondear ? 0 : 2, minimumFractionDigits: redondear ? 0 : 2 }).format(redondear ? red(x) : x)}`;
  const fmtR = (a, b) => `${cfg.moneda} ${n0.format(red(a))} – ${n0.format(red(b))}`;
  const pct = (x) => `${Math.round(x * 100)} %`;
  const dec1 = (x) => x.toFixed(1).replace(".", ",");
  const escen = cfg.escenarios?.length ? cfg.escenarios : [{ id: "medio", nombre: "Medio", factor: 1 }];
  const fMin = Math.min(...escen.map((e) => e.factor)), fMax = Math.max(...escen.map((e) => e.factor));
  const EN_VALIDACION = '<span class="est-pendiente">Rango en validación</span>';

  const baseContacto = $("#r-cotizar").getAttribute("href").split("?")[0];
  const tipoSel = () => cfg.tipos.find((t) => t.id === raiz.querySelector('input[name="tipo"]:checked')?.value) || cfg.tipos[0];
  const modoSel = () => raiz.querySelector('input[name="calculo"]:checked')?.value || "presupuesto";
  const rango = $("#s-cantidad"), num = $("#s-cantidad-num"), fuera = $("#s-fuera"), dist = $("#s-distancia"), presu = $("#s-presupuesto");
  let ultimo = null;

  function configurarCantidad(t, valor) {
    [rango, num].forEach((el) => { el.min = t.cantidad_min; el.max = t.cantidad_max; el.step = t.paso; el.value = valor ?? t.cantidad_inicial; });
    raiz.querySelectorAll("[data-unidades]").forEach((e) => (e.textContent = t.unidades));
  }
  // Rango de cantidades: el escenario más caro alcanza menos, el más económico alcanza más
  const redondearCant = (t, n) => { const p = t.paso || 1; return Math.max(t.cantidad_min, Math.round(n / p) * p); };

  // Escena del encabezado: puntos encendidos según la cobertura respecto del máximo del servicio
  const capaPuntos = raiz.querySelector("[data-puntos]");
  const puntos = [];
  if (capaPuntos) {
    let s = 9; const az = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 46; i++) { const p = document.createElement("i"); p.style.left = (6 + az() * 88).toFixed(1) + "%"; p.style.top = (8 + az() * 84).toFixed(1) + "%"; p.style.setProperty("--d", (az() * 2).toFixed(2) + "s"); capaPuntos.appendChild(p); puntos.push(p); }
  }
  function escena(fraccion, valor, et, uni) {
    puntos.forEach((p, i) => p.classList.toggle("es-on", i < Math.round(puntos.length * Math.max(0.08, Math.min(1, fraccion)))));
    const chip = raiz.querySelector("[data-chip]");
    if (chip) { chip.innerHTML = valor; raiz.querySelector("[data-chip-et]").textContent = et; raiz.querySelector("[data-chip-uni]").textContent = uni; }
  }

  function actualizar() {
    const t = tipoSel(), modo = modoSel();
    const pf = Number(fuera.value) / 100, dId = dist.value;
    $("#s-fuera-valor").textContent = `${Math.round(pf * 100)} %`;
    $("#s-fuera-valor").style.left = `calc(${pf * 100}% + ${(0.5 - pf) * 18}px)`;
    dist.disabled = pf === 0;
    $("#s-distancia-ayuda").textContent = pf === 0 ? "Todo el trabajo de campo en Asunción y Gran Asunción. Mueva el control para incluir el interior." : "Fuera de Asunción y Gran Asunción se suman viáticos, hotel y transporte del equipo de campo.";
    raiz.querySelectorAll("[data-entrada]").forEach((el) => (el.hidden = el.dataset.entrada !== modo));
    const lugar = pf > 0 ? `${Math.round(pf * 100)} % del campo fuera de Asunción y Gran Asunción (${((x) => x.charAt(0).toLowerCase() + x.slice(1))(dist.selectedOptions[0].text)})` : "campo en Asunción y Gran Asunción";

    let n, presupuesto = null, estado = "ok", textoCobertura = "", textoInversion = "";
    const porEscenario = {};
    if (modo === "presupuesto") {
      presupuesto = Math.max(0, Number(presu.value) || 0);
      escen.forEach((e) => (porEscenario[e.id] = cuantoAlcanza(cfg, t, presupuesto, pf, dId, e.factor)));
      const alto = cuantoAlcanza(cfg, t, presupuesto, pf, dId, fMin), bajo = cuantoAlcanza(cfg, t, presupuesto, pf, dId, fMax);
      const medio = porEscenario.medio || alto;
      n = medio.estado === "insuficiente" ? t.cantidad_min : medio.n;
      estado = alto.estado === "insuficiente" ? "insuficiente" : bajo.estado === "insuficiente" ? "parcial" : alto.estado;
      $("#r-cob-et").textContent = "Cobertura estimada";
      if (estado === "insuficiente") {
        const min = calcular(cfg, t, t.cantidad_min, pf, dId, fMin).total;
        textoCobertura = "No alcanza el mínimo";
        $("#r-cob-nota").textContent = conImportes ? `El estudio más chico (${n0.format(t.cantidad_min)} ${t.unidades}) parte de unos ${fmt(min)} con IVA.` : `El estudio más chico es de ${n0.format(t.cantidad_min)} ${t.unidades}.`;
      } else {
        const a = estado === "parcial" ? t.cantidad_min : redondearCant(t, bajo.n), b = alto.n;
        textoCobertura = a === b ? `${n0.format(a)}` : `${n0.format(a)} – ${n0.format(b)}`;
        $("#r-cob-nota").textContent = estado === "excede" ? `${t.unidades}: su presupuesto supera el máximo del estimador; le proponemos un alcance a medida.` : `${t.unidades}, según el alcance y la metodología`;
      }
      $("#r-inv-et").textContent = "Inversión referencial";
      textoInversion = `hasta ${fmt(presupuesto)}`;
      $("#r-inv-nota").textContent = "con IVA incluido: su presupuesto indicado";
      escena(estado === "insuficiente" ? 0 : (porEscenario.medio?.n || n) / t.cantidad_max, conImportes ? (estado === "insuficiente" ? "—" : textoCobertura) : "En validación", "Cobertura estimada", conImportes ? t.unidades : "");
    } else {
      n = Math.min(t.cantidad_max, Math.max(t.cantidad_min, Math.round(Number(num.value) || t.cantidad_inicial)));
      escen.forEach((e) => (porEscenario[e.id] = calcular(cfg, t, n, pf, dId, e.factor)));
      const a = calcular(cfg, t, n, pf, dId, fMin).total, b = calcular(cfg, t, n, pf, dId, fMax).total;
      $("#r-cob-et").textContent = "Cantidad solicitada";
      textoCobertura = n0.format(n);
      $("#r-cob-nota").textContent = t.unidades;
      $("#r-inv-et").textContent = "Inversión referencial";
      textoInversion = fmtR(a, b);
      $("#r-inv-nota").textContent = "con IVA incluido, según el escenario";
      escena(n / t.cantidad_max, conImportes ? fmtR(a, b).replace(cfg.moneda + " ", "") : "En validación", "Inversión referencial", conImportes ? `${cfg.moneda} con IVA` : "");
    }

    // Lo que depende de montos sin validar no se muestra en el sitio público
    const coberturaCalculada = modo === "presupuesto";
    $("#r-total").innerHTML = coberturaCalculada && !conImportes ? EN_VALIDACION : textoCobertura;
    if (coberturaCalculada && !conImportes) $("#r-cob-nota").textContent = `${t.unidades}, según el alcance y la metodología`;
    $("#r-inversion").innerHTML = conImportes || modo === "presupuesto" ? textoInversion : EN_VALIDACION;
    if (!conImportes && modo === "cantidad") $("#r-inv-nota").textContent = "se informa en la propuesta";

    raiz.querySelectorAll("[data-escenario]").forEach((el) => {
      const r = porEscenario[el.dataset.escenario], v = el.querySelector(".est-escenario__valor");
      if (!r) return;
      v.textContent = modo === "presupuesto" ? (r.estado === "insuficiente" ? "No alcanza" : `${n0.format(r.n)} ${t.unidades}`) : fmt(r.total);
    });

    const prec = $("#r-precision");
    const me = t.muestreo && estado !== "insuficiente" && (modo === "cantidad" || conImportes) ? margenError(n, cfg.confianza_z) : 0;
    prec.hidden = !me;
    if (me) prec.textContent = `Con ${n0.format(n)} ${t.unidades} elegidos al azar, el margen de error es de ±${dec1(me)} puntos con 95 % de confianza.`;

    const r = calcular(cfg, t, n, pf, dId, 1);
    if (interno) {
      $("#r-diseno").textContent = fmt(r.honorarios.diseno); $("#r-campo").textContent = fmt(r.honorarios.campo);
      $("#r-supervision").textContent = fmt(r.honorarios.supervision); $("#r-analisis").textContent = fmt(r.honorarios.analisis);
      $("#r-viaje").textContent = r.viaje.total ? fmt(r.viaje.total) : "No aplica"; $("#r-subtotal").textContent = fmt(r.subtotal);
      $("#i-costo").textContent = fmt(r.costo.total, false);
      $("#i-costo-detalle").textContent = `Diseño ${fmt(r.costo.diseno, false)} · Campo ${fmt(r.costo.campo, false)} · Supervisión ${fmt(r.costo.supervision, false)} · Análisis ${fmt(r.costo.analisis, false)}`;
      $("#i-margen").textContent = pct(r.margen); $("#i-ganancia").textContent = fmt(r.ganancia, false);
      $("#i-viaje").textContent = `Viáticos ${fmt(r.viaje.viaticos, false)} · Hotel ${fmt(r.viaje.hotel, false)} · Transporte ${fmt(r.viaje.transporte, false)} (${r.viaje.distancia.km} km × 2 × ${r.viaje.viajes})`;
      $("#i-campo").textContent = `${n0.format(r.viaje.unidadesFuera)} ${t.unidades} fuera de A y GA · ${r.viaje.diasCampo} días de campo con equipo de ${t.equipo}`;
    }

    const coberturaTxt = estado === "insuficiente" ? `no alcanza el mínimo (${t.cantidad_min} ${t.unidades})` : coberturaCalculada ? `${textoCobertura} ${t.unidades}` : `${n0.format(n)} ${t.unidades}`;
    ultimo = {
      estudio: t.nombre, calculo: modo === "presupuesto" ? "Mi presupuesto (¿cuánto me alcanza?)" : "Una cantidad (¿cuánto cuesta?)",
      presupuesto_con_iva: presupuesto != null ? `${cfg.moneda} ${n0.format(presupuesto)}` : "",
      cantidad: coberturaCalculada && !conImportes ? "a estimar en la propuesta" : coberturaTxt, lugar,
      inversion_referencial: conImportes ? (modo === "presupuesto" ? textoInversion : `${textoInversion} con IVA`) : (presupuesto != null ? `hasta ${cfg.moneda} ${n0.format(presupuesto)}` : "a estimar en la propuesta"),
      margen_error: me ? `±${dec1(me)} puntos (95 %)` : "",
    };
    ultimo.resumen = `Estimación: ${t.nombre}. ${ultimo.calculo}. ` + (presupuesto != null ? `Presupuesto: ${ultimo.presupuesto_con_iva} con IVA. ` : `Cantidad: ${n0.format(n)} ${t.unidades}. `) +
      `Cobertura: ${ultimo.cantidad}. Ubicación: ${lugar}.` + (conImportes ? ` Inversión referencial: ${ultimo.inversion_referencial}.` : "");
    $("#r-cotizar").href = `${baseContacto}?tema=simulador&detalle=${encodeURIComponent(ultimo.resumen)}`;
    $("#r-barra-etiqueta").textContent = coberturaCalculada ? "Cobertura estimada" : "Inversión referencial";
    $("#r-barra-total").innerHTML = coberturaCalculada ? (conImportes ? `${textoCobertura} ${t.unidades}` : "En validación") : (conImportes ? textoInversion : "En validación");
  }

  function matriz() {
    const caja = $("#m-tabla"); if (!caja) return;
    const filas = cfg.tipos.map((t) => {
      const n = t.cantidad_inicial;
      const celdas = escen.map((e) => { const r = calcular(cfg, t, n, 0, "cerca", e.factor); return `<td>${fmt(r.subtotal / n, r.subtotal / n >= 100)}<small>${fmt(r.subtotal)} en total</small></td>`; }).join("");
      return `<tr><th scope="row">${t.nombre}<small>${n0.format(n)} ${t.unidades}</small></th>${celdas}</tr>`;
    }).join("");
    caja.innerHTML = `<table><thead><tr><th>Servicio</th>${escen.map((e) => `<th>${e.nombre}<small>factor ${String(e.factor).replace(".", ",")}</small></th>`).join("")}</tr></thead><tbody>${filas}</tbody></table>`;
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
    return `EST-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${Math.floor(1000 + Math.random() * 9000)}`;
  };
  envio.addEventListener("submit", async (e) => {
    e.preventDefault();
    const clave = envio.dataset.web3forms, hoja = envio.dataset.sheets;
    if (!clave && !hoja) {
      estadoEnvio.className = "formulario__estado error";
      estadoEnvio.textContent = "El envío directo todavía no está activado. Use «Usar el formulario completo»: la estimación se copia allí automáticamente.";
      return;
    }
    const f = Object.fromEntries(new FormData(envio));
    if (f.botcheck) return;
    delete f.botcheck;
    const id = idCotizacion();
    const datos = { formulario: "Estimador de inversión", solicitud: id, ...f, ...ultimo };
    const boton = envio.querySelector('button[type="submit"]');
    boton.disabled = true;
    estadoEnvio.className = "formulario__estado";
    estadoEnvio.textContent = "Enviando…";
    try {
      const tareas = [];
      if (clave) tareas.push(fetch("https://api.web3forms.com/submit", {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ access_key: clave, subject: `${envio.dataset.asunto} ${id}: ${ultimo.estudio}`, from_name: "Estimador Geoanalytics", ...datos }),
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
  raiz.querySelector("[data-ir-propuesta]")?.addEventListener("click", (e) => {
    e.preventDefault();
    const res = raiz.querySelector(".est-resultado"); res.scrollIntoView({ behavior: "smooth", block: "start" });
    if (envio.hidden) btnPedir.click();
  });

  raiz.querySelectorAll('input[name="tipo"]').forEach((el) => el.addEventListener("change", () => { configurarCantidad(tipoSel()); actualizar(); }));
  raiz.querySelectorAll('input[name="calculo"]').forEach((el) => el.addEventListener("change", actualizar));
  rango.addEventListener("input", () => { num.value = rango.value; actualizar(); });
  num.addEventListener("input", () => { rango.value = num.value; actualizar(); });
  num.addEventListener("change", () => { const t = tipoSel(); num.value = Math.min(t.cantidad_max, Math.max(t.cantidad_min, Number(num.value) || t.cantidad_inicial)); rango.value = num.value; actualizar(); });
  [fuera, dist, presu].forEach((el) => el.addEventListener("input", actualizar));
  const tipoUrl = new URLSearchParams(location.search).get("tipo");
  const radioUrl = tipoUrl && raiz.querySelector(`input[name="tipo"][value="${CSS.escape(tipoUrl)}"]`);
  if (radioUrl) radioUrl.checked = true;
  configurarCantidad(tipoSel());
  actualizar();
  matriz();

  const barra = $(".sim-barra"), resultado = $(".est-resultado");
  if (barra && "IntersectionObserver" in window) {
    new IntersectionObserver(([en]) => { barra.hidden = en.isIntersecting; }, { threshold: 0.15 }).observe(resultado);
    barra.querySelector("button").addEventListener("click", () => resultado.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
}
