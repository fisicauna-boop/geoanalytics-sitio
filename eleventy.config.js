import { HtmlBasePlugin } from "@11ty/eleventy";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
  "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

// Convierte texto en un identificador para URL: "Inteligencia Comercial" -> "inteligencia-comercial"
function slug(texto = "") {
  return String(texto)
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function aFecha(valor) {
  if (!valor) return null;
  const d = valor instanceof Date ? valor : new Date(valor);
  return isNaN(d) ? null : d;
}

const esBorrador = (item) => item.data.borrador === true || item.data.eleventyExcludeFromCollections === true;

export default function (eleventyConfig) {
  // Prefijo de ruta para GitHub Pages (p. ej. /geoanalytics/). Vacío con dominio propio.
  eleventyConfig.addPlugin(HtmlBasePlugin);

  // Archivos que se copian tal cual
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/media": "media" });
  eleventyConfig.addPassthroughCopy({ "src/favicon-48.png": "favicon-48.png", "src/apple-touch-icon.png": "apple-touch-icon.png" });
  // Three.js (motor 3D de la portada), servido desde el propio sitio
  eleventyConfig.addPassthroughCopy({ "node_modules/three/build/three.module.min.js": "assets/vendor/three.module.min.js" });
  eleventyConfig.addPassthroughCopy({ "src/.nojekyll": ".nojekyll" });

  // ---------- Colecciones ----------
  eleventyConfig.addCollection("articulos", (api) =>
    api.getFilteredByGlob("src/articulos/*.md")
      .filter((a) => !esBorrador(a))
      .sort((a, b) => b.date - a.date)
  );

  eleventyConfig.addCollection("servicios", (api) =>
    api.getFilteredByGlob("src/servicios/*.md")
      .sort((a, b) => (a.data.orden ?? 99) - (b.data.orden ?? 99))
  );

  // Lista de etiquetas con su cantidad de artículos
  eleventyConfig.addCollection("etiquetas", (api) => {
    const mapa = new Map();
    api.getFilteredByGlob("src/articulos/*.md").filter((a) => !esBorrador(a)).forEach((a) => {
      (a.data.etiquetas || []).forEach((t) => {
        const s = slug(t);
        if (!s) return;
        const e = mapa.get(s) || { nombre: t, slug: s, articulos: [] };
        e.articulos.push(a);
        mapa.set(s, e);
      });
    });
    return [...mapa.values()]
      .map((e) => ({ ...e, articulos: e.articulos.sort((a, b) => b.date - a.date) }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  });

  // Archivo por año
  eleventyConfig.addCollection("archivo", (api) => {
    const porAnio = {};
    api.getFilteredByGlob("src/articulos/*.md").filter((a) => !esBorrador(a)).forEach((a) => {
      const y = a.date.getFullYear();
      (porAnio[y] ||= []).push(a);
    });
    return Object.keys(porAnio).sort((a, b) => b - a)
      .map((y) => ({ anio: y, articulos: porAnio[y].sort((a, b) => b.date - a.date) }));
  });

  // ---------- Filtros ----------
  eleventyConfig.addFilter("slug", slug);

  eleventyConfig.addFilter("fecha", (valor) => {
    const d = aFecha(valor);
    if (!d) return "";
    return `${d.getUTCDate()} de ${MESES[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
  });

  eleventyConfig.addFilter("fechaISO", (valor) => {
    const d = aFecha(valor);
    return d ? d.toISOString() : "";
  });

  eleventyConfig.addFilter("fechaCorta", (valor) => {
    const d = aFecha(valor);
    return d ? d.toISOString().slice(0, 10) : "";
  });

  eleventyConfig.addFilter("deCategoria", (articulos, cat) =>
    (articulos || []).filter((a) => a.data.categoria === cat));

  eleventyConfig.addFilter("conEtiqueta", (articulos, etiqueta) =>
    (articulos || []).filter((a) => (a.data.etiquetas || []).map(slug).includes(slug(etiqueta))));

  eleventyConfig.addFilter("conServicio", (articulos, servicio) =>
    (articulos || []).filter((a) => (a.data.servicios || []).includes(servicio)));

  eleventyConfig.addFilter("destacados", (articulos) =>
    (articulos || []).filter((a) => a.data.destacado));

  eleventyConfig.addFilter("excepto", (articulos, url) =>
    (articulos || []).filter((a) => a.url !== url));

  eleventyConfig.addFilter("limitar", (arr, n) => (arr || []).slice(0, n));

  eleventyConfig.addFilter("buscarPor", (arr, clave, valor) =>
    (arr || []).find((x) => (x.data ? x.data[clave] : x[clave]) === valor));

  eleventyConfig.addFilter("rechazarPor", (arr, clave, valor) =>
    (arr || []).filter((x) => (x.data ? x.data[clave] : x[clave]) !== valor));

  eleventyConfig.addFilter("filtrarPor", (arr, clave, valores) => {
    const lista = Array.isArray(valores) ? valores : [valores];
    return (arr || []).filter((x) => lista.includes(x.data ? x.data[clave] : x[clave]));
  });

  // Artículos relacionados: misma categoría o etiquetas compartidas
  eleventyConfig.addFilter("relacionados", (articulos, url, n = 3) => {
    const actual = (articulos || []).find((a) => a.url === url);
    if (!actual) return [];
    const misEtiq = (actual.data.etiquetas || []).map(slug);
    return (articulos || [])
      .filter((a) => a.url !== actual.url)
      .map((a) => {
        let puntos = a.data.categoria === actual.data.categoria ? 2 : 0;
        (a.data.etiquetas || []).forEach((t) => { if (misEtiq.includes(slug(t))) puntos += 1; });
        return { a, puntos };
      })
      .filter((x) => x.puntos > 0)
      .sort((x, y) => y.puntos - x.puntos || y.a.date - x.a.date)
      .slice(0, n)
      .map((x) => x.a);
  });

  // Texto plano para el buscador y las descripciones
  eleventyConfig.addFilter("textoPlano", (html = "", max = 4000) =>
    String(html).replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&[a-z#0-9]+;/gi, " ")
      .replace(/\s+/g, " ").trim().slice(0, max));

  // Minutos de lectura (≈ 220 palabras por minuto)
  eleventyConfig.addFilter("lectura", (html = "") => {
    const palabras = String(html).replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(palabras / 220));
  });

  // URL absoluta para SEO y redes sociales (site.url debe incluir el prefijo si existe)
  eleventyConfig.addFilter("absoluta", (ruta = "/", base = "") => {
    if (typeof ruta !== "string") return ""; // páginas sin URL (borradores)
    if (/^https?:\/\//.test(ruta)) return ruta;
    return String(base).replace(/\/$/, "") + (ruta.startsWith("/") ? ruta : "/" + ruta);
  });

  eleventyConfig.addFilter("json", (v) => JSON.stringify(v ?? null));
  eleventyConfig.addFilter("enc", (v) => encodeURIComponent(v ?? ""));

  // Opciones de Markdown: tablas, enlaces automáticos y HTML permitido (para mapas/gráficos embebidos)
  eleventyConfig.amendLibrary("md", (md) => md.set({ html: true, linkify: true, typographer: true }));

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    pathPrefix: "/geoanalytics-sitio/",
    // Los artículos no se procesan con Nunjucks: así un "{{" escrito en el editor nunca rompe la compilación
    markdownTemplateEngine: false,
    htmlTemplateEngine: "njk",
    templateFormats: ["md", "njk", "html"],
  };
}
