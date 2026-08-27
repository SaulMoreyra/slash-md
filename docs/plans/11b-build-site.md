# Plan 11b — `build-site` (artifact estático)

> Node recorre la wiki y escribe `_site/`: manifest, Markdown copiado, un HTML por página. Todavía puede cargar un `reader.js` stub; Crepe es [11c](./11c-reader-ui.md).

**Depende de:** [11a](./11a-site-config-and-routes.md). **Índice:** [11](./11-reader-site.md).

---

## Env / CLI

| Var | Default | Significado |
|-----|---------|-------------|
| `SITE_ROOT` | `cwd` | Repo de docs (Help), no slash-md |
| `SITE_OUT` | `$SITE_ROOT/_site` | Artifact |
| `SITE_BASE` | `site.basePath` o `""` | Override CI (project Pages) |

Si no hay `.slashmd.json` o `site.enabled !== true` → **exit 0**, no crear `_site` (o borrar out). Log claro `slash-md site: skipped`.

---

## Walk

No meter `node:fs` en `packages/core`. Walk en `apps/reader` (mismo criterio que `walkMd` en `electron/workspace.ts`: skip `entry.name.startsWith(".")`).

Filtrar con `shouldPublishPage`. Títulos con `labeledTitle` + `splitFrontmatter`. Árbol: `groupHomeLevel` / el mismo recorte que `buildLevel` (`electron/workspace.ts`) — **extraer `buildLevel` a core** si cabe en ~40 líneas puras (`titleOf` async inyectado), o duplicar el recorte en reader con spec de fixture. Preferir extraer a `packages/core/src/homeTree.ts` (ya tiene `groupHomeLevel`) para no drift.

No incluir páginas template.

---

## Layout del artifact

```
_site/
  .nojekyll
  manifest.json
  assets/reader.js      # stub en 11b; bundle real en 11c
  content/<rel-posix>   # copia de cada .md publicado (path relativo a contentPath)
  <route>/index.html    # una por página; `/` → _site/index.html
```

Imágenes: copiar ficheros referenciados (`imageSrcs` / `referencedImages` en core) **y** el directorio `images/` bajo `contentPath` si existe (el Desktop guarda covers ahí). Destino `_site/content/…` conservando rel posix para que el fetch coincida.

`manifest.json`:

```json
{
  "name": "Help",
  "basePath": "/Help/",
  "tree": [ { "kind": "folder", "path": "…", "title": "…", "children": [] } ],
  "pages": [
    { "path": "producto/guia.md", "title": "Guía", "route": "/producto/guia/", "content": "content/producto/guia.md" }
  ]
}
```

`path` = repo path posix (como Home). `content` = URL relativa al sitio para `fetch`.

---

## Shell HTML

Todas las páginas **el mismo** HTML salvo el boot:

```html
<script>
  window.__SLASH_MD__ = {
    basePath: "/Help/",
    page: "producto/guia.md",
    manifestUrl: "/Help/manifest.json"
  };
</script>
<script src="/Help/assets/reader.js" defer></script>
```

`basePath` y `manifestUrl` **absolutos al sitio** (con prefix). En 11b el stub puede pintar el título desde el manifest y un `<pre>` del markdown: basta para spec de “80 files → 80 index.html”.

`<base href>`: **no** usar si rompe `fetch` relativos; preferir prefix explícito en boot.

---

## Qué puede salir mal

| Fallo | Qué hacer |
|-------|-----------|
| Jekyll se come `_algo` | `.nojekyll` siempre |
| Windows paths | Solo posix en manifest y destinos |
| `SITE_OUT` dentro de `contentPath` | No copiar `_site` al walk (nombre `_site` skip o out fuera del root) |
| 10k imágenes | Copiar solo `images/` + srcs referenciados; no todo el repo |
| README → `index.html` en raíz | Spec fixture `README.md` + `docs/README.md` con contentPath `docs` |
| `enabled: false` deja artifact viejo en CI | Job skip **no** upload (11d). Local: no escribir out |
| Covers `../images/x` | `referencedImages` + `resolveRepoPath`; copiar el archivo resuelto |

---

## Archivos

- `apps/reader/package.json` — workspace; scripts `build-site`, luego `build` (11c)
- `apps/reader/build-site.mjs` (o `src/build-site.ts` corrido con node)
- `apps/reader/src/walk.ts`, `src/shell.ts`, `src/stub-reader.js`
- `apps/reader/fixtures/wiki/` — `.slashmd.json` + 3–4 `.md` + una imagen + `_templates/no.md`
- Specs: fixture → lista de `index.html` + templates **ausentes** + skip si `enabled: false`
- Root `package.json`: `"reader:site": "npm run build-site -w @slash-md/reader"`

No Crepe. No Action.

---

## Criterios

- [x] Fixture con `enabled: true` genera un HTML por página publicada + `manifest.json` + `.nojekyll`
- [x] `_templates/*.md` no aparece
- [x] `enabled: false` → exit 0, sin out (o out vacío documentado)
- [x] Rutas coinciden con `routeFor` (11a)
- [x] Stub carga y el árbol del manifest lista las páginas (smoke)
