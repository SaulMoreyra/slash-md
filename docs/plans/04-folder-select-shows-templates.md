# Plan 04 — Seleccionar carpeta muestra templates en Stage

> **Auditado.** Ver [AUDIT-2026-08.md](./AUDIT-2026-08.md).

## Objetivo

Al seleccionar una carpeta en el árbol, el **Stage** (panel central) debe mostrar siempre el picker de templates (`EditorBlank` + `CreatePageForm`), sin pasar por `SectionCanvas` ni estados vacíos de portada.

**Depende de:** [03-remove-portada.md](./03-remove-portada.md)

---

## Implementación

### 1. Stage controller

**Archivo:** `apps/desktop/src/screens/home/components/Home/components/Stage/hooks/useStageController.ts`

- Eliminar `showSectionCanvas` y `folderTitle` si solo servían para `SectionCanvas`.
- Lógica simplificada cuando no hay página abierta:
  - `needsInit` → Empty connect
  - `loading` → Loading
  - `conflicts.merging` → Conflict
  - `hasPage` → editor (`children`)
  - **else** → `EditorBlank` (con `section` y `createIntent` del nav)

### 2. Body del Stage

**Archivo:** `apps/desktop/src/screens/home/components/Home/components/Stage/components/Body/Body.tsx`

- Eliminar import y rama de `SectionCanvas`.
- Eliminar props: `showSectionCanvas`, `folderTitle`, `onWriteCover`, `onNewPage` (si solo usaban SectionCanvas).
- Flujo final sin página: siempre `<EditorBlank section={section} createIntent={createIntent} … />`.

**Archivo:** `apps/desktop/src/screens/home/components/Home/components/Stage/Stage.tsx`

- Ajustar props pasadas a `Body` según el controller simplificado.

**Archivo:** `apps/desktop/src/screens/home/components/Home/components/Stage/utils.ts`

- Eliminar `showSectionCanvas` de flags/helpers si existe.

### 3. Eliminar SectionCanvas

**Eliminar o deprecar:**

- `apps/desktop/src/screens/home/components/SectionCanvas/SectionCanvas.tsx`
- `apps/desktop/src/screens/home/components/SectionCanvas/index.ts`
- `apps/desktop/src/screens/home/components/SectionCanvas/__specs__/SectionCanvas.spec.tsx`

Buscar y limpiar imports de `SectionCanvas` en todo `apps/desktop`.

### 4. Nav — cerrar página al entrar a carpeta

**Archivo:** `apps/desktop/src/screens/home/hooks/useNav.ts`

- Confirmar que `onOpenFolder` llama `onClosePage()` (plan 03).
- `section` y `createIntent` siguen derivándose de `view.path` cuando `NavKind.Folder`.

### 5. CreateIntent para templates/

Sin cambios en lógica — verificar que `createIntentForSection()` sigue activo:

- Carpeta bajo `templates/` → `CreateIntent.Template` → copy "New template" / placeholders de template en formulario y rail.

### 6. EditorBlank

**Archivo:** `apps/desktop/src/screens/home/components/EditorBlank/EditorBlank.tsx`

- Ya compone `CreatePageForm` con `section` y `createIntent`.
- Verificar hint (`home.selectTemplateOrCreate` vs `home.selectPageOrCreate`) según intent.
- Sin cambios funcionales mayores; el plan 05 añade el chip de destino.

### 7. NewPageModal (Cmd+N)

**Archivo:** `apps/desktop/src/components/NewPageModal/` (si aplica)

- Flujo modal existente **sin cambios** (decisión: atajos iguales).
- Modal sigue usando `section` activa del nav cuando se abre desde rail/shortcut.

---

## Testing

### Specs a actualizar

| Archivo | Acción |
|---------|--------|
| `apps/desktop/src/screens/home/hooks/__specs__/useNav.spec.ts` | Folder click → `onClosePage`; `section` = path de carpeta |
| `apps/desktop/src/screens/home/components/CreatePageForm/__specs__/CreatePageForm.spec.tsx` | Render con `section="docs/prds"` muestra form + grid de templates |
| `apps/desktop/src/screens/home/components/SectionCanvas/__specs__/SectionCanvas.spec.tsx` | **Eliminar archivo** |
| Nuevo o extendido: spec de `Body` o `useStageController` | Sin página + folder nav → render path incluye `EditorBlank` / template grid |

### Comando

```bash
npm run test -- --run apps/desktop/src/screens/home
npm run desktop:typecheck
npm run desktop:lint
```

### Casos mínimos

1. `useStageController`: con `nav.section` definido, `hasPage=false` → no `showSectionCanvas` (flag eliminado); body usa blank state.
2. `CreatePageForm` en carpeta `templates/foo` → heading de template (`CreateIntent.Template`).
3. Click carpeta no deja Stage en loading perpetuo (`openingCover` eliminado en el plan 03).

---

## Validación manual

| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Click en carpeta vacía (sin archivos) | Stage muestra título/hint + input de título + grid de templates |
| 2 | Click en carpeta con archivos | Mismo picker de templates (no lista de archivos en Stage) |
| 3 | Escribir título + elegir template + Create | Archivo creado **dentro** de esa carpeta y se abre en editor |
| 4 | Seleccionar carpeta bajo `templates/` | Copy de "template" (placeholder/heading distinto a página normal) |
| 5 | Seleccionar carpeta, luego click en archivo del árbol | Stage muestra editor del archivo (sale del blank state) |
| 6 | Cerrar página (volver a carpeta seleccionada) | Vuelve a aparecer picker de templates |
| 7 | `Cmd+N` con carpeta seleccionada | Modal de nueva página abre (comportamiento previo conservado) |

**Regresión:** Estados `needsInit`, conflict merge, y editor con página abierta no se ven afectados.
