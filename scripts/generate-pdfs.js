// scripts/generate-pdfs.js
"use strict";

const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

/* ============== Utils ============== */
async function ensureDir(p) { await fs.promises.mkdir(p, { recursive: true }); }

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

const LABELS = {
  es: { page: "Pág.", of: "de" },
  en: { page: "Page", of: "of" },
  fr: { page: "Page", of: "sur" },
};

/* CSS fallback por si no encontramos el del sitio */
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

  const brandName   = "Jalui Jopi";
  const headerDate  = formatHeaderDate(lang);
  const labels      = LABELS[lang] || LABELS.es;

  // Logo -> data URL
  const logoPath    = path.join(siteDir, "assets", "brand", "logo-jalui.png");
  const logoDataURL = fs.existsSync(logoPath) ? readAsDataURL(logoPath, "image/png") : null;

  // Flags overlay
  const ENABLE_WATERMARK = true;
  const ENABLE_FRAME     = true;

  // Márgenes del PDF (mm) — los usamos también para alinear overlay
  const MARGIN = { top: 18, right: 10, bottom: 14, left: 10 };

  // ===== Header/Footer con estilo
  const headerTemplate = `
    <style>
      *{ box-sizing:border-box; }
      .head{
        font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial;
        font-size:10px; width:100%;
        padding:8px 12px;
        display:flex; align-items:center; justify-content:space-between;
        background:#0b0b0b; color:#f6f6f6;
        border-bottom:1px solid #222;
      }
      .brand{ display:inline-flex; align-items:center; gap:8px; font-weight:800; letter-spacing:.02em; }
      .brand img{ height:16px; width:auto; display:inline-block; filter: invert(1) brightness(1.1) contrast(.95); }
      .muted{ opacity:.8 }
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
      *{ box-sizing:border-box; }
      .foot{
        font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial;
        font-size:10px; width:100%;
        padding:6px 12px;
        display:flex; align-items:center; justify-content:flex-end;
        background:#ffffff; color:#525252;
        border-top:1px solid #e5e7eb;
      }
      .sep{ opacity:.45; padding:0 .25em; }
    </style>
    <div class="foot">
      ${labels.page} <span class="pageNumber"></span> <span class="sep">/</span> <span class="totalPages"></span> ${labels.of}
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

    // Cargar HTML
    await page.goto(fileUrl, { waitUntil: "domcontentloaded" });

    // Inyectar CSS del sitio (o fallback)
    if (cssPath) {
      await page.addStyleTag({ path: cssPath });
    } else {
      console.warn("[PDF] No se encontró hoja de estilos. Usando CSS mínimo.");
      await page.addStyleTag({ content: FALLBACK_PRINT_CSS });
    }

    // Normaliza rutas absolutas a file://
    await page.evaluate((baseHref) => {
      document.querySelectorAll('img[src^="/"]').forEach(img => {
        const rel = img.getAttribute("src").replace(/^\//, "");
        img.src = baseHref + rel;
      });
      document.querySelectorAll("img[srcset]").forEach(img => {
        const fixed = img.getAttribute("srcset")
          .split(",")
          .map(s => s.trim().replace(/^\/(\S+)/, baseHref + "$1"))
          .join(", ");
        img.setAttribute("srcset", fixed);
      });
      document.querySelectorAll("use[href^='/']").forEach(use => {
        const rel = use.getAttribute("href").replace(/^\//, "");
        use.setAttribute("href", baseHref + rel);
      });
      document.querySelectorAll("image[href^='/']").forEach(im => {
        const rel = im.getAttribute("href").replace(/^\//, "");
        im.setAttribute("href", baseHref + rel);
      });
    }, siteBase);

    // ===== Overlay: watermark + marco perfectamente alineado al .container
    if (ENABLE_WATERMARK || ENABLE_FRAME) {
      await page.evaluate((logoDataURL, flags, margins) => {
        const { wm: WM, frame: FR } = flags;

        // Estilos comunes para print
        const STYLE = document.createElement("style");
        STYLE.textContent = `
          @media screen { .__wm, .__frame { display:none !important } }
          @media print  { .__wm, .__frame { display:block !important } }
        `;
        document.head.appendChild(STYLE);

        // Busca el contenedor principal más ancho (el que usas en la carta)
        const containers = Array.from(document.querySelectorAll(".container"));
        let target = containers[0] || document.body;
        let maxW = 0;
        containers.forEach(el => {
          const w = el.getBoundingClientRect().width;
          if (w > maxW) { maxW = w; target = el; }
        });

        const r = target.getBoundingClientRect();

        if (WM && logoDataURL) {
          const wm = document.createElement("img");
          wm.src = logoDataURL;
          wm.alt = "";
          Object.assign(wm.style, {
            position: "fixed",
            left: (r.left + r.width/2 - 110) + "px",   // centrado aprox (220px de ancho)
            top: (r.top + 60) + "px",                  // baja un poco para no chocar con el H1
            width: "220px",
            height: "auto",
            opacity: "0.10",
            filter: "grayscale(100%)",
            mixBlendMode: "multiply",
            zIndex: "0",
            pointerEvents: "none"
          });
          wm.className = "__wm";
          document.body.appendChild(wm);
        }

        if (FR) {
          const frame = document.createElement("div");
          Object.assign(frame.style, {
            position: "fixed",
            left: (r.left) + "px",
            top:  (r.top)  + "px",
            width: r.width + "px",
            height: r.height + "px",
            border: "1px solid rgba(0,0,0,.14)",
            borderRadius: "12px",
            zIndex: "0",
            pointerEvents: "none"
          });
          frame.className = "__frame";
          document.body.appendChild(frame);
        }
      }, logoDataURL, { wm: ENABLE_WATERMARK, frame: ENABLE_FRAME }, MARGIN);
    }

    // Esperas cortas
    await page.waitForNetworkIdle({ idleTime: 250, timeout: 5000 }).catch(() => {});
    try { await page.evaluate(() => (document.fonts && document.fonts.ready) || null); } catch {}

    // Exporta PDF
    await page.pdf({
      path: outPath,
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate,
      footerTemplate,
      margin: { top: `${MARGIN.top}mm`, right: `${MARGIN.right}mm`, bottom: `${MARGIN.bottom}mm`, left: `${MARGIN.left}mm` },
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
