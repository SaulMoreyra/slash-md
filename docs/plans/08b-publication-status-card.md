# Plan 08b — Card de estado (sin jerga git)

> **Hecho.** La Actual explica **qué pasa** en una línea. `PrStrip` sale del pane.

**Depende de:** [08a](./08a-publications-mine-only.md) (lista ya es tuya). **Siguiente:** [08c](./08c-publication-action-hub.md).

---

## Objetivo

Card Actual: título, chip Borrador/En revisión, **una** línea de producto, opcional “N páginas con cambios”.

`PrStrip` **no** se renderiza en Publicaciones. Approvals/checks/reviewers se **traducen** a esa línea. Lista de páginas del PR se queda.

Util puro `publicationStatusLine(t, { kind, loteReview, canSendReview, wikiSyncStatus })`.

| Condición (orden) | Línea (i18n) |
|-------------------|--------------|
| `wikiSyncStatus` conflicting / merging | La que ya usa el banner (misma clave o hermana corta) |
| `wikiSyncStatus === behind` | “La wiki cambió” |
| `kind === draft` && `canSendReview` | “Sin enviar” o “N páginas con cambios” |
| `kind === draft` && !canSendReview | “Borrador” / “Nada que enviar aún” |
| in_review && approvals === 0 | “Esperando aprobación” |
| in_review && checksOk === false | “Hay que corregir” |
| in_review && isPublishReady | “Lista para publicar” |
| in_review else | “En revisión” |

No mostrar `pub/…`, `PR #`, `review/lote`, logins. Specs actuales que **buscan** `home.pr.kicker` / branch en el pane hay que **invertirlas**.

---

## Qué puede salir mal — UI

| Fallo | Riesgo | Qué hacer |
|-------|--------|-----------|
| Columna `w-80` + título largo + chip | Chip wrap a segunda fila, título empuja | `min-w-0 truncate` en título (ya); chip `shrink-0`; header `items-start` |
| ES más largo que EN | “Esperando aprobación” + “2 páginas…” = 3 líneas feas | Una línea de estado; el count es **segunda** línea muted, o se omite si status ya dice “sin enviar” |
| Chip “En revisión” **y** línea “En revisión” | Eco | Chip = kind. Línea = **siguiente paso**, no repetir el kind. Si no hay siguiente, no pongas línea |
| `PrStrip` duplicado | Card + strip con el mismo PR | Quitar strip. Pages list se queda |
| `loteReview` ausente pero `kind === in_review` | Línea vacía / “Lista para publicar” por `isPublishReady(undefined) === true` | **No** usar `isPublishReady` para copy. Si no hay review: “En revisión”. Publish CTA es 08c con `canPublishBatch && review` |
| Banner Stage + línea “La wiki cambió” | Doble alarma | OK: banner es Stage, línea es pane. Misma idea, dos sitios. No abrir Conflicts desde la card (08b) |
| Pages list “Guide” vs count “0 páginas” | Count es `canSendReview`/`drafts`; list es in_review | No mezclar. Count = cambios por enviar. List = archivos del lote. Copy distinto (`home.reviews.pages` ya existe) |
| `overflow-hidden` en Card | Truncate come `title` tooltip | `title={publication.title}` en el heading (ya) |
| Empty Actual (en wiki) + Otras | No hay card; no inventar PrStrip huérfano | `PublicationReview` sin current: auth sí, pages/PR no (ya casi). Spec: sin current no hay kicker PR |
| Color del chip vs checks fail | Chip success cuando CI rojo | Chip sigue kind (accent in_review). El fail va en la **línea**, no en el chip |
| ScrollShadow recorta la card | `mx-3` + sombra | Sin cambio de márgenes; no añadir padding que rompa alineación con filas |
| i18n interpolación `{{count}}` | `0 páginas` visible | No renderizar la línea de count si `count === 0` |
| Spec `queryByText(branch)` | 08b no debe **empezar** a mostrar ramas | Dejar la aserción “no se ve pub/…” |

### Datos

| Fallo | Qué hacer |
|-------|-----------|
| `checksOk === null` (pendiente) | “En revisión” o “Comprobando…” — no “Hay que corregir”, no “Lista” |
| `reviewers` vacío | No mencionar reviewers |
| `loteReview.title` ≠ `publication.title` | Ignorar título del PR en la card |

---

## Archivos

- `CurrentPublication.tsx` (+ spec)
- `PublicationReview.tsx` — sin `PrStrip`
- `home/utils.ts` + `utils.spec.ts` — `publicationStatusLine`
- `en.json` / `es.json`
- `PublicationsPane.spec.tsx` — invertir asserts de PR kicker/branch

No añadir botones (08c). No filtrar ownership (08a).

---

## Criterios

- [x] Card: título, chip, línea de producto; opcional count > 0
- [x] Cero `pub/` y cero `PR #` en el pane
- [x] `PrStrip` no está en Publicaciones (`PrStrip` puede seguir existiendo el archivo)
- [x] Pages list sigue si hay drafts in_review
- [x] `isPublishReady(undefined)` no se usa para decidir copy
- [x] ES/EN: título truncado, chip no wrap raro en `w-80` (spec o captura mental: `truncate` + `shrink-0`)
