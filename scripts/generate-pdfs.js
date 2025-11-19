// scripts/generate-pdfs.js
"use strict";

const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

/* Ajustes */
const SHOW_DATE = false;
const ENABLE_WATERMARK = false;
const ENABLE_FRAME = false;

/* Utils */
async function ensureDir(p){ await fs.promises.mkdir(p,{recursive:true}); }
function resolveCssPath(siteDir){
  const c = [
    path.join(siteDir,"assets","style.css"),
    path.join(siteDir,"assets","styles.css"),
    path.join(siteDir,"assets","main.css"),
    path.join(siteDir,"assets","css","style.css"),
    path.join(siteDir,"assets","css","main.css"),
  ];
  for(const f of c) if(fs.existsSync(f)) return f;
  return null;
}
function readAsDataURL(fp, mime="image/png"){
  const b = fs.readFileSync(fp);
  return `data:${mime};base64,${b.toString("base64")}`;
}
function formatHeaderDate(lang,d=new Date()){
  const day=d.getDate(), y=d.getFullYear();
  const ES=["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  const EN=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const FR=["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
  const m = lang==="en"?EN:lang==="fr"?FR:ES;
  const tag = lang==="en"?"Updated":(lang==="fr"?"Mise à jour":"Actualizado");
  return `${tag} · ${day} ${m[d.getMonth()]} ${y}`;
}
const FALLBACK_PRINT_CSS = `
@media print {
  .site-header, nav, .lang-switch, .cta-row, .site-footer, .footer-wrap, .footer-meta, .menu-hero img, .skip { display:none !important; }
  html, body { background:#fff; color:#000; }
  body { font-size:12pt; line-height:1.35; }
  .container { max-width:720px; margin:0 auto; }
  .menu-row { break-inside:avoid; padding-bottom:2pt; }
  .menu-cat h3 { page-break-after:avoid; }
  .legend-grid { grid-template-columns:repeat(3, minmax(0,1fr)); }
  .ingredients { color:#555; }
  .menu-cat .menu-row .dots { border-bottom-color:rgba(0,0,0,.35); }
}
`;

async function makePDF(pagePath, outPath, lang){
  const siteDir = path.resolve("_site");
  const fileUrl = `file://${path.resolve("_site", pagePath, "index.html")}`;
  const siteBase = `file://${siteDir}/`;
  const cssPath = resolveCssPath(siteDir);

  const brandName = "Jalui Jopi";
  const headerDate = formatHeaderDate(lang);
  const logoPath = path.join(siteDir,"assets","brand","logo-jalui.png");
  const logo = fs.existsSync(logoPath) ? readAsDataURL(logoPath) : null;

  const MARGIN = { top: 18, right: 10, bottom: 14, left: 10 };

  // HEADER negro forzado (capa absoluta + print-color-adjust)
  const headerTemplate = `
    <style>
      *{ box-sizing:border-box; }
      .head{
        position:relative; width:100%;
        font-family:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial;
        font-size:10px; padding:8px 12px;
        color:#f6f6f6;
        -webkit-print-color-adjust:exact; print-color-adjust:exact;
      }
      .head .bg{
        position:absolute; inset:0;
        background:#0b0b0b;
        border-bottom:1px solid #222;
        z-index:0;
        -webkit-print-color-adjust:exact; print-color-adjust:exact;
      }
      .row{ position:relative; z-index:1; display:flex; align-items:center; justify-content:space-between; }
      .brand{ display:inline-flex; align-items:center; gap:8px; font-weight:800; letter-spacing:.02em; }
      .brand img{ height:16px; width:auto; display:inline-block; filter:invert(1) brightness(1.1) contrast(.95); }
      .muted{ opacity:.85 }
    </style>
    <div class="head">
      <div class="bg"></div>
      <div class="row">
        <div class="brand">
          ${logo ? `<img src="${logo}" alt="">` : ``}
          <span>${brandName}</span>
        </div>
        ${SHOW_DATE ? `<div class="muted">${headerDate}</div>` : `<div></div>`}
      </div>
    </div>
  `;

  const footerTemplate = `
    <style>
      *{ box-sizing:border-box; }
      .foot{
        font-family:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial;
        font-size:10px; width:100%;
        padding:6px 12px;
        display:flex; align-items:center; justify-content:flex-end;
        background:#ffffff; color:#525252;
        border-top:1px solid #e5e7eb;
        -webkit-print-color-adjust:exact; print-color-adjust:exact;
      }
      .sep{ opacity:.45; padding:0 .25em; }
    </style>
    <div class="foot">
      Pág. <span class="pageNumber"></span> <span class="sep">/</span> <span class="totalPages"></span>
    </div>
  `;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox","--disable-setuid-sandbox"],
  });

  try{
    const page = await browser.newPage();
    await page.emulateMediaType("print");
    await page.goto(fileUrl, { waitUntil:"domcontentloaded" });

    if (cssPath) await page.addStyleTag({ path: cssPath });
    else { await page.addStyleTag({ content: FALLBACK_PRINT_CSS }); }

    await page.evaluate((baseHref)=>{
      document.querySelectorAll('img[src^="/"]').forEach(img=>{
        const rel = img.getAttribute("src").replace(/^\//,"");
        img.src = baseHref + rel;
      });
      document.querySelectorAll("img[srcset]").forEach(img=>{
        const v = img.getAttribute("srcset"); if(!v) return;
        img.setAttribute("srcset", v.split(",").map(s=>s.trim().replace(/^\/(\S+)/, baseHref+"$1")).join(", "));
      });
      document.querySelectorAll("use[href^='/']").forEach(use=>{
        const rel = use.getAttribute("href").replace(/^\//,"");
        use.setAttribute("href", baseHref + rel);
      });
      document.querySelectorAll("image[href^='/']").forEach(im=>{
        const rel = im.getAttribute("href").replace(/^\//,"");
        im.setAttribute("href", baseHref + rel);
      });
    }, siteBase);

    if (ENABLE_WATERMARK || ENABLE_FRAME){
      await page.evaluate((logo, flags)=>{
        const STYLE=document.createElement("style");
        STYLE.textContent=`@media screen{.__wm,.__frame{display:none!important}}@media print{.__wm,.__frame{display:block!important}}`;
        document.head.appendChild(STYLE);
        if(flags.wm && logo){
          const wm=document.createElement("img");
          Object.assign(wm.style,{
            position:"fixed", left:"50%", top:"45%", transform:"translate(-50%,-50%) rotate(-14deg)",
            width:"240px", opacity:"0.12", filter:"grayscale(100%)", mixBlendMode:"multiply",
            zIndex:"0", pointerEvents:"none"
          });
          wm.src=logo; wm.className="__wm"; document.body.appendChild(wm);
        }
        if(flags.frame){
          const c=document.querySelector(".container")||document.body;
          const r=c.getBoundingClientRect();
          const f=document.createElement("div");
          Object.assign(f.style,{
            position:"fixed", left:r.left+"px", top:r.top+"px",
            width:r.width+"px", height:r.height+"px",
            border:"1px solid rgba(0,0,0,.14)", borderRadius:"12px",
            zIndex:"0", pointerEvents:"none"
          });
          f.className="__frame"; document.body.appendChild(f);
        }
      }, logo, { wm: ENABLE_WATERMARK, frame: ENABLE_FRAME });
    }

    await page.waitForNetworkIdle({ idleTime:250, timeout:5000 }).catch(()=>{});
    try{ await page.evaluate(()=> (document.fonts && document.fonts.ready) || null); }catch{}

    await page.pdf({
      path: outPath,
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate,
      footerTemplate,
      margin: { top:`${MARGIN.top}mm`, right:`${MARGIN.right}mm`, bottom:`${MARGIN.bottom}mm`, left:`${MARGIN.left}mm` },
      preferCSSPageSize: true,
      scale: 0.95
    });
  } finally {
    await browser.close();
  }
}

async function go(){
  const outDir = path.resolve("_site","assets","pdf");
  await ensureDir(outDir);
  await makePDF("carta",                 path.join(outDir,"menu-es.pdf"), "es");
  await makePDF(path.join("en","menu"),  path.join(outDir,"menu-en.pdf"), "en");
  await makePDF(path.join("fr","carte"), path.join(outDir,"menu-fr.pdf"), "fr");
}

go().catch(e=>{ console.error(e); process.exit(1); });
