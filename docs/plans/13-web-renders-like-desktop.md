# Plan 13 — El sitio Pages renderiza como el Desktop (dual-build web del mismo app)

Índice de los slices 13a–13e. Decisiones y alcance global.

## Objetivo

Que la documentación publicada a GitHub Pages se vea exactamente como la app desktop:
mismo rail (árbol + búsqueda + tema), mismos modales, mismos comandos. Para lograrlo se
**web-builda la misma app desktop** en "modo lectura" en vez de mantener la UI vanilla de
`apps/reader`.

- **Enfoque A (aprobado):** dual-build del app desktop. Un `vite.web.config.ts` sin
  `vite-plugin-electron`, con `base: "./"`, emite `app/desktop/dist-web`.
- El sitio es **solo lectura**: la columna de work (Inbox/Drafts/Publications) y el pane de
  edición quedan ocultos; el árbol + búsqueda (⌘K) + cambio de tema siguen funcionando.
- Navegación = **carga completa por documento** (`location.href` al route) igual que el
  reader actual. Sin router SPA.

## Cómo se encadena (contrato existente)

Todo el acoplamiento a Electron pasa por un único contrato: `window.slashmd`
(`DesktopApi` en `apps/desktop/shared/api.ts`). Los controllers (`useWorkspace`,
`usePageSession`, `useFormatter`) solo hablan con esa interfaz. Un adapter "fetch-based"
sobre `manifest.json` arranca **toda la app sin cambios**:

- `getWorkspace` → raíz `/` + config `mode: personal`
- `homeTree` → árbol desde `manifest.tree`, `canWrite: false`
- `openPage` → si no es la página de arranque, redirige (`location.href = route`);
  si es la de arranque, hace fetch del markdown y devuelve `PagePayload`
- `resolveImages` → mapea `src` → URL del site
- APIs de escritura rechazan ("La página es de solo lectura")

## Build del site

`apps/reader/src/build-site.ts` ya genera `manifest.json` + shells por-route.
Ahora esos shells en vez de cargar `reader.js` (vanilla), cargan el bundle React del app
desktop web-buildado (`assets/main.*.js/css` extraídos del `index.html` de `dist-web`).

## Slices

| Slice | Plan | Alcance |
|-------|------|---------|
| 13a | [13a-web-build.md](./13a-web-build.md) | Config Vite web + html + `main.web.tsx` + adapter static read-only |
| 13b | [13b-adapter.md](./13b-adapter.md) | `WebHostBoot` / `createWebApi` — implementado dentro de 13a |
| 13c | [13c-page-boot.md](./13c-page-boot.md) | `WebPageBoot` — abre la página de arranque una vez |
| 13d | [13d-chrome-lite.md](./13d-chrome-lite.md) | Chrome-lite: ocultar rail-primary, work items, write keys; publicar gate |
| 13e | [13e-site-pipeline.md](./13e-site-pipeline.md) | Reader copia bundle web; links internos → route |

## Criterios de aceptación

- [ ] (13a) `npm run desktop:web:build` produce `dist-web/` (React + alías a `packages/*/src`)
- [ ] (13c) Al abrir `/getting-started/` se carga esa página (bootstrap auto)
- [ ] (13d) Sin My Work, sin CTA "nueva página", sin ⌘N/⌘,/⌘1-4/⌘W; editor `contenteditable=false`
- [ ] (13d) Publicar oculto cuando `page.canWrite === false`
- [ ] (13e) `site:build` + `site:preview`; links internos `.md` y rutas → route del site
- [ ] `desktop:typecheck`, `desktop:lint`, roundtrip y specs 409 del area desktop verdes
