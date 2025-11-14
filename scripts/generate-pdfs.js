// scripts/generate-pdfs.js
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

async function ensureDir(p) {
  await fs.promises.mkdir(p, { recursive: true });
}

async function makePDF(pagePath, outPath, lang) {
  const url = `file://${path.resolve("_site", pagePath, "index.html")}`;
  console.log(`[PDF] ${lang.toUpperCase()} -> ${url}`);

  // Lanza Chromium de Puppeteer (con flags para Netlify)
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();

    // Un CSS rápido para vista print (si no lo tenías ya en tu CSS)
    await page.emulateMediaType("screen");

    await page.goto(url, { waitUntil: "networkidle0" });

    await page.pdf({
      path: outPath,
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" },
      preferCSSPageSize: true
    });

    console.log(`[PDF] guardado: ${outPath}`);
  } finally {
    await browser.close();
  }
}

async function go() {
  const outDir = path.resolve("assets", "pdf");
  await ensureDir(outDir);

  // ES / EN / FR
  const jobs = [
    { page: "carta", out: path.join(outDir, "menu-es.pdf"), lang: "es" },
    { page: path.join("en", "menu"), out: path.join(outDir, "menu-en.pdf"), lang: "en" },
    { page: path.join("fr", "carte"), out: path.join(outDir, "menu-fr.pdf"), lang: "fr" },
  ];

  for (const j of jobs) {
    await makePDF(j.page, j.out, j.lang);
  }
}

go().catch((err) => {
  console.error(err);
  process.exit(1);
});
