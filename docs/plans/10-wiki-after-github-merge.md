# Plan 10 — Wiki tras merge en GitHub

> Si el PR se mergea **fuera** de la app, la wiki local no se entera y la `pub/…` queda como borrador fantasma. Detectar → aterrizar en la wiki → borrar la rama local.

**Depende de:** [08a](./08a-publications-mine-only.md)–[08f](./08f-discard-ui.md) (`kind`, card, Leave, `deleteLocalPubBranch`, Descartar). **No depende de** [09](./09-workpane-closed-tree-empty.md).

Hoy `findOpenPull` + `listOpenPulls` solo ven PRs **abiertos**. Tras merge en github.com: `getPublicationState` pierde `prNumber` y la pub se ve **draft**. `pull --ff-only` de la wiki solo corre en Publicar / Leave / Descartar. `deleteLocalPubBranch` solo en Publicar y Descartar. Leave **no** borra la rama.

`PublicationKind` ya tiene `"published"` (chip success + `kindPublished`). Nadie lo asigna.

---

## Orden

```
10a  detectar merged → kind published
        │
        ▼
10b  aterrizar wiki (host + CTA + prune)
```

| # | Plan | Entrega |
|---|------|---------|
| a | [10a-detect-merged-publication.md](./10a-detect-merged-publication.md) | **Hecho.** GitHub `state=all`; `kind: published`; chip/línea |
| b | [10b-land-wiki.md](./10b-land-wiki.md) | **Hecho.** `landPublication`; Leave borra si merged; prune Otras; CTA Actualizar wiki |

No saltar **a → b**: b necesita `kind` + `prNumber` del PR mergeado.

---

## Decisiones (cerradas)

| Tema | Decisión |
|------|----------|
| Verdad | GitHub `merged` / `merged_at`. **No** `git branch --merged` (squash no deja esos commits en `main`) |
| Historial | **No** listar PRs mergeados que ya no tienen ref local. Solo reclasificar `pub/` que aún existen |
| Auto-checkout | **No** en `homeTree` / refresh. Detectar sí; cambiar HEAD no (editor, dirty, read-only) |
| `kind` | Reusar `published`. Open gana a merged (mismo head, PR nuevo) |
| Ahead local | Commits en la `pub/` que **no** están en `pr.head.sha` → seguir **draft** (trabajo nuevo). No borrar |
| CTA | **Actualizar wiki** (`PublicationCta.Land`). No reusar “Publicar” |
| FAB | Sigue solo `canSendReview`. Published limpio no envía |
| Leave | Si HEAD está published: switch + pull + **borrar** esa `pub/` (el camino natural post-merge) |
| Otras published | Unmounted + no ahead → **prune** en 10b (desaparecen del pane). No Resume a una pub ya en la wiki |
| Descartar | **Ocultar** si `published` (copy “no entra a la wiki” es mentira). Land / Leave bastan |
| Dirty land | Confirmación: cambios de este dispositivo que no están en la wiki **se pierden** (`-D`) |
| `publishBatch` | Sigue mergeando PRs abiertos. Extraer `landOnWiki` para el tramo post-merge (ya existe `alreadyMerged`) |
| Auth | Sin token no hay `published` (no adivinar). Offline = draft, Leave/pull best-effort como hoy |
| Lookup fail | Como 08a: no marcar published. Incluir local como draft |
| Editor | Cerrar página **después** de land/leave OK (igual que 08c) |
| Jerga | Nada de `pub/…` ni `PR #` en card/filas. GitHub en `⋯` si hay `prUrl` |

Fuera de 10: pubs ajenas mergeadas; historial de publicadas; auto-land al abrir la app.

---

## Comandos

```bash
npm run test -- --run packages/github
npm run test -- --run apps/desktop/src/screens/home
npm run desktop:typecheck
npm run desktop:lint
```
