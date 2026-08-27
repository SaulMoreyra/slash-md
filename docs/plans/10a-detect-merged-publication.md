# Plan 10a — Detectar publicación ya mergeada

> **Hecho.** El host sabe que el PR está en la wiki. La card dice Publicada, no Borrador.

**Depende de:** [08a](./08a-publications-mine-only.md) + [08b](./08b-publication-status-card.md). **Siguiente:** [10b](./10b-land-wiki.md).

---

## Objetivo

Hoy `findOpenPull` / `listOpenPulls` usan `state=open`. Tras merge en GitHub la pub montada cae a `kind: "draft"` sin `prNumber`.

```
GET /repos/{owner}/{name}/pulls?head={owner}:{branch}&state=all
```

Open **gana**. Si no hay open y alguno tiene `merged` / `merged_at` → `published` y **conservar** `prNumber` / `prUrl`. Si no → draft.

### Puro (testeable sin git)

`packages/github` (archivo nuevo, p.ej. `publicationPull.ts`):

```ts
kindFromPulls(pulls: GithubPull[]): "draft" | "in_review" | "published"
pickPullForPublication(pulls: GithubPull[]): GithubPull | undefined
  // el open, si no el merged más reciente (merged_at / number)
```

Ahead local **no** va en este helper: 10b lo usa para no borrar. En 10a, si hay PR merged y no hay open → `published` aunque el working tree esté sucio (la línea lo dirá en 10b). Si hay commits **después** del `head.sha` del PR mergeado: 10a aún puede marcar published; 10b reclasifica a draft antes de prune. Alternativa más simple en 10a: **published solo si no hay open**. El ahead se resuelve en 10b. **Hacer eso.** 10a = solo GitHub.

### Host

`findPullsForHead(token, repo, branch)` — `state=all`, misma forma `head` que `findOpenPull`. No paginar de más: una rama de pub no tiene 100 PRs; `per_page=20` basta.

- `getPublicationState`: dejar de usar solo `findOpenPull`. `kind` + `prNumber`/`prUrl` del `pickPullForPublication`.
- `listPublications`: `listOpenPulls` igual. Para cada `refs/heads/pub/…` **local** que **no** esté en `pullByBranch`, `findPullsForHead` en paralelo (`Promise.all`). Remotes `origin/pub/` sin local: **no** lookup merged (no resucitar historial; 08a las excluye si no hay open).
- `resumePublication`: misma clasificación que state.
- `canPublishBatch` en `home.ts`: sigue `kind === "in_review" && prNumber`. Published **no** enciende Publicar.
- `loteReview`: `getPull(prNumber)` ya funciona en merged (`state: "merged"`). Status line de 08b ignora kind published hoy (`kind !== in_review` → `null`). Añadir línea.

### UI (mínima, 08b)

- Chip: ya `kindPublished` + `success`. Spec de card con `kind: published`.
- `publicationStatusLine`: si `kind === published` → `home.publication.statusOnWiki` (“Ya está en la wiki”) **antes** de wikiSync/in_review. No “Sin enviar”.
- `publicationCta`: published → `None` (el Land es 10b).
- FAB: no cambia (no `canSendReview` de más).
- Otras: una fila published se ve “Publicada”. Click Resume **sigue** montando (10b lo cambia). No ocultar aún.

`isOwnPublication`: el merged pull trae `author`. Pasar `{ author }` como hoy para open; si lookup merged ok, no es `null`. Lookup fail (`undefined`) + local → incluir draft.

---

## Qué puede salir mal

| Fallo | Riesgo | Qué hacer |
|-------|--------|-----------|
| `state=all` 422 / head mal | Cero PRs | Igual que open vacío: draft si local |
| Open + merged mismo head | Publicado y “en revisión” a la vez | Open gana |
| Squash merge | `merged_at` sí; commits locales ≠ `main` | 10a published OK. 10b `-D` no `-d` (ya fallback) |
| Lista de 15 pubs locales | 15 GETs extra | Solo las que **no** tienen open. `Promise.all`. Spec de que open no dispara el segundo GET |
| `listOpenPulls` fail (08a `lookupFailed`) | No llamar merged; no published | Drafts locales se quedan |
| Sin token | No published | OK |
| `loteReview` de PR merged | Copy “Lista para publicar” | Status line mira **kind** first; no `isPublishReady` |
| Chip Publicada y CTA Publicar | `canPublishBatch` true | Guardar `kind === in_review` (ya) + spec |
| PR closed **sin** merge | Draft | `merged_at` ausente |
| Título del PR vs slug | 08a no usa `pr.title` | Sin cambio |
| Rate limit | Lookup fail | No published |
| HEAD pub ajena merged | Card Actual published; no está en Otras | OK (08a) |

---

## Archivos

- `packages/github/src/publicationPull.ts` + spec (kindFromPulls / pick)
- `packages/github/src/api.ts` — `findPullsForHead`
- `apps/desktop/electron/publication.ts` — state + list + resume
- `apps/desktop/electron/home.ts` — canPublishBatch sin cambio de regla; verificar
- `apps/desktop/src/screens/home/utils.ts` + `utils.spec.ts` — status line published
- `CurrentPublication.spec` — chip Publicada, sin CTA
- i18n `statusOnWiki` es/en
- Spec host si hay patrón (`ownPublication.spec` vive en home): extraer clasificación de list a función pura si el loop se pone opaco

No `landOnWiki`. No borrar ramas. No IPC nuevo.

---

## Criterios

- [x] HEAD con PR mergeado → `kind: "published"`, `prNumber`/`prUrl` presentes
- [x] HEAD con PR open → `in_review` (aunque exista un merged viejo)
- [x] HEAD draft local sin PR → `draft`
- [x] Card: chip Publicada + “Ya está en la wiki”; cero Publicar / Enviar
- [x] Otras: local sin open + PR merged → fila Publicada, no Borrador
- [x] `origin/pub/` sin local + merged **no** aparece
- [x] Lookup fail no convierte a published
- [x] Specs de `kindFromPulls` / status line
