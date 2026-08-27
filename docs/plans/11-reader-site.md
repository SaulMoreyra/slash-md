# Plan 11 — Sitio de lectura (GitHub Pages)

> Un repo de docs (Help público o wiki personal) opta a un sitio estático con **árbol + búsqueda + preview Crepe** (sin edición). El Markdown no se convierte a otro formato: el workflow genera una URL por `.md` y el reader pinta con el mismo parser que el Desktop.

**No depende de** [10](./10-wiki-after-github-merge.md). **No toca** Milkdown `CrepeCanvas` ni `packages/ui` vanilla DOM salvo `createSlashCrepe({ editable: false })` (API ya existente).

Hoy la lectura pública es [Docsify](../READING.md) (`docs-site/index.html`): otro parser, sin hero/icon/cover, sin el árbol de Home. Fuera de v1 en [DECISIONS.md](../DECISIONS.md); este plan lo sustituye como camino recomendado.

---

## Objetivo

```
.slashmd.json  site.enabled
        │
        ▼
push/merge a defaultBranch
        │
        ▼
reusable workflow  →  _site/  (un index.html por página + Crepe)
        │
        ▼
GitHub Pages
```

Misma tubería para **workspace** (Help, PR → merge) y **personal** (push a `main`). El modo no entra al build.

---

## Orden

```
11a  contrato site + rutas (core)
        │
        ├──► 11b  build-site (Node, shells + manifest)
        │         │
        │         ▼
        │    11c  reader UI (árbol, ⌘K, Crepe read-only)
        │         │
        │         ▼
        │    11d  reusable workflow
        │         │
        │         ▼
        └──► 11e  Init toggle + READING.md
```

No saltar **a → b → c**: el workflow (d) no tiene contra qué correr sin `_site` + `reader.js`. **e** puede ir en paralelo a **d** tras **a** (el toggle no exige Pages live).

| # | Plan | Entrega |
|---|------|---------|
| a | [11a-site-config-and-routes.md](./11a-site-config-and-routes.md) | `site` en `.slashmd.json`; parse en core; `routeFor` / qué `.md` publicar |
| b | [11b-build-site.md](./11b-build-site.md) | `apps/reader`: walk + `_site/` (manifest, copias, un HTML por página) |
| c | [11c-reader-ui.md](./11c-reader-ui.md) | Bundle: árbol, búsqueda, Crepe `editable: false`, hero, links internos |
| d | [11d-github-workflow.md](./11d-github-workflow.md) | `workflow_call` + snippet para Help / personal |
| e | [11e-init-and-docs.md](./11e-init-and-docs.md) | Toggle Init/Settings; deprecar Docsify en READING |

---

## Decisiones (cerradas)

| Tema | Decisión |
|------|----------|
| Opt-in | `site.enabled` en `.slashmd.json`. Ausente o `false` → el job **sale 0** y **no** despliega (no pisa Pages) |
| Verdad del wiki | `contentPath`, `sections`, `templatesPath` siguen en la raíz del JSON. **No** duplicar en el YAML |
| Modo | Ignorado. Personal y workspace publican cuando se actualiza `defaultBranch` |
| Formato | Crepe en el cliente. **No** HTML pre-renderizado por bloque; **no** Docsify/Jekyll |
| URLs | Un `index.html` por `.md` (pretty path). **No** hash router como Docsify |
| Rutas | Relativas a `contentPath`. `docs/foo.md` → `/foo/`. `README.md` en la raíz del content → `/` |
| Templates | No publicar `_templates/`, `templates/`, ni `templatesPath` (`isTemplateRepoPath`) |
| Sidecar | No publicar `*.slash.md` |
| Búsqueda v1 | Título + path (`flattenLibrary` / `rankLibraryHits`). Full-text del cuerpo = fuera |
| Grafo / backlinks | Fuera. El “árbol” es el de carpetas de Home |
| UI | `apps/reader` **vanilla** + tokens Crepe. **No** Electron, **no** HeroUI, **no** Home desktop |
| Crepe | `createSlashCrepe({ editable: false })`. Sin comments, sin `onMarkdown` persistente |
| Bundle | esbuild IIFE (mismo patrón que el webview VS Code) |
| Base path | `site.basePath` opcional. Si falta, el workflow usa `/${{ github.event.repository.name }}/` (project Pages). User site / custom domain: `"basePath": "/"` |
| Workflow en el repo de docs | El autor **añade** un YAML de 10 líneas. Init **no** escribe `.github/` (Pages además exige Settings) |
| Docsify | Deja de ser el camino recomendado en 11e. El archivo `docs-site/` puede quedar hasta borrar en un follow-up |
| `mode: local` | `site.enabled` se puede guardar; el workflow no corre sin GitHub. Sin Pages |
| Repo slash-md | El reusable hace checkout de este repo para `npm ci` + build. Tiene que ser **legible** por el repo de docs (público, o el mismo org con permiso) |

---

## Qué no es este plan

- CMS multi-tenant ni “elige tu equipo”.
- Generar el sitio en la máquina del autor (otro Publish).
- Preview de PRs (Cloudflare/Netlify).
- Sitio privado (Pages privado = Enterprise). Repos privados: el opt-in existe; el deploy es responsabilidad del plan de GitHub.

---

## Comandos (al cerrar cada slice)

```bash
npm run test -- --run packages/core
npm run test -- --run apps/reader
npm run typecheck
```

Tras 11c, smoke local:

```bash
node apps/reader/build-site.mjs   # contra fixtures o un clone de Help
# servir _site (python -m http.server) y abrir / y una nested page
```
