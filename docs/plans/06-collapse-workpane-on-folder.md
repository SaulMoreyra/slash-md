# Plan 06 — Colapsar WorkPane al seleccionar carpeta

> **Auditado.** Ver [AUDIT-2026-08.md](./AUDIT-2026-08.md).

## Objetivo

Cuando el usuario selecciona una **carpeta** en el árbol, la columna **WorkPane** debe **colapsarse** (no renderizarse) para que el Stage con templates ocupe más espacio.

Al navegar a Drafts, Inbox, Publications u otras vistas, WorkPane vuelve a mostrarse según el comportamiento actual.

**Depende de:** [03-remove-portada.md](./03-remove-portada.md), [04-folder-select-shows-templates.md](./04-folder-select-shows-templates.md)

---

## Implementación

### 1. Nav — cerrar WorkPane al abrir carpeta

**Archivo:** `apps/desktop/src/screens/home/hooks/useNav.ts`

En `onOpenFolder()`, **después** de `onNavigate`:

```ts
setWorkPaneOpen(false);
```

**El orden importa.** `onNavigate` hace `setWorkPaneOpen(true)` en su línea 57, así que cerrar antes de navegar no tendría efecto.

**Alternativa:** derivar visibilidad sin mutar estado — menos recomendada porque el usuario podría haber abierto WorkPane manualmente antes.

**Comportamiento al salir de carpeta:**

- `onNavigate` a Drafts/Inbox/etc. ya hace `setWorkPaneOpen(true)` — verificar que sigue funcionando.
- Si el usuario usa toggle manual de WorkPane estando en carpeta, definir si se respeta o se fuerza cerrado (recomendación: **forzar cerrado** mientras `NavKind.Folder`; toggle solo aplica en otras vistas).

### 2. WorkColumn

**Archivo:** `apps/desktop/src/screens/home/components/Home/components/WorkColumn.tsx`

Opción A (preferida — doble guard):

```tsx
if (!nav.workPaneOpen || nav.view.kind === NavKind.Folder) {
  return null;
}
```

Opción B: solo confiar en `workPaneOpen` actualizado por `useNav`.

Importar `NavKind` si se usa guard en WorkColumn.

### 3. SectionPane — eliminación

Este es el **único** plan que borra `SectionPane`; el plan 03 solo le quitó las props de portada.

**Archivo:** `apps/desktop/src/screens/home/components/WorkPane/WorkPane.tsx`

- Eliminar la rama `nav.kind === NavKind.Folder` → `SectionPane` (línea 139) y su import (línea 12).
- Quitar la prop `folder` (línea 21) si queda huérfana.

**Eliminar componente completo** (ya sin usos):

- `apps/desktop/src/screens/home/components/SectionPane/SectionPane.tsx`
- `apps/desktop/src/screens/home/components/SectionPane/index.ts`
- `apps/desktop/src/screens/home/components/SectionPane/__specs__/SectionPane.spec.tsx`

### 4. Rail — reabrir WorkPane

Verificar si existe control para abrir WorkPane desde rail (toggle/list icon):

- En vista Folder, el toggle puede ocultarse o abrir WorkPane temporalmente — **decisión:** ocultar/deshabilitar toggle en Folder, ya que WorkPane no tiene contenido útil para carpetas en este release.

**Archivo:** `apps/desktop/src/screens/home/components/Rail/Rail.tsx` o `RailNav`

- Revisar botón de panel/work list; no mostrar o deshabilitar cuando `nav.view.kind === NavKind.Folder`.

### 5. Layout / Shell

**Archivo:** `apps/desktop/src/screens/home/components/Home/components/Shell.tsx` (o layout padre)

- Confirmar que al quitar WorkColumn el Stage expande (`flex-1`) sin dejar gap vacío de 320px.

---

## Testing

### Specs

| Archivo | Acción |
|---------|--------|
| `apps/desktop/src/screens/home/hooks/__specs__/useNav.spec.ts` | `onOpenFolder` → `workPaneOpen === false` |
| `apps/desktop/src/screens/home/components/WorkPane/__specs__/WorkPane.spec.tsx` | Eliminar tests de folder/SectionPane; añadir test vía WorkColumn mock: Folder nav → WorkPane no en documento |
| `apps/desktop/src/screens/home/components/SectionPane/__specs__/SectionPane.spec.tsx` | **Eliminar** junto con el componente |

### Comando

```bash
npm run test -- --run apps/desktop/src/screens/home
npm run desktop:typecheck
npm run desktop:lint
```

### Casos mínimos

1. Navigate Drafts → `workPaneOpen true`.
2. Open folder → `workPaneOpen false`.
3. Navigate Inbox desde folder → `workPaneOpen true`.
4. WorkColumn returns null when `NavKind.Folder`.

---

## Validación manual

| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Estar en Drafts | WorkPane visible (lista drafts) |
| 2 | Click en carpeta del árbol | WorkPane **desaparece**; Stage más ancho |
| 3 | Stage | Sigue mostrando templates + chip (planes 04–05) |
| 4 | Click en Drafts en rail | WorkPane **reaparece** |
| 5 | Carpeta → archivo en árbol | WorkPane sigue oculta; editor ocupa espacio |
| 6 | Ventana estrecha (< 1100px) | Rail overlay + colapso WorkPane sin layout roto |
| 7 | Toggle WorkPane (si existe) en vista Folder | Comportamiento acordado (oculto/deshabilitado) |

**Regresión:** Inbox, Publications, Conflicts mantienen WorkPane con su contenido habitual.
