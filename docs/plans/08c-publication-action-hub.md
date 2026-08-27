# Plan 08c — Hub de acciones (card + modal)

> Un CTA en Actual. Wiki / GitHub / copiar rama en `⋯`. Modal de review **solo** Enviar. FAB no abre un modal muerto.

**Depende de:** [08b](./08b-publication-status-card.md). **Siguiente UI:** [08f](./08f-discard-ui.md) (Descartar entra al mismo `⋯`). **GitHub discard:** [08d](./08d-discard-github.md) en paralelo.

---

## Objetivo

```
Actual                          [⋯]
Título
En revisión · Esperando aprobación
                 [Enviar a revisión]
```

### CTA (uno o ninguno)

| Estado | Botón |
|--------|--------|
| `canSendReview` | Enviar a revisión → mismo `onRequestReview` |
| `canPublishBatch && !blocked && isPublishReady(loteReview)` | Publicar → `onPublishBatch` |
| Si ambos | **Enviar** gana (hay delta). Publicar espera al siguiente refresh |
| Esperando / checks fail / conflict / merging | Ninguno |

Misma guarda de publish que `Overlays` hoy (`blocked` = conflicting \| merging).

### Menú `⋯` (enum `PublicationMenuAction`)

- Volver a la wiki → `leavePublication` + **`onClosePage()`**
- Ver en GitHub → si `prUrl` (hidden si no)
- Copiar rama → `navigator.clipboard.writeText(branch)` (P1 de producto, barato: **sí en 08c**)

Patrón: `TreeNodeMenu` (`stopPropagation` en pointerdown, `has-aria-expanded:opacity-100`). En Actual el `⋯` puede ser siempre visible (no hay hover de fila).

### ReviewModal

Quitar Leave y Publish de `ReviewModalActions` / hub. Cancelar + Enviar.

### FAB

Hoy `visible={Boolean(publication)}` abre el modal **aunque** `canSend` sea false. Tras quitar Leave/Publish el modal queda en Cancelar vacío.

**FAB solo si `canSendReview`.** `aria-label` = enviar (`home.publication.sendReview`), no “acciones de la publicación”. Icono: dejar o pasar a merge/send si hay icono; no bloquear el plan por el SVG.

---

## Qué puede salir mal — UI

| Fallo | Riesgo | Qué hacer |
|-------|--------|-----------|
| CTA “Enviar a revisión” no cabe en 320px | Corte / wrap a 2 líneas | `fullWidth` `size="sm"`; `whitespace-normal` o copy corto ES “Enviar”; no dos botones |
| `⋯` + chip en el header | Chip y menú pelean el ancho | Orden: chip \| `⋯`. Título debajo a ancho completo |
| Dropdown recortado | Card `overflow-hidden` + ScrollShadow | Popover portaled (HeroUI). Spec: abrir `⋯` y ver el menú en document. Si se recorta: quitar overflow de la card o `placement` |
| `⋯` dispara nada | Actual no es un Button fila | OK. No poner onPress en la card |
| Click GitHub vs Leave | Orden del menú | Leave primero; GitHub; copiar; (08f) Descartar danger **último** — 08c reserva el sitio sin el item |
| Copiar sin permiso clipboard | Silent fail | Try/catch; toast error corto. Secure context Electron OK |
| Leave con editor sucio | Autosave 300ms; checkout wiki | Close page **después** del IPC ok (save ya flush). Si leave falla, **no** cerrar editor |
| Leave OK, editor sigue en path de la pub | Wiki read-only / archivo desapareció | `onClosePage` siempre tras leave OK |
| Modal review sin send y sin hub | Footer solo Cancelar | FAB ya no abre ese caso. Atajo teclado si abre Review: mismo idle copy (`sendReviewIdle`) + Cancelar. Buscar `ModalKind.Review` en shortcuts |
| Triple Enviar (FAB + CTA + modal) | Confusión | CTA y FAB = mismo modal. OK. No tercer botón en pages list |
| Publish en card y checks fail | Botón que explota | No renderizar CTA; la línea de 08b lo explica. Error de host si alguien llama igual |
| `busy` | CTA y `⋯` clickeables | `isDisabled={busy}` en CTA y trigger. Leave en vuelo: menú cerrado |
| Focus trap modal vs dropdown | Abrir `⋯` con review modal | No deberían coexistir |
| WorkPane cerrado (plan 09) | CTA invisible; FAB cubre Enviar | Por eso FAB **sigue** cuando `canSendReview` |
| `ReviewModal.spec` espera Leave/Publish | Actualizar specs |
| Publicar sin cerrar modal | N/A: publish ya no está en modal |
| Copiar rama enseña git al non-dev | Solo dentro de `⋯`, label “Copiar rama”, no el `pub/…` en la card | El item puede mostrar el nombre en `textValue` para screen readers |
| Dos CTAs stacked (bug de flags) | Enviar y Publicar | Prioridad Enviar; spec |
| Touch: `⋯` de 20px | Miss | Trigger `size-7` como el árbol |

### Host

| Fallo | Qué hacer |
|-------|-----------|
| `leavePublication` con merge in curso | Error ya existe; no close page |
| Publish blocked | `onError` + AlertBanner; CTA no debía estar |

---

## Archivos

- `CurrentPublication` + menú local `PublicationMenu` (folder-per-component)
- `PublicationsPane` / `WorkPane` / `WorkColumn` — pasar `onLeave`, `onPublish`, `onReview`, `onClosePage`, `busy`, flags
- `useHomeActions.onLeavePublication` — close page tras OK
- `Overlays` — hub sin leave/publish (o hub `undefined`)
- `ReviewModalActions` + specs
- `PublicationFabSlot` — `visible={canSendReview}`
- enums `PublicationMenuAction`
- i18n

No implementar Descartar (08f). No `closePull` (08d).

---

## Criterios

- [x] Un CTA o ninguno; nunca Enviar+Publicar a la vez
- [x] `⋯`: Wiki, GitHub si hay URL, copiar rama
- [x] Leave cierra el editor solo si el IPC OK
- [x] ReviewModal: Cancelar + Enviar; specs del hub actualizados
- [x] FAB ausente si no hay nada que enviar; presente si `canSendReview` (aunque el pane esté en Cambios)
- [x] Menú no recortado; `⋯` no deja el pane
- [x] Specs pane: **sí** hay send/publish/leave (inverso de hoy)
