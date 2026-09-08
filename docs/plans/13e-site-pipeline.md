# 13e — Pipeline del site consume el bundle web

**Hecho.**

## Objetivo

Repuntar el pipeline del reader para que los shells HTML carguen el bundle React
del app desktop (en vez del `reader.js` vanilla).

## Cambios

- `apps/reader/src/shell.ts`
  - Nueva firma `shellHtml(boot, title, assets)` con `SiteAssets { css, js }`
  - Emite `<link rel="stylesheet">` y `<script type="module">` de los assets del web
  - Setea `window.__SLASHMD_INITIAL_THEME__` (boot de tema del desktop) + `data-theme`
  - Inyecta `window.__SLASH_MD__` con `{basePath, page, manifestUrl}`
- `apps/reader/src/build-site.ts`
  - `copyWebAssets(webAssetsDir, basePath, destDir)`: lee `index.web.html` de
    `dist-web`, extrae `assets/main.*.{js,css}` (regex `href/src`), copia
    `dist-web/assets` → `_site/assets`, devuelve hrefs site-relative
  - Escribe un shell con esos assets por cada route (proceso inline, no segundo pass)
- `apps/reader/src/cli.ts`
  - `webAssetsDir` desde env `WEB_ASSETS_DIR`, default `apps/desktop/dist-web`

## Navegación de links (web)

- `apps/desktop/src/web/links.ts` — `installWebLinkNavigation()` (capture listener)
  - Solo en web host; ignora anchors externos/`#`/`_blank`/mod-keys
  - Resuelve links de contenido (repo path `.md`/ruta) y rutas absolutas a la
    `route` del manifest y redirige con `hrefForRoute`
  - `hrefForRoute` portado a local (mismo contrato que el reader)
- Conectado en `main.web.tsx`

## Verificación

- `npm run site:build` → shells con entry css/js; `site:preview` carga el app
- Links internos (`other.md`, rutas) navegan al route correcto
- Sin 4xx salvo `favicon.ico`
