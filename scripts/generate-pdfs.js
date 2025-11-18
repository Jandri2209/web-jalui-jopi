// scripts/generate-pdfs.js
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

async function ensureDir(p) { await fs.promises.mkdir(p, { recursive: true }); }

async function makePDF(pagePath, outPath, lang) {
  const fileUrl = `file://${path.resolve("_site", pagePath, "index.html")}`;
  const siteDir = path.resolve("_site");                // .../_site
  const cssPath = path.resolve(siteDir, "assets", "style.css"); // CSS compilado
  const siteBase = `file://${siteDir}/`;               // base absoluta válida para file://

  console.log(`[PDF] ${lang.toUpperCase()} -> ${fileUrl}`);

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    // Fuerza estilos de impresión
    await page.emulateMediaType("print");

    // Carga el HTML local
    await page.goto(fileUrl, { waitUntil: "domcontentloaded" });

    // 1) Inyecta CSS desde disco (evita el /assets/... roto en file://)
    await page.addStyleTag({ path: cssPath });

    // 2) Reescribe src de <img> que empiecen por "/"
    await page.evaluate((baseHref) => {
      document.querySelectorAll('img[src^="/"]').forEach(img => {
        const rel = img.getAttribute("src").replace(/^\//, ""); // quita la barra inicial
        img.src = baseHref + rel; // file:///.../_site/ + images/...
      });
      // Si usas srcset:
      document.querySelectorAll('img[srcset]').forEach(img => {
        const fixed = img.getAttribute("srcset")
          .split(",")
          .map(s => s.trim().replace(/^\/(\S+)/, baseHref + "$1")) // /images/... -> file:///.../_site/images/...
          .join(", ");
        img.setAttribute("srcset", fixed);
      });
    }, siteBase);

    // Espera a que termine de resolver recursos ya con CSS+imágenes correctos
    await page.waitForNetworkIdle({ idleTime: 200, timeout: 5000 }).catch(() => {});

    // Genera PDF
    await page.pdf({
      path: outPath,
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" },
      preferCSSPageSize: true,
    });

    console.log(`[PDF] guardado: ${outPath}`);
  } finally {
    await browser.close();
  }
}

async function go() {
  const outDir = path.resolve("_site", "assets", "pdf");
  await ensureDir(outDir);

  await makePDF("carta",               path.join(outDir, "menu-es.pdf"), "es");
  await makePDF(path.join("en","menu"), path.join(outDir, "menu-en.pdf"), "en");
  await makePDF(path.join("fr","carte"),path.join(outDir, "menu-fr.pdf"), "fr");
}

go().catch((e) => { console.error(e); process.exit(1); });
