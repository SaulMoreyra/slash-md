# Plan 08f — UI Descartar

> Confirmación + `⋯` en Actual y en Otras. Cierra el editor. Sign-in si hace falta.

**Depende de:** [08c](./08c-publication-action-hub.md) (menú Actual) + [08e](./08e-discard-host.md) (IPC).

---

## Objetivo

`ModalKind.DiscardPublication`. Target **nuevo** (no `ModalTarget` de archivo):

```ts
{ branch, title, kind, prNumber?: number, mounted: boolean, dirtyCount: number }
```

`dirtyCount` = `payload.drafts.length` **solo si montada**. Otras: `0` (no mentir).

Copy:

- Título: ¿Descartar “{{title}}”?
- Siempre: no entra a la wiki; no se deshace.
- Montada + dirtyCount > 0: N páginas con cambios en este dispositivo.
- in_review: se cancela la revisión (sin “PR #”).
- Otras: sin conteo; “Si había una revisión abierta, se cancela.”

Botones: Cancelar · Descartar (danger). Busy: no dismiss, spinner como `ConfirmDeleteModal`.

### Dónde

- Actual `⋯`: item danger **último**.
- Otras: fila deja de ser un solo `Button`. Click fila = Retomar. `⋯` = solo Descartar (`stopPropagation`, mismo patrón `TreeNodeMenu`).
- in_review + `needsAuth`: **no** IPC; `ModalKind.SignIn`. Tras sign-in **no** auto-descartar (el usuario vuelve a `⋯`). Evita discard accidental post-login.
- Tras IPC OK: `onClosePage()` + refresh (08e no cierra el editor).
- `runOp(DiscardPublication)`.

Ajena: el item no existe (08a). Si HEAD es ajena, Actual puede no tener Descartar; sí Leave (08c).

---

## Qué puede salir mal — UI

| Fallo | Riesgo | Qué hacer |
|-------|--------|-----------|
| Click `⋯` retoma la otra pub | Montas y luego tiras la que no querías | `onPointerDown` + `click` stopPropagation en el trigger. Spec: click menú **no** llama `onResume` |
| Hit target: fila Button + `⋯` dentro | Anidación inválida HTML (`button` en `button`) | Fila = `div`/`ListBox.Item` clickeable, `⋯` = `Dropdown.Trigger`. **Nunca** Button wrapping Button |
| Menú recortado en lista | ScrollShadow + overflow | Portal popover; spec abrir `⋯` de la última fila |
| `⋯` solo visible on hover | Mobile / trackpad: no se ve Descartar | Como árbol: hover **o** `focus-within` **o** `aria-expanded`. O `⋯` siempre visible en filas (320px: aceptar siempre visible) |
| Dos `⋯` (Actual y fila montada) | 08a saca la montada de Otras | `publicationRowsForList` ya oculta mounted. Spec |
| Modal delete archivo vs discard | Mismo look, distinta destrucción | Heading distinto; no reusar body de borrar página |
| Confirm y `busy` | Escape cierra a mitad y deja GitHub a medias | `isDismissable={!busy}`; 08e es atómico hacia atrás en GitHub |
| SignIn encima de Discard | Dos modals | Cerrar Discard, abrir SignIn. No stack. No retomar discard solo |
| Auto-discard tras SignIn | Token pegado → se tira la pub | **Prohibido** |
| dirtyCount de Otras = drafts de HEAD | “3 páginas” mienten | `dirtyCount=0` si !mounted |
| Copy “no se deshace” + reopen en error | Usuario cree que GitHub no se tocó | Error banner con mensaje de 08e; refresh |
| Descartar Actual con editor open | File lock / canvas stale | `onClosePage` **antes** del IPC (08e lo pidió). Si IPC fail, no hay página: Stage blank. Preferible a lock. Alternativa: close after OK (08c leave). **08f: close before discard** por el `clean` |
| Close before + IPC fail | Perdiste el canvas pero la rama sigue | Reabrir no es trivial. **Close after OK** como Leave, y 08e documenta que el editor debe haber guardado (autosave). Si `switch -f` falla por lock: error, editor sigue. Prioridad: **close after success**, igual que 08c. Si Windows lock: mostrar el error; usuario cierra y reintenta |
| FAB visible mientras confirm | Click envía review de algo que vas a tirar | `busy` deshabilita FAB (ya) |
| Toast + banner error | Ruido | Toast solo éxito corto; fallo = `onError` |
| i18n título 80 chars | Modal overflow | Truncate título en heading, `title` attr |
| Keyboard: Delete accidental | No bind Backspace a discard | Solo menú + confirm |
| `PublicationRow.spec` “un button resume” | Pasa a fila+menú; resume por click en el título / row |
| Empty Otras con solo Actual | No `⋯` huérfano | OK |
| Confirmar dos veces rápido | Doble IPC | `runOp` cola + `busy` disable confirm |
| Danger item sin `className=text-danger` | Se ve igual que Copiar | Como TreeNode delete |

### Flujos extra a spec

1. Otras in_review, signed in → confirm → resume **no** llamado, lista sin esa fila.
2. Actual draft sucio → confirm menciona N → HEAD defaultBranch, editor cerrado.
3. Cancelar → ningún IPC.
4. needsAuth in_review → SignIn, `discardPublication` 0 calls.
5. Click `⋯` vs click row (userEvent).

---

## Archivos

- `ConfirmDiscardPublicationModal` (folder, no hinchar `ConfirmDeleteModal`)
- `enums.ts` `ModalKind.DiscardPublication`
- `types.ts` target discard
- `Overlays.tsx` + `useModals` (target no es `ModalTarget` archivo: union o campo aparte `discardTarget`)
- `PublicationRow` + spec
- `CurrentPublication` menú + Discard
- `useHomeActions.onDiscardPublication`
- i18n es/en
- specs pane / overlays / actions

---

## Criterios

- [x] Confirm danger; cancel no muta
- [x] Actual y Otras mías; nunca ajena
- [x] Row: no `button` anidado; `⋯` no retoma
- [x] Sign-in no dispara discard
- [x] Editor se cierra **solo** si discard OK
- [x] `dirtyCount` solo montada
- [x] `runOp` + busy + i18n
