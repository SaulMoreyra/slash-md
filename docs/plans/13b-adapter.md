# 13b — Adapter static read-only (`createWebApi`)

**Hecho.**

## Objetivo

Adapter `DesktopApi` fetch-based que arranca la app completa contra `manifest.json`
del site, en modo solo lectura.

## Archivos

- `apps/desktop/src/host.ts`
  - `WebHostBoot { basePath, page, manifestUrl }` tipado
  - `getWebBoot()` lee `window.__SLASH_MD__`; `isWebHost()` lo usa
- `apps/desktop/src/web/types.ts` — `WebSiteManifest` / `WebSitePage` (espejo del reader)
- `apps/desktop/src/web/api.ts` — `createWebApi(): DesktopApi`, clase `StaticWebApi`
  con `manifestPromise` cacheado. Respuestas clave:
  - `getWorkspace` → `root: "/"`, config `normalizeRepoMode("personal")`,
    `site.enabled: true`, `name`/`contentPath`/`basePath` del manifest
  - `homeTree` → `HomeTreePayload` con `roots: manifest.tree`, `canWrite: false`,
    `drafts/inbox/selected: []`
  - `openPage` → si `path !== boot.page` redirige a `hrefForRoute(route)` y devuelve
    una Promesa que nunca resuelve; si es la de arranque, `fetch` del markdown +
    `splitFrontmatter` → `PagePayload` (`repoMode: personal`, `canWrite: false`)
  - `resolveImages` → mapea `src` a `joinSitePath(basePath, "content/"+rel)`
    (3 formas: `src`, sin `./`, normalizada)
  - `loadThreads` → `{threads:[], prUrl:null, canWrite:false, headOid:null}`
  - `listTemplates` → `[]`; `detectGit`/`probeGhAuth` stubs
  - `setTheme` → `localStorage["slash-md-theme"]`; `onTheme` → `matchMedia`
  - `openUrl` → `window.open`
  - write-only / folder-picker / subscribe → no-op o rechazan
    `"La página es de solo lectura"`

## Verificación

- `npm run desktop:typecheck` verde
- En `site:preview`, boot de la app con API activa y árbol del manifest
