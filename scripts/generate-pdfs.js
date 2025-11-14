const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

async function ensureDir(p) { await fs.promises.mkdir(p, { recursive: true }); }

async function makePDF(pagePath, outPath, lang) {
  const url = `file://${path.resolve("_site", pagePath, "index.html")}`;
  console.log(`[PDF] ${lang.toUpperCase()} -> ${url}`);

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.emulateMediaType("screen"); // usamos tus estilos @media print
    await page.goto(url, { waitUntil: "networkidle0" });
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
  const outDir = path.resolve("assets", "pdf");
  await ensureDir(outDir);

  await makePDF("carta", path.join(outDir, "menu-es.pdf"), "es");
  await makePDF(path.join("en", "menu"), path.join(outDir, "menu-en.pdf"), "en");
  await makePDF(path.join("fr", "carte"), path.join(outDir, "menu-fr.pdf"), "fr");
}

go().catch((e) => { console.error(e); process.exit(1); });
