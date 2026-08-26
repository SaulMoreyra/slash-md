# Plan 07 — Botón + en carpetas (New file / New folder)

> **Auditado.** Ver [AUDIT-2026-08.md](./AUDIT-2026-08.md). Verificado: `TreeNodeAction` vive en `src/components/Tree/enums.ts` y `NewPageModal` existe.

## Objetivo

Añadir acciones **estilo VS Code** en filas de **carpeta** del árbol:

- Botón **`+`** visible al **hover/focus** de la fila
- Click en `+` → **Dropdown** con:
  - **New file** → selecciona carpeta + muestra templates inline en Stage
  - **New folder** → abre `FolderModal` con **parent = carpeta del menú** (no `nav.section` genérico)

Solo carpetas — **no** archivos. Menú **⋯** existente conserva Rename / Delete.

**Depende de:** [04-folder-select-shows-templates.md](./04-folder-select-shows-templates.md), [06-collapse-workpane-on-folder.md](./06-collapse-workpane-on-folder.md)

---

## Implementación

### 1. Enum de acciones

**Archivo:** `apps/desktop/src/components/Tree/enums.ts`

```ts
enum TreeNodeAction {
  Rename = "rename",
  Delete = "delete",
  NewFile = "new-file",
  NewFolder = "new-folder",
}
```

O enum separado `TreeFolderAction` si se prefiere no mezclar con acciones del menú ⋯.

### 2. Componente TreeFolderActions (nuevo)

**Archivo nuevo:** `apps/desktop/src/components/Tree/components/TreeFolderActions.tsx`

- Botón icono `+` (usar icono existente del design system o `IconPlus`).
- Misma visibilidad que `TreeNodeMenu`: `opacity-0 group-hover/row:opacity-100 focus-within:opacity-100`.
- `Dropdown` con `New file` / `New folder`.
- `onPointerDown` stopPropagation (igual que menú ⋯).
- Props:
  - `node: HomeTreeNode`
  - `onNewFile: (node: HomeTreeNode) => void`
  - `onNewFolder: (node: HomeTreeNode) => void`

### 3. TreeNode

**Archivo:** `apps/desktop/src/components/Tree/components/TreeNode.tsx`

- En filas **folder**, renderizar `<TreeFolderActions />` **antes** de `TreeNodeMenu` (orden VS Code: acciones creación, luego ⋯).
- Nuevas props opcionales:
  - `onNewFileInFolder?: (node: HomeTreeNode) => void`
  - `onNewFolderInFolder?: (node: HomeTreeNode) => void`
- Mostrar `TreeFolderActions` solo si `canWrite && onNewFileInFolder && onNewFolderInFolder`.

### 4. Tree (prop drilling)

**Archivo:** `apps/desktop/src/components/Tree/Tree.tsx`

- Pasar callbacks a cada `TreeNode`.

### 5. Nav — handlers

**Archivo:** `apps/desktop/src/screens/home/hooks/useNav.ts`

```ts
function onNewFileInFolder(node: HomeTreeNode) {
  onOpenFolder(node); // selecciona carpeta, cierra página, colapsa WorkPane
  // Stage ya muestra EditorBlank vía plan 04
}

function onNewFolderInFolder(node: HomeTreeNode) {
  // NO navegar obligatoriamente; abrir modal con parent = node.path
}
```

Exportar handlers en el return del hook.

### 6. Modals — parent explícito

**Archivo:** `apps/desktop/src/screens/home/hooks/useModals.ts`

- Extender estado de folder modal:
  - `folderModalParent?: string` (path POSIX de la carpeta destino)
- `onOpenFolderModal(parent?: string)` — guardar parent en state.

**Archivo:** `apps/desktop/src/screens/home/hooks/useHomeActions.ts`

```ts
async function onCreateFolder(name: string, parent?: string) {
  await api().newFolder({ name, parent: parent ?? section });
  …
}

function onRequestNewFolderIn(parent: string) {
  modals.onOpenFolderModal(parent);
}
```

**Archivo:** `apps/desktop/src/screens/home/components/FolderModal/`

- Recibir `parent?: string` explícito del modal state (mostrar "inside {parent}" en UI).

**Archivo:** `apps/desktop/src/screens/home/components/Home/components/Overlays.tsx`

- Pasar `parent` del modal state a `FolderModal`.

### 7. Wiring Rail → Home

**Archivos:**

- `apps/desktop/src/screens/home/components/Home/components/RailSlot.tsx`
- `apps/desktop/src/screens/home/components/Rail/Rail.tsx`

Conectar:

- `onNewFileInFolder={nav.onNewFileInFolder}` → llama nav + opcional focus título
- `onNewFolderInFolder={(node) => actions.onRequestNewFolderIn(node.path)}`

**Archivo:** `apps/desktop/src/screens/home/hooks/useHomeController.ts`

- Exponer handlers namespaced en `nav` / `actions`.

### 8. i18n

**Archivos:** `es.json`, `en.json`

```json
"home": {
  "tree": {
    "newFile": "New file",
    "newFolder": "New folder",
    "newFileAria": "New file in {{title}}",
    "newFolderAria": "New folder in {{title}}",
    "createActionsAria": "Create in {{title}}"
  }
}
```

ES: "Nuevo archivo", "Nueva carpeta".

### 9. Atajos (sin cambios)

- `Cmd+Shift+N` sigue usando `section` activa del nav — documentar en validación manual que difiere del `+` contextual.

---

## Testing

### Specs nuevos / extendidos

| Archivo | Casos |
|---------|-------|
| `apps/desktop/src/components/Tree/__specs__/Tree.spec.tsx` | Folder row renderiza botón +; file row no |
| Nuevo: `TreeFolderActions.spec.tsx` | Dropdown abre; New file llama callback con node; New folder idem |
| `apps/desktop/src/screens/home/hooks/__specs__/useNav.spec.ts` | `onNewFileInFolder` equivale a seleccionar carpeta |
| Spec de `useHomeActions` o integration | `onCreateFolder(name, "docs/a")` pasa parent al IPC |
| `FolderModal` spec (si existe o crear mínimo) | Muestra parent explícito |

### Comando

```bash
npm run test -- --run apps/desktop/src/components/Tree
npm run test -- --run apps/desktop/src/screens/home
npm run desktop:typecheck
npm run desktop:lint
```

### Mock IPC

Verificar en tests que `api().newFolder({ name, parent })` recibe el path de la carpeta del menú, no el de otra sección activa.

---

## Validación manual

Precondición: workspace con permisos de escritura (`canWrite`).

| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Hover fila de **archivo** | No aparece botón `+` |
| 2 | Hover fila de **carpeta** | Aparece `+` (y ⋯ si canWrite) |
| 3 | Click `+` → New file | Carpeta seleccionada; Stage templates; chip con path de **esa** carpeta |
| 4 | Estar en carpeta A, `+` en carpeta B → New file | Chip muestra path de **B**, no A |
| 5 | `+` → New folder en carpeta `docs/guides` | Modal abre; indica parent `docs/guides` |
| 6 | Crear carpeta `experiments` desde modal | Carpeta aparece bajo `docs/guides` en árbol |
| 7 | `+` en carpeta sin seleccionarla antes | New folder crea en carpeta del menú aunque nav estuviera en Drafts |
| 8 | Menú ⋯ | Rename / Delete siguen funcionando |
| 9 | Workspace read-only | Sin `+` ni ⋯ (o deshabilitados) |
| 10 | `Cmd+Shift+N` con carpeta X seleccionada | Nueva carpeta en X (comportamiento previo) |

**Regresión:** Expand/collapse de carpetas, click en carpeta para seleccionar, y drag-free rename/delete intactos.

---

## Notas de implementación

- El dropdown del `+` debe cerrarse al elegir acción.
- Evitar que click en `+` dispare `onPressFolder` (stopPropagation en contenedor de acciones).
- Si `onNewFileInFolder` reutiliza `onOpenFolder`, WorkPane se colapsa automáticamente (plan 06).
