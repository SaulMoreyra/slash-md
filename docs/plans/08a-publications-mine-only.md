# Plan 08a — Solo mis publicaciones

> **Hecho.** Lista del pane = **mías**. Sin UI nueva.

**Depende de:** nada de 08. **Siguiente:** [08b](./08b-publication-status-card.md).

---

## Objetivo

Hoy `listPublications` une `refs/heads/pub/` y `origin/pub/`. En un repo de equipo ves drafts/PRs de otra gente. Un click en Retomar te monta **su** rama.

**Incluir** `pub/…` solo si:

1. PR **abierto** con `user.login ===` sesión, **o**
2. No hay PR abierto **y** existe `refs/heads/pub/…` local.

**Excluir:** remote-only de otro; PR abierto de otro (aunque hayas hecho fetch).

`getPublicationState` **no** se filtra: si HEAD ya es una `pub/` ajena, la card **Actual** sigue (estás ahí). No aparece en Otras. Leave (08c) es la salida.

Sin login: solo drafts locales (regla 2). Las in_review ajenas o propias remotas no entran hasta SignIn + refresh.

Opcional: `PublicationSummary.author` para specs.

---

## Qué puede salir mal

### Datos

| Fallo | Qué pasa hoy / riesgo | Qué hacer |
|-------|------------------------|-----------|
| `findOpenPull` 403/timeout | La rama cae a “draft local” o desaparece | Si hay local y el lookup falla: **incluir** (mejor de más que ocultar la tuya). Log/swallow igual que ahora |
| Login `Octocat` vs `octocat` | Filtro te esconde tu PR | Comparar case-insensitive |
| Bot / GitHub App como `user` del PR | No coincide con tu login | Tratar como ajena (no listar). P1: permitir |
| PR abierto **tuyo** sin rama local (otro Mac) | Debes verla para Retomar | Regla 1 basta (`origin/pub/` + PR tuyo) |
| PR tuyo + fetch incompleto | `origin/pub/…` no está | `findOpenPull` por head sigue; añadir la `pr.head.ref` aunque el ref local no exista. Resume hará fetch/switch |
| Dos PRs open de la misma head | `findOpenPull` toma `[0]` | Sin cambio |
| Estás montado en pub **ajena** | Card actual sí, lista no | OK. Spec: `publication.branch` no está en `publications` si author ≠ yo |
| Tras 08a la lista queda vacía y hay `origin/pub/` de otros | Empty state “No publications” | Correcto. No mostrar las ajenas “para que no se sienta vacío” |
| `needsAuth` + muchos remotes | Solo locales | Empty + `PublicationAuth` ya existe debajo; no mezclar |

### UI (aunque no hay UI nueva)

| Fallo | Riesgo | Qué hacer |
|-------|--------|-----------|
| Empty vs Actual | Actual ajena + Otras vacías: parece un bug | 08a no añade copy. 08c: Leave visible en Actual. Spec 08a: no inventar fila fantasma |
| Título derivado del slug (`titleFromPublicationBranch`) | “Onboarding Q3” vs título real del PR | Fuera de 08a (P1). No usar `pr.title` todavía (metería jerga/duplicado con 08b) |
| Orden de la lista | Inestable entre refresh | Ordenar por `branch` (ya implícito si Set→array; fijarlo) |
| Resume de rama que el filtro acaba de ocultar | Click stale | Refresh tras resume; la fila no debería existir |

---

## Archivos

- `apps/desktop/electron/publication.ts` — filtro + `currentAuth`
- `packages/core/src/homeTypes.ts` — `author?`
- Specs de `listPublications` si existen; si no, extraer filtro puro `isOwnPublication(login, localHeads, pr)` en un util testeable **sin** git (`packages/github` o `electron` helper + spec)

No tocar pane React.

---

## Criterios

- [x] PR mío remoto-only aparece
- [x] `origin/pub/` de otro no aparece
- [x] Draft local sin PR aparece (con o sin token)
- [x] HEAD ajena: `payload.publication` presente, no está en `publications` (o `mounted` + filtrada de Otras)
- [x] Login case-insensitive
- [x] Fallo al listar PRs no borra drafts locales
