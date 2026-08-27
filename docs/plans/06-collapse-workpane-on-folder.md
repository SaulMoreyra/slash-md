# Plan 06 — Colapsar WorkPane al seleccionar carpeta

> **Hecho.** Al abrir una carpeta, WorkPane no se renderiza; Stage ocupa el ancho. Drafts / Inbox / Publications vuelven a mostrar el panel.
>
> **Depende de:** [03-remove-portada.md](./03-remove-portada.md), [04-folder-select-shows-templates.md](./04-folder-select-shows-templates.md)

---

## Objetivo (entregado)

Click en carpeta del árbol → columna WorkPane **desaparece**. El Stage (templates / editor) usa el espacio.

Salir a Drafts, Inbox o Publications → WorkPane **reaparece** (`onNavigate` abre el panel).

---

## Qué se hizo (vs el plan original)

| Plan original | Entregado |
|---------------|-----------|
| `setWorkPaneOpen(false)` **después** de `onNavigate` | Así en `onOpenFolder` (el navigate reabre; luego se cierra) |
| Toggle en Folder: ocultar / no-op | No-op: `onToggleWorkPane` / `onOpenWorkPane` return si `NavKind.Folder` |
| WorkColumn opción A (doble guard) | `!workPaneOpen \|\| view.kind === Folder` → `null` |
| Borrar `SectionPane` | Eliminado (componente + specs + rama en `WorkPane`) |
| Toggle en Rail | No hay botón de WorkPane en rail; `⌘\` no dispara toggle en Folder |
| Stage `flex-1` sin hueco de 320px | `Frame` ya es `flex min-w-0 flex-1`; `WorkColumn` no deja el `w-80` |

También: `onOpenFolder` llama `onClosePage()` (plan 03/04) para que el Stage muestre el picker, no el editor.

---

## Archivos

### Nav

**`apps/desktop/src/screens/home/hooks/useNav.ts`**

```ts
function onOpenFolder(node) {
  onNavigate({ kind: Folder, ... }); // setWorkPaneOpen(true)
  setWorkPaneOpen(false);            // gana
  onClosePage();
}
```

- `onOpenWorkPane` / `onToggleWorkPane`: return temprano si `view.kind === Folder`
- Carpeta borrada del árbol → fallback Drafts + `setWorkPaneOpen(true)`

### WorkColumn

**`apps/desktop/src/screens/home/components/Home/components/WorkColumn.tsx`**

Doble guard: cerrado **o** vista Folder → no monta `WorkPane`.

### SectionPane

Eliminado:

- `apps/desktop/src/screens/home/components/SectionPane/` (tsx, index, spec)
- Rama Folder / prop `folder` en `WorkPane.tsx`

### Atajo

**`apps/desktop/src/screens/home/hooks/useKeyboardShortcuts.ts`**

`⌘\` (sin Shift) solo llama `onToggleWorkPane` si **no** es Folder.

### Layout

**`Stage/components/Frame/Frame.tsx`** — `min-w-0 flex-1`. Con WorkColumn en `null`, no queda gap.

---

## Testing (hecho)

| Archivo | Casos |
|---------|-------|
| `hooks/__specs__/useNav.spec.ts` | Open folder → `workPaneOpen false` + `onClosePage`; Inbox desde folder → `true`; toggle ignorado en folder; folder gone → Drafts + panel abierto |
| `Home/components/__specs__/WorkColumn.spec.tsx` | Drafts muestra pane; Folder (aunque `workPaneOpen true`) no; cerrado no |
| `hooks/__specs__/useKeyboardShortcuts.spec.ts` | `⌘\` en Folder no llama toggle |

```bash
npm run test -w @slash-md/desktop -- src/screens/home --run
npm run desktop:typecheck
```

---

## Validación manual

| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Drafts | WorkPane visible |
| 2 | Click carpeta | WorkPane desaparece; Stage más ancho (templates / path plan 05) |
| 3 | Drafts / Inbox / Publications en rail | WorkPane reaparece |
| 4 | Carpeta → archivo del árbol | WorkPane sigue oculta; editor en Stage |
| 5 | `⌘\` en Folder | Nada (no reabre el panel) |
| 6 | Ventana estrecha (rail overlay) | Sin layout roto |

**Regresión:** Inbox, Publications y Conflicts siguen usando WorkPane con su contenido.
