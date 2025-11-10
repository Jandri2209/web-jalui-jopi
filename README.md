# Bar Jalui Jopi — 11ty starter

## Desarrollo
```bash
npm install
npm run dev
```

Producción:
```bash
npm run build
```

## Estructura de idiomas
- Español: `/`
- English: `/en/`
- Français: `/fr/`

Cada página define sus enlaces alternativos con `alt: { es, en, fr }` para que el selector de idioma apunte a la URL equivalente.

## Carta editable
Edita `_data/menu_es.json`, `_data/menu_en.json`, `_data/menu_fr.json`.
- Cada categoría tiene `title`, `image` (puede ser URL o `/images/...` local) y `items`.
- Cada item puede incluir `price` y `allergens` (texto libre).

## Formulario
Los formularios usan Netlify Forms. Añade estos env vars en Netlify si activas el auto‑reply por email:
- `GMAIL_USER`, `GMAIL_APP_PASSWORD`
- Opcional: `MAIL_FROM`, `MAIL_REPLYTO`, `NOTIFY_TO`

## Legal
Las páginas de Cookies/Privacidad/Legal están en las tres lenguas con texto base. Ajústalas a lo que necesitéis.
