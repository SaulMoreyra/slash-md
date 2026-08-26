# Plan 05 — Chip de carpeta destino en creación

> **Auditado.** Ver [AUDIT-2026-08.md](./AUDIT-2026-08.md). Verificado: `CreatePageForm.spec.tsx` **no** asserta sobre `home.modals.page.folder`, así que esa línea puede reemplazarse por el chip sin romper tests.

## Objetivo

Mostrar un **distintivo visible** sobre el formulario de creación indicando dónde se creará el archivo:

- Con carpeta seleccionada: `Creando en: docs/prds`
- Sin carpeta (raíz): `Creando en: /` o equivalente i18n ("Raíz del repositorio")

Formato acordado: **solo carpeta**, sin preview dinámico del filename.

**Depende de:** [04-folder-select-shows-templates.md](./04-folder-select-shows-templates.md) (el form se muestra al seleccionar carpeta)

---

## Implementación

### 1. Componente de chip

**Opción recomendada:** subcomponente en `CreatePageForm/components/`

**Archivo nuevo:** `apps/desktop/src/screens/home/components/CreatePageForm/components/CreateTargetChip.tsx`

```tsx
// Props: section?: string
// section undefined → chip "Creando en: /" (raíz)
// section "docs/prds" → chip "Creando en: docs/prds"
```

- Usar HeroUI `Chip` (o `Alert` compacto si encaja mejor con el diseño).
- Estilo: discreto, sobre el input de título, debajo del hint de `EditorBlank` o integrado en el form.
- `aria-label` accesible con la ruta completa.

### 2. Integrar en CreatePageForm

**Archivo:** `apps/desktop/src/screens/home/components/CreatePageForm/CreatePageForm.tsx`

- Renderizar `<CreateTargetChip section={section} />` arriba del input de título (o justo debajo del hint si el chip vive en `EditorBlank`).
- **Decisión:** reemplazar la línea existente `{section ? <p>…folder…</p> : null}` (clave `home.modals.page.folder`) por el chip unificado, para no duplicar copy.
- El chip debe mostrarse **siempre** (incluso sin section → raíz).

### 3. NewPageModal

**Archivo:** `apps/desktop/src/screens/home/components/NewPageModal/NewPageModal.tsx` (o wrapper)

- Si usa `CreatePageForm`, el chip aparece automáticamente con la `section` pasada al modal.
- Verificar modal abierto desde rail con carpeta activa muestra path correcto.
- Modal sin section → chip de raíz.

### 4. i18n

**Archivos:** `apps/desktop/src/i18n/locales/es.json`, `en.json`

Agregar claves, por ejemplo:

```json
"home": {
  "create": {
    "targetFolder": "Creando en: {{path}}",
    "targetRoot": "Creando en: /",
    "targetRootLabel": "Raíz del repositorio"
  }
}
```

- ES: `Creando en: {{path}}` / `Creando en: /`
- EN: `Creating in: {{path}}` / `Creating in: /`

Evaluar si reutilizar o deprecar `home.modals.page.folder` ("inside {section}").

### 5. EditorBlank (opcional)

**Archivo:** `apps/desktop/src/screens/home/components/EditorBlank/EditorBlank.tsx`

- Si el hint superior (`selectTemplateOrCreate`) compite visualmente con el chip, mantener hint + chip o fusionar copy en una sola jerarquía visual clara.

---

## Testing

### Specs

**Archivo:** `apps/desktop/src/screens/home/components/CreatePageForm/__specs__/CreatePageForm.spec.tsx`

| Caso | Assert |
|------|--------|
| `section="docs/prds"` | Texto/chip contiene `docs/prds` |
| Sin `section` | Chip de raíz (`/` o string i18n de root) |
| Modal compact mode | Chip visible en modo `compact` si aplica |

**Archivo nuevo (opcional):** `CreateTargetChip.spec.tsx`

- Render con section / sin section.
- `aria-label` presente.

### Comando

```bash
npm run test -- --run apps/desktop/src/screens/home/components/CreatePageForm
npm run desktop:typecheck
npm run desktop:lint
```

---

## Validación manual

| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Sin carpeta seleccionada, Stage en blank | Chip visible: "Creando en: /" (o raíz del repositorio) |
| 2 | Click en carpeta `docs/prds` | Chip: "Creando en: docs/prds" |
| 3 | Cambiar a otra carpeta en el árbol | Chip actualiza al nuevo path |
| 4 | Crear archivo | Se crea en la carpeta indicada por el chip |
| 5 | Abrir `Cmd+N` con carpeta `guides` activa | Modal muestra chip/path `guides` |
| 6 | Cambiar idioma ES ↔ EN | Copy del chip traducido |
| 7 | Lectura con lector de pantalla | Chip/ruta anunciada de forma clara |

**UX:** El chip debe ser visible sin scroll en viewport estándar (~1280px) con rail abierto.
