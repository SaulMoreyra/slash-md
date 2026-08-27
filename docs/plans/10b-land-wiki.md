# Plan 10b — Aterrizar en la wiki

> Published deja de ser un callejón. Actualizar wiki / Leave traen `main` y borran la `pub/` local. Otras mergeadas limpias desaparecen.

**Depende de:** [10a](./10a-detect-merged-publication.md). Extrae el tramo final de `publishBatch`.

---

## Objetivo

```
Actual  [Publicada]                    [⋯]
Título
Ya está en la wiki
                    [Actualizar wiki]
```

Tras OK: HEAD = defaultBranch, wiki `pull --ff-only`, rama local `pub/…` borrada, editor cerrado, toast corto.

### Host — `landOnWiki`

Extraer de `publish.ts` `syncDefaultBranch` + `deleteLocalPubBranch` a p.ej. `electron/pubBranch.ts` o `electron/landWiki.ts`:

```ts
landOnWiki(cwd, token, defaultBranch, pubBranch): Promise<void>
```

1. `fetch` origin defaultBranch (best-effort, igual que publish).
2. Switch a defaultBranch (error actual si dirty impide switch **sin** `-f`).
3. `pull --ff-only origin defaultBranch`.
4. `deleteLocalPubBranch` (`-d` luego `-D`).

`publishBatch` llama esto tras merge / `alreadyMerged`. **No** `switch -f` ni `clean` (eso es Descartar). Si el working tree sucio bloquea el switch: error claro, HEAD sigue en la pub, rama intacta.

IPC `landPublication(branch?: string): Promise<void>`

- Sin arg: HEAD debe ser `pub/` published (o `alreadyMerged` equivalente: GitHub merged, no ahead).
- Con arg: esa rama, **unmounted** (Otras). Switch no aplica a HEAD salvo que `HEAD === branch`.
- Merge in curso → error (como leave).
- No published / still open → error (“sigue en revisión”).
- Ahead de `pr.head.sha` → error o no ofrecer (10a+check). No `-D` de trabajo nuevo.

`AppOperation.LandPublication` + i18n operations.

### Leave

`leavePublication`: si el PR de HEAD está merged (misma pick que 10a) y **no** ahead → `landOnWiki` en vez de switch+pull dejando la rama. Si draft / in_review: comportamiento **actual** (switch + pull, rama viva).

Así “Volver a la wiki” post-merge de GitHub es el camino natural; no hace falta el CTA. El CTA cubre a quien no abre el `⋯`.

### Prune en Otras

Tras clasificar, **unmounted** + published + no ahead: `deleteLocalPubBranch` best-effort **sin** cambiar HEAD. Sitio: `listPublications` al final **o** helper `pruneMergedLocals` llamado desde `buildHomeTree` (no desde un GET de UI). Fallo → ignore; la fila published sigue y el CTA/menú la limpia.

**No** prune si ahead. Esas ramas: 10a las dejó published; aquí **reclasificar a draft** si `rev-list <mergedSha>..refs/heads/branch` no está vacío, para que puedan Enviar de nuevo. Spec.

`git fetch --prune origin` una vez por land/leave (no en cada homeTree) para tirar `origin/pub/` huérfanas.

### Ahead

```
git rev-list --count <pr.head.sha>..refs/heads/<branch>
```

> 0 → no published para mutar; kind draft (actualizar 10a en host list/state **aquí**, no reabrir 10a). Si 10a ya pintó published un frame: el refresh de land no corre; el próximo `homeTree` debe reclasificar. Hacer el check **en getPublicationState / list** en este plan (host). 10a se queda en GitHub puro; 10b añade ahead → draft.

### UI

- `PublicationCta.Land` → copy `home.publication.landWiki` (“Actualizar wiki”).
- `publicationCta`: si `kind === published` → Land. Send/Publish no. Spec: nunca dos CTAs.
- `PublicationCtaButton`: tercer branch o mapa cta → { label, onPress }. `onLand`.
- FAB: published no tiene `canSendReview` si no ahead; si ahead es draft otra vez → FAB Enviar OK.
- `⋯` published: Wiki (= Leave, ahora land), GitHub si `prUrl`, copiar rama. **Sin Descartar**.
- Otras published (si el prune no las comió): click fila **no** Resume; `onLand(branch)`. Menú: sin Descartar, o solo land. Preferir: prune las limpia; si queda una, fila llama land.
- Editor: `onClosePage` tras land OK si se desmontó HEAD (como Leave).
- Toast `home.publication.landed` (“Wiki actualizada.”).
- Dirty que **bloquea switch** (porcelain, no ahead de sha): error banner, no modal nuevo. El usuario guarda/descarta archivos o usa Descartar **solo si kind volvió a draft**. Published + untracked: publish hoy falla el switch; mismo error. No `switch -f` en land.
- Confirm extra **solo** si vamos a `-D` con ahead: **no ocurre** (ahead = draft). Cero modal nuevo.

`canWrite` sigue true mientras HEAD es pub (aunque published). Land es la salida a read-only wiki.

---

## Qué puede salir mal

| Fallo | Riesgo | Qué hacer |
|-------|--------|-----------|
| Land en `homeTree` | Checkout sorpresa, canvas huérfano | Prohibido. Prune **solo** unmounted |
| Leave in_review borra la rama | Pierdes el draft | Leave solo land si merged && !ahead |
| Squash: `-d` falla | Rama zombie | Ya `-D` en `deleteLocalPubBranch` |
| Switch dirty | “PR merged, but could not switch…” | Reusar mensaje; no `-f` |
| `pull --ff-only` diverge | Wiki local con commits raros | Error; HEAD ya en default; **no** borrar pub (orden: borrar **después** de pull OK). Si pull falla tras switch, la pub local sigue para reintentar |
| Orden switch → pull → delete | Delete antes de pull | Delete **último** |
| Prune unmounted de la montada | HEAD huérfano | `branch !== currentBranch` |
| Land Otras mientras estás en otra pub | Switch a main te saca de la actual | Otras land **solo** `-D` de esa rama, sin switch. Copy: desaparece de la lista; Actual intacta |
| Click fila published = Resume | Montas un muerto | Fila published → `onLand` |
| `publishBatch` y land duplican fetch | OK, mismo helper |
| alreadyMerged + land IPC | Publicar sigue vivo en in_review. Published usa Land, no publishBatch | Spec CTA |
| Token ausente en leave merged | No sabemos merged | Leave clásico (rama viva). 10a no marcó published |
| Merge in curso | land/leave throw | Copy ya existe |
| Toast + Stage read-only | OK | |
| i18n CTA largo en 320px | Igual que Enviar: `fullWidth` `whitespace-normal` | “Actualizar wiki” / EN “Update wiki” |
| Spec ReviewModal | No toca Land | |
| `operations.queued` | Nombre `landPublication` | |

### Otras + Actual a la vez

Prune corre en list. Actual published no se poda (`mounted`). Usuario Land/Leave → desmonta → siguiente refresh no la lista.

---

## Archivos

- `electron/publish.ts` — usar `landOnWiki`
- `electron/pubBranch.ts` o `landWiki.ts` — helper
- `electron/publication.ts` — leave + prune + ahead check
- `electron/ipc.ts` / `preload.ts` / `shared/api.ts` — `landPublication`
- `App/enums.ts` `LandPublication` + i18n operations
- `useHomeActions.onLandPublication` + close page
- `enums.ts` `PublicationCta.Land`
- `utils.ts` `publicationCta` + status (ahead ya draft)
- `PublicationCtaButton` / `CurrentPublication` / pane / `WorkColumn` props `onLand`
- `PublicationMenu` — hide discard si published
- `PublicationRow` — published no resume
- i18n es/en
- specs: utils cta, CurrentPublication Land, pane, useHomeActions, helper kind+ahead, leave/land si hay tests electron; si no, extraer ahead a puro + spec en home (`rev-list` count mock o función `isAheadOfSha(count)`)

---

## Criterios

- [x] `publishBatch` post-merge y `landPublication` comparten `landOnWiki`
- [x] CTA Actualizar wiki solo si `published`; nunca + Enviar/Publicar
- [x] Land montada: wiki pulled, `pub/` local ida, editor cerrado, toast
- [x] Leave de published = land; Leave de draft/in_review **no** borra
- [x] Unmounted published limpia: no está en Otras tras refresh
- [x] Ahead de merged sha: draft, no prune, no Land
- [x] Land Otras no hace checkout de esa pub ni de main
- [x] Dirty switch: error, rama intacta
- [x] Sin Descartar en published
- [x] Specs CTA + leave/land reglas + ahead
