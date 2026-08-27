# Plan 11c — Reader (árbol, búsqueda, Crepe)

> El JS que cargan los `index.html` de [11b](./11b-build-site.md). Misma pintura que el editor en wiki read-only.

**Depende de:** 11b (shell + manifest). **Índice:** [11](./11-reader-site.md). **No editar** `CrepeCanvas.tsx`.

---

## Superficie

```
[ árbol Home ]   [ hero + Crepe read-only ]
                 búsqueda ⌘K / Ctrl+K
```

- Árbol: `HomeTreeNode` del manifest; click → `location` a `basePath + route` (full navigation, no SPA client router obligatorio). Full load es aceptable en v1 (Crepe se monta una vez por página).
- Búsqueda: `flattenLibrary` + `rankLibraryHits` (`packages/ui/home/utils/tree.ts`). Paleta simple (input + lista). Sin i18n desktop; copy ES/EN mínimo o solo EN en v1 — **decisión:** strings en el bundle en **inglés**; 11e puede documentarlo. No HeroUI.
- Canvas: `createSlashCrepe({ root, markdown, editable: false })`. Sin `comments`, sin persistir `onMarkdown`.
- Hero solo lectura: `title` / `icon` / `cover` / `coverPosition` vía `splitFrontmatter` + los mismos tokens que el editor (cover como `<img>` o CSS background; no el picker). Reusar helpers de `packages/ui/src/editor/hero/` **solo si** no tiran DOM de menús; si arrastran chrome, hero mínimo en reader (icon + h1 + cover img).
- Imágenes: `proxyDomURL` resuelve href relativo contra `basePath + content/` + path del doc (`resolveRepoPath`).
- Links internos `*.md`: interceptar click, `resolveRepoPath`, navegar a `routeFor`. Externos: `target=_blank` rel noreferrer.
- Mermaid / callouts / toggles: salen de Crepe (mismas features que `createSlashCrepe` hoy).

Code-split: v1 un solo IIFE. Si el bundle explota (>~1.5 MB gzip preocupación), follow-up: lazy mermaid. No bloquear 11c.

---

## Boot

Leer `window.__SLASH_MD__`. `fetch(manifestUrl)` + `fetch(basePath + page.content)`. 404 de markdown → mensaje “Page not found” en el canvas, árbol sigue.

Tema: `prefers-color-scheme` + tokens (`packages/ui` `tokens.css` / Crepe CSS). Sin ThemeProvider desktop.

---

## Bundle

`apps/reader/src/main.ts` → esbuild IIFE `apps/reader/dist/reader.js` (+ CSS extraído o inyectado).

`build-site` **copia** `dist/reader.js` a `_site/assets/reader.js` (deja de usar el stub).

Script root: `"reader:build"` = esbuild; `build-site` depende de `dist/` (fallar si falta, o llamar build).

---

## Qué puede salir mal

| Fallo | Qué hacer |
|-------|-----------|
| Project Pages `/Help/` y fetch `/manifest.json` | Todo fetch usa `basePath` |
| Crepe editable a pesar de flag | Mismo path que wiki desktop (`editable: false` post-`create`) |
| Slash menu en read-only | ProseMirror `editable: () => false` lo corta; spec smoke: no hay `/` insert |
| Cover `cover: images/x.png` | `proxyDomURL` + copia 11b |
| Link `[x](../foo.md)` | `resolveRepoPath` + `routeFor`; si no está en manifest, dejar el href y que 404e el HTML |
| CSP GitHub Pages | Sin inline eval; boot JSON en script estático del HTML (11b) está bien |
| Bundle incluye comments plugin | `comments: false` (default) — no registrar `registerComments` |
| Árbol con paths de repo vs routes | Click usa `pages[]` lookup por `path` → `route` |
| Servir `_site` en `file://` | No soportar; solo http (Pages o `npx serve _site`) |

---

## Archivos

- `apps/reader/src/main.ts`, `tree.ts`, `search.ts`, `boot.ts`
- `apps/reader/esbuild.mjs`
- CSS: import editor theme / tokens; **no** copiar Home desktop
- Specs: ranking ya cubierto en ui tree; añadir spec de `resolveInternalHref` → route (puro)
- Smoke: fixture build + jsdom fetch mock monta árbol (opcional; no harness Milkdown a menos que sea barato)

No workflow. No Init.

---

## Criterios

- [x] Abrir `/` y una nested page: árbol, título, cuerpo Crepe (callout o mermaid de fixture)
- [x] `editable: false`: no autosave, no slash útil
- [x] ⌘K encuentra por título
- [x] Click árbol y wikilink relativo cambian de página
- [x] Imagen relativa se ve
- [x] Stub de 11b sustituido por `dist/reader.js`
