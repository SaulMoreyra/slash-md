# Plan 05 — Destino de creación (path + preview)

> **Hecho.** Reemplazó `Carpeta: {{section}}` por un path grande, preview live del archivo, y paths con `/` que crean subcarpetas.
>
> El nombre del archivo (`05-create-target-chip.md`) es histórico: **no se usó HeroUI Chip**.

**Depende de:** [04-folder-select-shows-templates.md](./04-folder-select-shows-templates.md)

---

## Objetivo (entregado)

Mostrar **dónde** cae el archivo nuevo y permitir crear **subcarpetas** desde el título.

Layout en `CreatePageForm`:

1. **Arriba, grande:** carpeta destino con slash — `/docs`, `/docs/prds`, o `/` en raíz. Si el título anida (`read/templates.md`), el heading pasa a `/docs/prds/read`.
2. **Título** (input grande)
3. **Justo debajo del título:** ruta completa live — `/docs/hello.md` o `/docs/prds/read/templates.md`
4. Grid de plantillas + botón crear

El preview y el host usan `resolveCreateTarget` (`@slash-md/core/createPath`) + `slugify`. Título vacío → `t("common.untitled")` → `sin-titulo.md` / `untitled.md`.

`NewPageModal` no cambió: ya monta `CreatePageForm` (`compact` → heading `text-2xl`).

---

## Qué se hizo (vs el plan original)

| Plan original | Entregado |
|---------------|-----------|
| Chip `Creando en: {path}` | Heading tipográfico `/docs` (`CreateTargetHeading`) |
| Solo carpeta, sin filename | Preview live (`CreateFilePreview`) |
| Copy visible “Creando en:” | Path visible; aria `targetAria` / `filePreviewAria` |
| Hint de `EditorBlank` siempre | Hint oculto cuando hay `section` |
| Reutilizar `home.modals.page.folder` | **Eliminado** (también `home.modals.template.folder`) |
| *(añadido)* slashes en el título | Subcarpeta real: `/read/templates.md` → `…/read/templates.md` |

---

## Archivos

### Core

**`packages/core/src/createPath.ts`**

- `resolveCreateTarget(section, title, untitled)` → `{ section, title, slug }`
- `/` (y `\`) separan carpetas relativas a la sección actual
- Leading `/` se ignora (no es absoluto de repo)
- `..` y `.` se descartan
- Último segmento: se quita `.md` y se slugifica (no `templates-md.md`)
- Trailing `/` (`read/`) → archivo untitled dentro de esa carpeta

**`apps/desktop/electron/pages.ts` — `createPage`**

- Resuelve el target antes de escribir
- `writeText` ya hace `mkdir` recursive → la subcarpeta existe al crear

### Utils UI

**`apps/desktop/src/screens/home/components/CreatePageForm/utils.ts`**

- `formatFolderPath(section?)` → `"/"` | `"/docs"` | `"/docs/prds"`
- `formatCreatePaths(section, title, untitled)` → `{ folderPath, filePath }` (heading sigue la carpeta destino, incluso anidada)
- `formatCreateFilePath(...)` → solo `filePath`

### UI

| Archivo | Rol |
|---------|-----|
| `CreatePageForm/components/CreateTargetHeading.tsx` | Path de carpeta grande; slash en `text-muted/50` |
| `CreatePageForm/components/CreateFilePreview.tsx` | Path completo en `font-mono text-sm` |
| `CreatePageForm/CreatePageForm.tsx` | Heading → título + preview (`gap-2`) → templates → acciones |
| `EditorBlank/EditorBlank.tsx` | Hint solo si **no** hay `section` |

### i18n

**`apps/desktop/src/i18n/locales/es.json`**, **`en.json`**

```json
"home": {
  "create": {
    "targetAria": "Creando en {{path}}",
    "filePreviewAria": "Se guardará como {{path}}"
  }
}
```

EN: `"Creating in {{path}}"` / `"Will be saved as {{path}}"`.

---

## Testing (hecho)

| Archivo | Casos |
|---------|-------|
| `CreatePageForm/__specs__/utils.spec.ts` | Folder/file path; nested `/read/templates.md`; trailing `/`; `..` ignorado; `formatCreatePaths` actualiza heading |
| `CreatePageForm/__specs__/CreatePageForm.spec.tsx` | Heading + preview; raíz `/`; preview al tipear; nested heading `/docs/prds/read`; compact `guides` |
| `Stage/components/Body/__specs__/Body.spec.tsx` | Folder sin página → no hint, sí `targetAria` |

```bash
npm run test -w @slash-md/desktop -- src/screens/home --run
npm run desktop:typecheck
```

---

## Validación manual

| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Stage blank sin carpeta | Heading `/` + preview `/{untitled}.md`; hint “elige una página…” |
| 2 | Click carpeta `docs` | Heading `/docs`; hint oculto; preview bajo el título |
| 3 | Escribir título `Hello` | Preview `/docs/hello.md` |
| 4 | Escribir `/read/templates.md` en `docs/prds` | Heading `/docs/prds/read`; preview `/docs/prds/read/templates.md` |
| 5 | Crear | Archivo (y carpeta) en esa ruta; frontmatter title = último segmento |
| 6 | `read/` (slash final) | Preview `…/read/{untitled}.md` |
| 7 | `Cmd+N` con carpeta activa | Modal compacto con el mismo heading + preview |
| 8 | ES ↔ EN | Slug de untitled según locale; aria-labels traducidos |

**UX:** Heading y preview visibles sin scroll en viewport ~1280px con rail abierto.
