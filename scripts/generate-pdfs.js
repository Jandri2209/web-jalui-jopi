const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

async function go() {
  const outDir = path.join(__dirname, "..", "_site", "assets", "pdf");
  fs.mkdirSync(outDir, { recursive: true });

  const pages = [
    { url: path.join(__dirname, "..", "_site", "carta", "index.html"), out: "menu-es.pdf" },
    { url: path.join(__dirname, "..", "_site", "en", "menu", "index.html"), out: "menu-en.pdf" },
    { url: path.join(__dirname, "..", "_site", "fr", "carte", "index.html"), out: "menu-fr.pdf" },
  ];

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox","--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();
  for (const p of pages) {
    const fileUrl = "file://" + p.url.replace(/\\/g, "/");
    await page.goto(fileUrl, { waitUntil: "networkidle0" });
    await page.emulateMediaType("screen");
    // Usa el CSS @media print que ya tienes
    await page.pdf({
      path: path.join(outDir, p.out),
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", bottom: "12mm", left: "10mm", right: "10mm" }
    });
    console.log("PDF generado:", p.out);
  }
  await browser.close();
}
go().catch(err => { console.error(err); process.exit(1); });
