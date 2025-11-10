
# JaluiJopi • Logo Kit (provisional)

Este paquete incluye logos limpios en **PNG transparente**, un **isotipo** y **favicons/PWA** listos para producción.
> Nota: los SVG incluidos *envuelven* PNGs (raster dentro de SVG) para integración rápida; no son curvas vectoriales reales.
> Para un **SVG 100% vector** haremos el calco de curvas a partir del original en una fase posterior.

## Archivos principales
- `png/logo-dark@1x.png` y `@2x`: logo blanco para fondos oscuros.
- `png/logo-light@1x.png` y `@2x`: logo negro para fondos claros.
- `png/isotipo-*.png`: versión cuadrada para avatar/redes.
- `svg/*.svg`: wrappers prácticos (no vector puro).
- `favicons/`: `favicon.ico`, `apple-touch-icon.png`, `android-chrome-192x192.png`, `android-chrome-512x512.png`, `site.webmanifest`.

## Integración rápida (HTML)
```html
<link rel="icon" href="/favicons/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="/favicons/apple-touch-icon.png">
<link rel="manifest" href="/favicons/site.webmanifest">
```

## Uso del logo en web
```html
<!-- Fondo oscuro -->
<img src="/png/logo-dark@1x.png" alt="Discobar JaluiJopi" width="220" height="auto" loading="eager" fetchpriority="high">
<!-- Fondo claro -->
<img src="/png/logo-light@1x.png" alt="Discobar JaluiJopi" width="220" height="auto" loading="eager">
```

### Glow opcional (CSS)
```css
.logo--glow { filter: drop-shadow(0 0 6px rgba(255,255,255,.6)) drop-shadow(0 0 18px rgba(255,255,255,.35)); }
```

## Recomendaciones
- Mantén márgenes de seguridad: ~10% del ancho alrededor del logo.
- No distorsiones; respeta proporciones.
- Tamaños mínimos recomendados:
  - Logo horizontal: 160 px de ancho en web.
  - Isotipo: 24 px en favicons; 192/512 px para PWA.

---
© Discobar JaluiJopi. Derechos reservados. Paquete generado automáticamente como entrega provisional.
