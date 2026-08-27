# Plan 07 — Botón + en carpetas (New file / New folder)

> **Hecho.** En carpetas, el menú `⋯` incluye New file / New folder (además de Rename / Delete). New file selecciona esa carpeta (Stage + templates). New folder abre el modal con **parent = carpeta del menú**.
>
> **Depende de:** [04-folder-select-shows-templates.md](./04-folder-select-shows-templates.md), [06-collapse-workpane-on-folder.md](./06-collapse-workpane-on-folder.md)

---

## Objetivo (entregado)

Acciones estilo VS Code en **carpetas** del árbol:

- `+` visible al hover/focus
- **New file** → `onOpenFolder` (picker en Stage, WorkPane colapsada)
- **New folder** → `FolderModal` con parent explícito (aunque nav esté en Drafts)
- Archivos: sin `+`. El menú `⋯` sigue siendo Rename / Delete
- Read-only (`!canWrite`): sin `+` ni `⋯`

`Cmd+Shift+N` no cambia: usa `nav.section` activa.

---

## Archivos

| Área | Qué |
|------|-----|
| `Tree/enums.ts` | `TreeNodeAction.NewFile` / `NewFolder` |
| `Tree/components/TreeFolderActions.tsx` | Dropdown `+` |
| `TreeNode` / `Tree` | Props `onNewFileInFolder` / `onNewFolderInFolder`; `+` antes de `⋯` |
| `useNav.ts` | `onNewFileInFolder` → `onOpenFolder` |
| `useModals.ts` | `folderParent` + `onOpenFolderModal(parent?)` |
| `useHomeActions.ts` | `onRequestNewFolderIn`; `onCreateFolder(name, parent?)` |
| `Rail.tsx` / `RailSlot.tsx` | Cableado canWrite |
| `Overlays.tsx` | `parent={folderParent ?? nav.section}` |
| i18n `home.tree.*` | newFile / newFolder / createActionsAria |

---

## Testing (hecho)

| Archivo | Casos |
|---------|-------|
| `Tree/__specs__/Tree.spec.tsx` | `+` en folder, no en file; New file no dispara `onFolder` |
| `TreeFolderActions.spec.tsx` | Dropdown → New file / New folder con el node |
| `useNav.spec.ts` | `onNewFileInFolder` selecciona carpeta y cierra página |
| `useHomeActions.spec.ts` | parent explícito al IPC; fallback a `section` |
| `FolderModal.spec.tsx` | Muestra `inside {{parent}}` |

```bash
npm run test -w @slash-md/desktop -- src/components/Tree src/screens/home --run
npm run desktop:typecheck
```

---

## Validación manual

| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Hover archivo | Sin `+` |
| 2 | Hover carpeta (`canWrite`) | `+` y `⋯` |
| 3 | `+` → New file | Esa carpeta seleccionada; Stage templates + path |
| 4 | En carpeta A, `+` New file en B | Path de **B** |
| 5 | `+` → New folder en `docs/guides` | Modal “Dentro de docs/guides” |
| 6 | Crear `experiments` | Aparece bajo `docs/guides` |
| 7 | Drafts + New folder en una carpeta | Crea **ahí**, no en raíz |
| 8 | `⋯` | Rename / Delete intactos |
| 9 | Read-only | Sin `+` ni `⋯` |
| 10 | `Cmd+Shift+N` | Sigue usando la sección del nav |
