const pluginSitemap = require("@quasibit/eleventy-plugin-sitemap");
const site = require("./_data/site.json");

module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("images");
  eleventyConfig.addPassthroughCopy("favicon-light-16.png");
  eleventyConfig.addPassthroughCopy("favicon-light-32.png");
  eleventyConfig.addPassthroughCopy("favicon-dark-16.png");
  eleventyConfig.addPassthroughCopy("favicon-dark-32.png");
  eleventyConfig.addPassthroughCopy("site.webmanifest");

  eleventyConfig.addPlugin(pluginSitemap, {
    sitemap: { hostname: site.url || "https://example.com" }
  });

  eleventyConfig.addFilter("date", (value, locale = "es-ES", options = {}) => {
    let d;
    if (value === "now" || value === undefined || value === null) d = new Date();
    else if (value instanceof Date) d = value;
    else if (typeof value === "number") d = new Date(value);
    else d = new Date(String(value));

    if (isNaN(d)) return "";
    const opts = Object.keys(options).length ? options
      : { year: "numeric", month: "long", day: "2-digit" };
    return new Intl.DateTimeFormat(locale, opts).format(d);
  });

  eleventyConfig.addFilter("inferAllergens", (ingredients = []) => {
    const map = {
      // cereales con gluten
      pan: "gluten", harina: "gluten", trigo: "gluten", cebada: "gluten", centeno: "gluten", avena: "gluten",
      // huevo y derivados
      huevo: "huevo", huevos: "huevo", alioli: "huevo", mayonesa: "huevo",
      // lácteos
      leche: "lácteos", queso: "lácteos", cheddar: "lácteos", mantequilla: "lácteos", nata: "lácteos",
      // pescado / moluscos / crustáceos
      atún: "pescado", anchoas: "pescado", bacalao: "pescado",
      calamar: "moluscos", calamares: "moluscos", sepia: "moluscos", pulpo: "moluscos",
      gambas: "crustáceos", langostino: "crustáceos",
      // otros EU-14
      cacahuete: "cacahuetes", cacahuetes: "cacahuetes",
      almendra: "frutos de cáscara", almendras: "frutos de cáscara", nuez: "frutos de cáscara",
      avellana: "frutos de cáscara", pistacho: "frutos de cáscara",
      soja: "soja", sésamo: "sésamo", mostaza: "mostaza", apio: "apio",
      sulfito: "sulfitos", sulfitos: "sulfitos"
    };

    const found = new Set();
    (ingredients || []).forEach(x => {
      const w = String(x).toLowerCase();
      Object.keys(map).forEach(k => { if (w.includes(k)) found.add(map[k]); });
    });
    return [...found];
  });
  eleventyConfig.addFilter("currency", (value, lang = "es") => {
    if (value == null) return "";
    const locale = lang === "en" ? "en-GB" : (lang === "fr" ? "fr-FR" : "es-ES");
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2
    }).format(value);
  });

  return {
    dir: {
      input: ".",
      includes: "_includes",
      layouts: "_includes/layouts",
      data: "_data",
      output: "_site"
    },
    templateFormats: ["html", "njk", "md"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
};
