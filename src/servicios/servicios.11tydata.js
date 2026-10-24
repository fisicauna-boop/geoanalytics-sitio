export default {
  layout: "layouts/servicio.njk",
  eleventyComputed: {
    permalink: (data) => `/servicios/${data.page.fileSlug}/`,
    slug: (data) => data.page.fileSlug,
  },
};
