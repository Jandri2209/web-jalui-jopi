// scripts/generate-pdfs.js
"use strict";

const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

/* ============== Utils ============== */
async function ensureDir(p) {
  await fs.promises.mkdir(p, { recursive: true });
}

function resolveCssPath(siteDir) {
  const candidates = [
    path.join(siteDir, "assets", "style.css"),
    path.join(siteDir, "assets", "styles.css"),
    path.join(siteDir, "assets", "main.css"),
    path.join(siteDir, "assets", "css", "style.css"),
    path.join(siteDir, "assets", "css", "main.css"),
  ];
  for (const p of candidates) if (fs.existsSync(p)) return p;
  return null;
}

function readAsDataURL(filePath, mime = "image/png") {
  const buf = fs.readFileSync(filePath);
  return `data:${mime};base64,${buf.toString("base64")}`;
}

function formatHeaderDate(lang, d = new Date()) {
  const day = d.getDate();
  const year = d.getFullYear();
  const mES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  const mEN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const mFR = ["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
  const pick = (arr) => arr[d.getMonth()];
  if (lang === "en") return `Updated · ${day} ${pick(mEN)} ${year}`;
  if (lang === "fr") return `Mise à jour · ${day} ${pick(mFR)} ${year}`;
  return `Actualizado · ${day} ${pick(mES)} ${year}`;
}

/* CSS de reserva si no se encuentra el del sitio */
const FALLBACK_PRINT_CSS = `
@media print {
  .site-header, nav, .lang-switch, .cta-row, .site-footer, .footer-wrap, .footer-meta, .menu-hero img { display:none !important; }
  html, body { background:#fff; color:#000; }
  body { font-size: 12pt; line-height: 1.35; }
  .container { max-width: 720px; margin: 0 auto; }
  .menu-row { break-inside: avoid; padding-bottom: 2pt; }
  .menu-cat h3 { page-break-after: avoid; }
  .legend-grid { grid-template-columns: repeat(3, minmax(0,1fr)); }
  .ingredients { color: #555; }
  .menu-cat .menu-row .dots { border-bottom-color: rgba(0,0,0,.35); }
}
`;

/* ============== Core ============== */
async function makePDF(pagePath, outPath, lang) {
  const siteDir  = path.resolve("_site");
  const fileUrl  = `file://${path.resolve("_site", pagePath, "index.html")}`;
  const siteBase = `file://${siteDir}/`;
  const cssPath  = resolveCssPath(siteDir);

  const brandName  = "Jalui Jopi";
  const headerDate = formatHeaderDate(lang);

  // Logo en _site/assets/brand/logo-jalui.png -> data URL
  const logoPath = path.join(siteDir, "assets", "brand", "logo-jalui.png");
  const logoDataURL = fs.existsSync(logoPath) ? readAsDataURL(logoPath, "image/png") : null;

  // Flags de overlay
  const ENABLE_WATERMARK = true;
  const ENABLE_FRAME = true;

  // Header y Footer para Puppeteer
  const headerTemplate = `
    <style>
      .head{ font-size:9px; width:100%; padding:6px 10px;
             display:flex; align-items:center; justify-content:space-between;
             border-bottom:1px solid #e5e7eb; background:#ffffff; }
      .brand{ display:inline-flex; align-items:center; gap:8px; font-weight:700; color:#111827 }
      .brand img{ height:16px; width:auto; display:inline-block; }
      .muted{ color:#6b7280 }
    </style>
    <div class="head">
      <div class="brand">
        ${logoDataURL ? `<img src="${logoDataURL}" alt="">` : ``}
        <span>${brandName}</span>
      </div>
      <div class="muted">${headerDate}</div>
    </div>
  `;

  const footerTemplate = `
    <style>
      .foot{ font-size:9px; width:100%; padding:4px 10px; color:#6b7280;
             display:flex; justify-content:flex-end; border-top:1px solid #e5e7eb; background:#ffffff; }
    </style>
    <div class="foot">
      Página <span class="pageNumber"></span> / <span class="totalPages"></span>
    </div>
  `;

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

    // Inyecta tu CSS principal (o fallback)
    if (cssPath) {
      await page.addStyleTag({ path: cssPath });
    } else {
      console.warn("[PDF] No se encontró hoja de estilos. Usando CSS de impresión mínimo.");
      await page.addStyleTag({ content: FALLBACK_PRINT_CSS });
    }

    // Normaliza rutas absolutas a file://
    await page.evaluate((baseHref) => {
      // <img src="/...">
      document.querySelectorAll('img[src^="/"]').forEach(img => {
        const rel = img.getAttribute("src").replace(/^\//, "");
        img.src = baseHref + rel;
      });
      // srcset en <img>
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

    // Overlay: marca de agua y marco fino (solo para print)
    if (ENABLE_WATERMARK || ENABLE_FRAME) {
      await page.evaluate((logoDataURL, ENABLE_WATERMARK, ENABLE_FRAME) => {
        const STYLE = document.createElement("style");
        STYLE.textContent = `
          @media screen { .__wm { display:none !important } }
          @media print  { .__wm { display:grid !important } }
        `;
        document.head.appendChild(STYLE);

        if (ENABLE_WATERMARK && logoDataURL) {
          const wm = document.createElement("div");
          wm.className = "__wm";
          wm.setAttribute("aria-hidden", "true");
          wm.innerHTML = `<img src="${logoDataURL}" alt="" style="width:220px; height:auto; opacity:.08; filter:grayscale(100%)">`;
          Object.assign(wm.style, {
            position: "fixed",
            inset: "0",
            display: "grid",
            placeItems: "center",
            zIndex: "0",
            pointerEvents: "none"
          });
          document.body.appendChild(wm);
        }

        if (ENABLE_FRAME) {
          const frame = document.createElement("div");
          frame.className = "__wm";
          Object.assign(frame.style, {
            position: "fixed",
            inset: "8mm",
            border: "1px solid rgba(0,0,0,.15)",
            borderRadius: "6px",
            zIndex: "0",
            pointerEvents: "none"
          });
          document.body.appendChild(frame);
        }
      }, logoDataURL, ENABLE_WATERMARK, ENABLE_FRAME);
    }

    // Espera a recursos
    await page.waitForNetworkIdle({ idleTime: 200, timeout: 5000 }).catch(() => {});
    try { await page.evaluate(() => document.fonts && document.fonts.ready || null); } catch {}

    // Exporta PDF con header/footer
    await page.pdf({
      path: outPath,
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate,
      footerTemplate,
      margin: { top: "18mm", right: "10mm", bottom: "14mm", left: "10mm" },
      preferCSSPageSize: true,
      scale: 0.95
    });

    console.log(`[PDF] guardado: ${outPath}`);
  } finally {
    await browser.close();
  }
}

async function go() {
  const outDir = path.resolve("_site", "assets", "pdf");
  await ensureDir(outDir);

  await makePDF("carta",                 path.join(outDir, "menu-es.pdf"), "es");
  await makePDF(path.join("en","menu"),  path.join(outDir, "menu-en.pdf"), "en");
  await makePDF(path.join("fr","carte"), path.join(outDir, "menu-fr.pdf"), "fr");
}

go().catch((e) => { console.error(e); process.exit(1); });
