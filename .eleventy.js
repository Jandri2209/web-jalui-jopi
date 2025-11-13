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
    if (!value) return "";
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d)) return "";
    const opts = Object.keys(options).length
      ? options
      : { year: "numeric", month: "long", day: "2-digit" };
    return new Intl.DateTimeFormat(locale, opts).format(d);
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
