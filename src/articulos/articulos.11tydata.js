// Datos comunes a todos los artículos de esta carpeta.
const enDesarrollo = process.env.ELEVENTY_RUN_MODE === "serve";

// Un artículo no se publica si es borrador o si su fecha todavía no llegó (publicación programada).
// En la vista previa local (npm start) se muestran todos.
function oculto(data) {
  if (enDesarrollo) return false;
  const fecha = data.page?.date ? new Date(data.page.date) : null;
  return Boolean(data.borrador) || Boolean(fecha && fecha > new Date());
}

export default {
  layout: "layouts/articulo.njk",
  autor: "Equipo Geoanalytics",
  etiquetas: [],
  servicios: [],
  eleventyComputed: {
    // URL: /articulos/<nombre-del-archivo>/
    permalink: (data) => {
      if (oculto(data)) return false; // borradores y artículos programados no se publican todavía
      return `/articulos/${data.page.fileSlug}/`;
    },
    eleventyExcludeFromCollections: (data) => oculto(data),
  },
};
