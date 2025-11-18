// scripts/generate-pdfs.js
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

async function ensureDir(p) { await fs.promises.mkdir(p, { recursive: true }); }

async function makePDF(pagePath, outPath, lang) {
  const fileUrl = `file://${path.resolve("_site", pagePath, "index.html")}`;
  const baseUrl = `file://${path.resolve("_site")}/`;
  console.log(`[PDF] ${lang.toUpperCase()} -> ${fileUrl}`);

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    // Usamos estilos de impresión
    await page.emulateMediaType("print");

    // Abrimos la página local
    await page.goto(fileUrl, { waitUntil: "domcontentloaded" });

    // Inyectamos <base> para que /images/... y /assets/... funcionen en file://
    await page.evaluate((href) => {
      const b = document.createElement("base");
      b.href = href;
      document.head.prepend(b);
    }, baseUrl);

    // Espera a que carguen imágenes/iconos ya con el <base> activo
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
  // Guardamos dentro de _site para que se despliegue
  const outDir = path.resolve("_site", "assets", "pdf");
  await ensureDir(outDir);

  await makePDF("carta", path.join(outDir, "Menú Jalui Jopi.pdf"), "es");
  await makePDF(path.join("en", "menu"), path.join(outDir, "Menu Jalui Jopi.pdf"), "en");
  await makePDF(path.join("fr", "carte"), path.join(outDir, "Menu Jalui Jopi.pdf"), "fr");
}

go().catch((e) => { console.error(e); process.exit(1); });
