// scripts/generate-pdfs.js
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

async function ensureDir(p) { await fs.promises.mkdir(p, { recursive: true }); }

// Busca un CSS existente dentro de _site
function resolveCssPath(siteDir) {
  const candidates = [
    path.join(siteDir, "assets", "style.css"),
    path.join(siteDir, "assets", "styles.css"),
    path.join(siteDir, "assets", "main.css"),
    path.join(siteDir, "assets", "css", "style.css"),
    path.join(siteDir, "assets", "css", "main.css"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// CSS mínimo por si no encontramos tu hoja real
const FALLBACK_PRINT_CSS = `
@media print {
  .site-header, nav, .lang-switch, .cta-row,
  .site-footer, .footer-wrap, .footer-meta, .menu-hero img { display:none !important; }
  body { background:#fff; color:#000; font-size:12pt; }
  .container { max-width:720px; margin:0 auto; }
  .menu-row { break-inside: avoid; }
  .menu-cat h3 { page-break-after: avoid; }
}
`;

async function makePDF(pagePath, outPath, lang) {
  const fileUrl = `file://${path.resolve("_site", pagePath, "index.html")}`;
  const siteDir = path.resolve("_site");
  const siteBase = `file://${siteDir}/`;
  const cssPath = resolveCssPath(siteDir);

  console.log(`[PDF] ${lang.toUpperCase()} -> ${fileUrl}`);

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.emulateMediaType("print");

    // Carga HTML local
    await page.goto(fileUrl, { waitUntil: "domcontentloaded" });

    // Inyecta CSS (real si existe, si no fallback)
    if (cssPath) {
      await page.addStyleTag({ path: cssPath });
    } else {
      console.warn("[PDF] No se encontró hoja de estilos. Usando CSS de impresión mínimo.");
      await page.addStyleTag({ content: FALLBACK_PRINT_CSS });
    }

    // Reescribe rutas absolutas para file:// (img + srcset + <use href>)
    await page.evaluate((baseHref) => {
      // <img src="/...">
      document.querySelectorAll('img[src^="/"]').forEach(img => {
        const rel = img.getAttribute("src").replace(/^\//, "");
        img.src = baseHref + rel;
      });
      // srcset
      document.querySelectorAll("img[srcset]").forEach(img => {
        const fixed = img.getAttribute("srcset")
          .split(",")
          .map(s => s.trim().replace(/^\/(\S+)/, baseHref + "$1"))
          .join(", ");
        img.setAttribute("srcset", fixed);
      });
      // SVG <use href="/...">
      document.querySelectorAll("use[href^='/']").forEach(use => {
        const rel = use.getAttribute("href").replace(/^\//, "");
        use.setAttribute("href", baseHref + rel);
      });
      // SVG <image href="/...">
      document.querySelectorAll("image[href^='/']").forEach(im => {
        const rel = im.getAttribute("href").replace(/^\//, "");
        im.setAttribute("href", baseHref + rel);
      });
    }, siteBase);

    // Espera a que se resuelvan los recursos ya con rutas buenas
    await page.waitForNetworkIdle({ idleTime: 200, timeout: 5000 }).catch(() => {});

    await page.pdf({
      path: outPath,
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" },
      preferCSSPageSize: true,
      scale: 0.95   // ~5% de “zoom out” para evitar saltos de línea raros
    });

    console.log(`[PDF] guardado: ${outPath}`);
  } finally {
    await browser.close();
  }
}

async function go() {
  const outDir = path.resolve("_site", "assets", "pdf");
  await ensureDir(outDir);

  await makePDF("carta",                path.join(outDir, "menu-es.pdf"), "es");
  await makePDF(path.join("en","menu"), path.join(outDir, "menu-en.pdf"), "en");
  await makePDF(path.join("fr","carte"),path.join(outDir, "menu-fr.pdf"), "fr");
}

go().catch((e) => { console.error(e); process.exit(1); });
