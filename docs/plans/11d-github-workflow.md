# Plan 11d — Reusable workflow

> Help (u otro repo) no construye Crepe. Llama un workflow en slash-md que genera `_site` y despliega Pages.

**Depende de:** [11b](./11b-build-site.md) + [11c](./11c-reader-ui.md). **Índice:** [11](./11-reader-site.md).

---

## En slash-md

`.github/workflows/publish-reader.yml`:

```yaml
on:
  workflow_call:
    inputs:
      reader_ref:
        type: string
        required: false
        default: ""   # ver abajo
      base_path:
        type: string
        required: false
        default: ""   # vacío → SITE_BASE=/${{ github.event.repository.name }}/
```

**Ref del reader:** el YAML llamado está pineado (`@v1`), pero `actions/checkout` del **código** de slash-md no viene gratis. Input `reader_ref` default `v1` (tag). Documentar: el pin del `uses:` y `reader_ref` deben coincidir. Alternativa más tarde: paquete npm.

Pasos:

1. `actions/checkout@v4` — repo **caller** (Help).
2. `actions/checkout@v4` — `repository: SaulMoreyra/slash-md` (input `reader_repo` por si hay fork), `path: .slash-md-reader`, `ref: inputs.reader_ref`.
3. `actions/setup-node@v4` — Node 22.
4. `npm ci` en `.slash-md-reader`.
5. `npm run reader:build` (esbuild) en `.slash-md-reader`.
6. `node .slash-md-reader/apps/reader/build-site.mjs` con `SITE_ROOT=$GITHUB_WORKSPACE`, `SITE_OUT=$GITHUB_WORKSPACE/_site`, `SITE_BASE` desde input o `/${{ github.event.repository.name }}/` (si el repo es user/org site `*.github.io`, default `SITE_BASE=/` — detectar sufijo `.github.io`).
7. Si skip (`enabled` false): **no** `upload-pages-artifact`. Job verde.
8. Si hay `_site`: `actions/configure-pages`, `upload-pages-artifact`, `deploy-pages`.
9. Permissions en el callable: `contents: read`, `pages: write`, `id-token: write`. Environment `github-pages`.

Concurrency: `group: pages-${{ github.repository }}`, `cancel-in-progress: true`.

`.slash-md-reader` no se sube al artifact (out es `_site` en el caller).

---

## En el repo de docs (Help / personal)

```yaml
# .github/workflows/docs.yml
name: Docs site
on:
  push:
    branches: [main]   # = defaultBranch de la wiki
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  site:
    uses: SaulMoreyra/slash-md/.github/workflows/publish-reader.yml@v1
```

Mismo archivo para personal y workspace. El trigger es **push a `main`**, no el modo.

Primer uso: Settings → Pages → **GitHub Actions** (no “Deploy from a branch” + carpeta `/docs`). Si dejan branch `/docs` + Docsify, **pelean**. 11e lo dice.

---

## Qué puede salir mal

| Fallo | Qué hacer |
|-------|-----------|
| slash-md privado, Help público | Checkout 2 falla. Documentar: reader repo visible, o más tarde npm |
| `defaultBranch` es `master` | El YAML del caller usa esa rama, no hardcode en el reusable |
| `site.enabled` false + workflow presente | Skip, Pages intacto |
| Project vs user site | Detectar `.github.io`; input `base_path` override |
| `npm ci` en monorepo | Workspaces: ci en la **raíz** de slash-md (`.slash-md-reader`), no solo `apps/reader` |
| Artifact > límite | No copiar `node_modules`; solo `_site` |
| Primer deploy sin environment | `deploy-pages` lo crea; puede pedir approve al admin — documentar |
| Workflow en PR | **No** en v1 (`push` a default). Preview = fuera |
| Tag `v1` no existe aún | Usar `@main` en el snippet hasta el primer release; el plan crea el YAML, el tag es al ship |

---

## Archivos

- `.github/workflows/publish-reader.yml`
- Snippet en [11e](./11e-init-and-docs.md) / READING (no hace falta un repo Help en este monorepo)
- Opcional: workflow de **este** repo que no despliega Help (slash-md no es una wiki de producto)

No Init. No cambiar Desktop.

---

## Criterios

- [x] Caller con `site.enabled: true` + Pages=Actions produce el sitio con árbol y una nested page
- [x] `enabled: false` → job verde, sin deploy
- [x] Snippet documentado (10 líneas)
- [x] `SITE_BASE` correcto para repo `Help` (`/Help/`)
