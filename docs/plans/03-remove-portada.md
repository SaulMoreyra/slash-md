# Plan 03 — Eliminar Portada de carpeta

> **Auditado.** Ver [AUDIT-2026-08.md](./AUDIT-2026-08.md).
>
> **Prerrequisito:** árbol de trabajo limpio. Este plan toca `utils.ts`, `enums.ts` y `WorkPane.tsx`, que tenían cambios sin commitear.

## Objetivo

Quitar por completo el concepto de **portada de carpeta** (`README.md` / `index.md` como landing al seleccionar una carpeta) del home screen. Esto incluye UI, navegación automática, acciones de creación, enums, i18n y tests.

**No tocar:** cover de página individual en `HeroChrome` (frontmatter `cover`).

---

## Implementación

### 1. Utilidades y enums

**Archivo:** `apps/desktop/src/screens/home/utils.ts`

- Eliminar `findFolderCover()` y `COVER_BASENAMES`.
- Mantener `createIntentForSection()` sin cambios.

**Archivo:** `apps/desktop/src/screens/home/enums.ts`

- Eliminar `FolderCoverBasename` y `FolderCoverFileName`.

### 2. Navegación

**Archivo:** `apps/desktop/src/screens/home/hooks/useNav.ts`

- Quitar import y uso de `findFolderCover`.
- Eliminar derivado `cover` del return del hook.
- Simplificar `onOpenFolder()`: navegar a carpeta + `onClosePage()`; **no** auto-abrir README/index.
- Simplificar `treeSelection()`: eliminar rama que mantenía seleccionado el folder cuando la portada estaba abierta.

### 3. Acciones

**Archivo:** `apps/desktop/src/screens/home/hooks/useHomeActions.ts`

- Eliminar `onCreateCover()` y `onRequestWriteCover()`.
- Quitar export de estas funciones del objeto retornado / tipos expuestos al controller.

**Archivo:** `apps/desktop/src/screens/home/hooks/useHomeController.ts`

- Dejar de pasar `onRequestWriteCover` a WorkColumn, Stage, etc.

### 4. Stage

**Archivo:** `apps/desktop/src/screens/home/components/Home/components/Stage/hooks/useStageController.ts`

- Eliminar `openingCover` del return.
- Eliminar referencias a `nav.cover`.

**Archivo:** `apps/desktop/src/screens/home/components/Home/components/Stage/components/Body/Body.tsx`

- Quitar prop `openingCover` y rama `loading || openingCover`.
- Quitar prop `onWriteCover` (`SectionCanvas` se elimina en el plan 04).

**Archivo:** `apps/desktop/src/screens/home/components/Home/components/Stage/Stage.tsx`

- Dejar de pasar `openingCover` / `onWriteCover` a `Body`.

**Archivo:** `apps/desktop/src/screens/home/components/Home/components/Stage/utils.ts`

- Eliminar flags relacionados con portada si existen.

### 5. WorkPane / WorkColumn

**Archivo:** `apps/desktop/src/screens/home/components/Home/components/WorkColumn.tsx`

- Quitar `hasCover={Boolean(nav.cover)}`.
- Quitar `onWriteCover={actions.onRequestWriteCover}`.

**Archivo:** `apps/desktop/src/screens/home/components/WorkPane/WorkPane.tsx`

- Eliminar props `hasCover` y `onWriteCover` (líneas 22, 30, 65, 73).
- La rama `nav.kind === NavKind.Folder` → `SectionPane` (línea 139) se mantiene por ahora; el plan 06 la elimina cuando WorkPane deje de mostrarse para carpetas.

**Archivo:** `apps/desktop/src/screens/home/components/SectionPane/SectionPane.tsx`

- Eliminar prop `hasCover`, botón "Escribir portada" y la rama completa de "Portada abierta".
- Queda `PaneHeader` + un solo botón de crear.
- **No borrar el componente aquí** — el plan 06 decide si se elimina cuando quede sin uso.

### 6. SectionCanvas (preparación plan 04)

**Archivo:** `apps/desktop/src/screens/home/components/SectionCanvas/SectionCanvas.tsx`

- Eliminar `onWriteCover` y su botón (el componente completo se elimina en el plan 04).

### 7. i18n

**Archivos:** `apps/desktop/src/i18n/locales/es.json`, `en.json`

Eliminar claves bajo `home.section`:

- `emptyTitle`, `emptyBody` (copy de "Sin portada")
- `writeCover`
- `hasCoverTitle`, `hasCoverBody`

**Nota:** `editor.addCover` y strings de `HeroChrome` **permanecen**.

### 8. Limpieza de exports

- Revisar `SectionPane/index.ts`, `SectionCanvas/index.ts` — sin referencias rotas.
- Buscar en repo: `findFolderCover`, `onRequestWriteCover`, `onCreateCover`, `FolderCover`, `writeCover`, `hasCover` (filtrar falsos positivos de `HeroChrome`).

---

## Testing

### Specs a actualizar o eliminar

| Archivo | Acción |
|---------|--------|
| `apps/desktop/src/screens/home/__specs__/utils.spec.ts` | Eliminar tests de `findFolderCover` |
| `apps/desktop/src/screens/home/hooks/__specs__/useNav.spec.ts` | Tres tests afectados — ver detalle abajo |
| `apps/desktop/src/screens/home/components/SectionPane/__specs__/SectionPane.spec.tsx` | Reescribir sin portada (ambos tests actuales son de portada) |
| `apps/desktop/src/screens/home/components/SectionCanvas/__specs__/SectionCanvas.spec.tsx` | Quitar el test de "write cover" (el archivo se borra en el plan 04) |
| `apps/desktop/src/screens/home/components/WorkPane/__specs__/WorkPane.spec.tsx` | Quitar la expectativa de `home.section.writeCover` (línea 72) |

**Detalle de `useNav.spec.ts`:**

| Test | Acción |
|------|--------|
| `opens the folder README when present` (línea 120) | Eliminar |
| `highlights the folder while its cover is open` (línea 150) | Eliminar |
| `closes the page when the folder has no cover` (línea 210) | Renombrar a `closes the page when opening a folder` — pasa a ser el caso general |

### Comando

```bash
npm run test -- --run apps/desktop/src/screens/home
npm run desktop:typecheck
npm run desktop:lint
```

### Casos mínimos en specs

1. `onOpenFolder` con carpeta que tiene `README.md` **no** llama `onOpenPage` con ese path.
2. `treeSelection` con folder activo selecciona la carpeta o el archivo abierto manualmente (sin lógica especial de cover).
3. No quedan imports de `findFolderCover` en hooks del home.

---

## Validación manual

Precondición: workspace con carpeta que contenga `README.md` o `index.md` (ej. `docs/`).

| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Abrir app desktop con workspace cargado | Home carga sin errores en consola |
| 2 | Click en carpeta con `README.md` | **No** se abre el README en el editor automáticamente |
| 3 | Árbol | La carpeta queda seleccionada/resaltada |
| 4 | WorkPane / Stage | No aparece texto "Escribir portada", "Sin portada" ni "Portada abierta" |
| 5 | Abrir `README.md` manualmente desde el árbol | El archivo se abre con normalidad en el editor |
| 6 | Buscar en UI (ES) | Ninguna cadena visible con "portada" en el contexto de carpeta/sección |
| 7 | Hero cover en página | Abrir página con cover en frontmatter — el banner de página sigue funcionando |

**Regresión:** Drafts, Inbox, Publications y abrir archivos `.md` normales siguen igual.
