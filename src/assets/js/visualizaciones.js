// Gráficos (Chart.js), mapas (Leaflet + OpenStreetMap) y contenidos embebidos dentro de los artículos.
// Cada visualización es un <figure class="viz" data-viz="TIPO" ...> con:
//   data-viz:      barras | barras-horizontales | lineas | mapa | embebido
//   data-archivo:  CSV (gráficos) o GeoJSON (mapas), p. ej. /media/datos/archivo.csv
//   data-lat, data-lng, data-zoom: centro del mapa
//   data-embed:    URL de un gráfico o mapa externo (Datawrapper, Flourish, Google My Maps…)
//   data-unidad:   texto que se agrega a los valores en las etiquetas (p. ej. "%")
(function () {
  const BASE = document.body.dataset.base || "/";
  const ruta = (p) => (p && p.startsWith("/") ? BASE + p.slice(1) : p);
  const figuras = document.querySelectorAll("figure.viz[data-viz]");
  if (!figuras.length) return;

  const CDN = {
    chart: "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.js",
    leafletJs: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js",
    leafletCss: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css",
  };
  const COLORES = ["#13A89E", "#3FD0E8", "#6CCFC6", "#8FA6BF", "#2E8FB8", "#C5D3E0"];
  const cargados = {};
  const script = (src) => (cargados[src] ||= new Promise((ok, mal) => {
    const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = mal; document.head.appendChild(s);
  }));
  const estilo = (href) => { if (!document.querySelector(`link[href="${href}"]`)) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = href; document.head.appendChild(l); } };
  const error = (lienzo, msg) => { lienzo.innerHTML = `<p class="viz__error">${msg}</p>`; lienzo.style.minHeight = "0"; };

  // CSV simple: primera fila = encabezados; primera columna = etiquetas; demás columnas = series numéricas.
  function leerCSV(texto) {
    const sep = texto.split("\n")[0].includes(";") ? ";" : ",";
    const filas = texto.trim().split(/\r?\n/).map((l) => {
      const celdas = []; let actual = ""; let comillas = false;
      for (const ch of l) {
        if (ch === '"') comillas = !comillas;
        else if (ch === sep && !comillas) { celdas.push(actual); actual = ""; }
        else actual += ch;
      }
      celdas.push(actual);
      return celdas.map((c) => c.trim());
    });
    const [cab, ...datos] = filas;
    // Separado por ";" (formato Excel en español): coma decimal y punto de miles.
    // Separado por ",": punto decimal y sin separador de miles.
    const num = sep === ";"
      ? (v) => parseFloat(String(v).replace(/\s/g, "").replace(/\./g, "").replace(",", "."))
      : (v) => parseFloat(String(v).replace(/\s/g, ""));
    return {
      etiquetas: datos.map((f) => f[0]),
      series: cab.slice(1).map((nombre, i) => ({ nombre, valores: datos.map((f) => num(f[i + 1])) })),
    };
  }

  async function grafico(fig, lienzo, tipo) {
    if (!fig.dataset.archivo) return error(lienzo, "Falta el archivo de datos (CSV) del gráfico.");
    const [_, texto] = await Promise.all([script(CDN.chart), fetch(ruta(fig.dataset.archivo)).then((r) => { if (!r.ok) throw 0; return r.text(); })]);
    const { etiquetas, series } = leerCSV(texto);
    const unidad = fig.dataset.unidad || "";
    const canvas = document.createElement("canvas");
    lienzo.appendChild(canvas);
    lienzo.style.height = tipo === "barras-horizontales" ? Math.max(260, etiquetas.length * 46) + "px" : "340px";
    const Chart = window.Chart;
    Chart.defaults.font.family = '"Public Sans", system-ui, sans-serif';
    Chart.defaults.color = "#8FA3B8";
    new Chart(canvas, {
      type: tipo === "lineas" ? "line" : "bar",
      data: {
        labels: etiquetas,
        datasets: series.map((s, i) => ({
          label: s.nombre, data: s.valores,
          backgroundColor: COLORES[i % COLORES.length], borderColor: COLORES[i % COLORES.length],
          borderWidth: tipo === "lineas" ? 2.5 : 0, borderRadius: 2, pointRadius: 3, tension: .2, maxBarThickness: 48,
        })),
      },
      options: {
        indexAxis: tipo === "barras-horizontales" ? "y" : "x",
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: series.length > 1, position: "bottom", labels: { boxWidth: 12, boxHeight: 12 } },
          tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${c.formattedValue}${unidad}` } },
        },
        scales: {
          x: { grid: { display: tipo === "barras-horizontales", color: "rgba(255,255,255,.08)" }, ticks: tipo === "barras-horizontales" ? { callback: (v) => v + unidad } : {} },
          y: { grid: { display: tipo !== "barras-horizontales", color: "rgba(255,255,255,.08)" }, beginAtZero: true, ticks: tipo !== "barras-horizontales" ? { callback: (v) => v + unidad } : {} },
        },
      },
    });
  }

  async function mapa(fig, lienzo) {
    estilo(CDN.leafletCss);
    await script(CDN.leafletJs);
    const L = window.L;
    const lat = parseFloat(fig.dataset.lat || "-23.4"), lng = parseFloat(fig.dataset.lng || "-58.4"), zoom = parseInt(fig.dataset.zoom || "6", 10);
    const m = L.map(lienzo, { scrollWheelZoom: false }).setView([lat, lng], zoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">colaboradores de OpenStreetMap</a>',
    }).addTo(m);
    if (fig.dataset.archivo) {
      const geo = await fetch(ruta(fig.dataset.archivo)).then((r) => r.json());
      const capa = L.geoJSON(geo, {
        style: { color: "#0A7A73", weight: 1.5, fillColor: "#13A89E", fillOpacity: .25 },
        pointToLayer: (_, ll) => L.circleMarker(ll, { radius: 6, color: "#0E2A47", weight: 1.5, fillColor: "#13A89E", fillOpacity: .9 }),
        onEachFeature: (f, capa) => {
          const props = Object.entries(f.properties || {}).slice(0, 8);
          if (props.length) capa.bindPopup(props.map(([k, v]) => `<strong>${k}</strong>: ${v}`).join("<br>"));
        },
      }).addTo(m);
      if (!fig.dataset.lat) m.fitBounds(capa.getBounds(), { padding: [20, 20] });
    }
  }

  function embebido(fig, lienzo) {
    const url = fig.dataset.embed;
    if (!/^https:\/\//.test(url || "")) return error(lienzo, "La dirección del contenido embebido debe comenzar con https://");
    const f = document.createElement("iframe");
    f.src = url; f.loading = "lazy"; f.title = fig.querySelector(".viz__titulo")?.textContent || "Visualización";
    f.style.cssText = "width:100%;height:460px;border:0";
    f.setAttribute("allowfullscreen", "");
    lienzo.appendChild(f);
  }

  // Carga cada visualización cuando se acerca a la pantalla
  const iniciar = async (fig) => {
    const lienzo = fig.querySelector(".viz__lienzo") || fig.appendChild(Object.assign(document.createElement("div"), { className: "viz__lienzo" }));
    const tipo = fig.dataset.viz;
    try {
      if (tipo === "mapa") await mapa(fig, lienzo);
      else if (tipo === "embebido") embebido(fig, lienzo);
      else await grafico(fig, lienzo, tipo);
    } catch (e) {
      error(lienzo, "No se pudo cargar esta visualización. Verifique que el archivo de datos exista y tenga el formato correcto.");
    }
  };
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entradas) => entradas.forEach((en) => {
      if (en.isIntersecting) { io.unobserve(en.target); iniciar(en.target); }
    }), { rootMargin: "300px" });
    figuras.forEach((f) => io.observe(f));
  } else figuras.forEach(iniciar);
})();
