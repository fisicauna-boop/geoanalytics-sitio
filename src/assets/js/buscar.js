// Buscador de publicaciones: funciona sin servidor, a partir de indice-busqueda.json
(function () {
  const BASE = document.body.dataset.base || "/";
  const ruta = (p) => (p && p.startsWith("/") ? BASE + p.slice(1) : p);
  const form = document.getElementById("form-buscar");
  const input = document.getElementById("q");
  const estado = document.getElementById("estado-busqueda");
  const caja = document.getElementById("resultados");
  if (!form) return;

  const normal = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const esc = (s) => String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const VACIAS = new Set(["de", "la", "el", "en", "y", "a", "los", "las", "del", "un", "una", "para", "por", "con", "que", "se", "al", "o"]);

  let indice = null;
  async function cargar() {
    if (indice) return indice;
    const r = await fetch(ruta("/indice-busqueda.json"));
    const datos = await r.json();
    indice = datos.map((d) => ({
      ...d,
      _t: normal(d.titulo), _r: normal(d.resumen), _e: normal((d.etiquetas || []).join(" ")),
      _c: normal(d.categoria), _x: normal(d.texto),
    }));
    return indice;
  }

  function puntuar(doc, terminos) {
    let total = 0;
    for (const t of terminos) {
      let p = 0;
      if (doc._t.includes(t)) p += 10;
      if (doc._e.includes(t)) p += 6;
      if (doc._c.includes(t)) p += 4;
      if (doc._r.includes(t)) p += 3;
      if (doc._x.includes(t)) p += 1;
      if (p === 0) return 0; // todos los términos deben aparecer
      total += p;
    }
    return total;
  }

  function tarjeta(d) {
    const img = d.imagen
      ? `<img src="${esc(ruta(d.imagen))}" alt="" loading="lazy" width="1200" height="675">`
      : `<span class="tarjeta__sinimg"></span>`;
    return `<article class="tarjeta tarjeta--normal">
      <a class="tarjeta__img" href="${esc(ruta(d.url))}" tabindex="-1" aria-hidden="true">${img}</a>
      <div class="tarjeta__cuerpo">
        <div class="tarjeta__meta"><span class="cat cat--${esc(d.categoria_slug)}">${esc(d.categoria)}</span><time datetime="${esc(d.fecha_iso)}">${esc(d.fecha)}</time></div>
        <h2 class="tarjeta__titulo"><a href="${esc(ruta(d.url))}">${esc(d.titulo)}</a></h2>
        <p class="tarjeta__resumen">${esc(d.resumen)}</p>
      </div></article>`;
  }

  async function buscar(q) {
    const consulta = q.trim();
    caja.innerHTML = "";
    if (!consulta) { estado.textContent = "Escriba uno o más términos para buscar."; return; }
    estado.textContent = "Buscando…";
    try {
      const docs = await cargar();
      const terminos = normal(consulta).split(/\s+/).filter((t) => t.length > 1 && !VACIAS.has(t));
      if (!terminos.length) { estado.textContent = "Pruebe con términos más específicos."; return; }
      const res = docs.map((d) => ({ d, p: puntuar(d, terminos) })).filter((x) => x.p > 0).sort((a, b) => b.p - a.p);
      estado.textContent = res.length
        ? `${res.length} ${res.length === 1 ? "resultado" : "resultados"} para «${consulta}».`
        : `No hay publicaciones que contengan «${consulta}». Pruebe con otra palabra o revise la ortografía.`;
      caja.innerHTML = res.map((x) => tarjeta(x.d)).join("");
    } catch (e) {
      estado.textContent = "No se pudo cargar el índice de búsqueda. Recargue la página e intente de nuevo.";
    }
  }

  const params = new URLSearchParams(location.search);
  if (params.get("q")) { input.value = params.get("q"); buscar(input.value); }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = input.value;
    history.replaceState(null, "", "?q=" + encodeURIComponent(q));
    buscar(q);
  });
})();
