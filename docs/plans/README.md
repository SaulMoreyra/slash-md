# Planes: infra + crear en carpeta

Planes de implementación para el home de la app desktop y mejoras de infraestructura transversales.

**Alcance principal:** `apps/desktop/src/` (+ `electron/` para el store de tema).

**Auditoría:** todos los planes fueron verificados contra el código real. Ver [AUDIT-2026-08.md](./AUDIT-2026-08.md).

---

## Prerrequisito

**El árbol de trabajo debe estar limpio.** La auditoría encontró ~30 archivos en staging con un refactor `ReviewsPane` → `PublicationsPane` a medias, sobre los mismos archivos que tocan estos planes (`WorkPane.tsx`, `utils.ts`, `enums.ts`, `Overlays.tsx`, `RailNav.tsx`, `useKeyboardShortcuts.ts`). Commitear o stashear antes de empezar.

---

## Orden de ejecución

Ejecutar **en secuencia**. Los planes 00–01 son prerrequisitos de calidad; 03–07 implementan el flujo de carpetas/templates.

```
00-theme-context-bootstrap
        │
        ▼
01-git-context
        │
        ▼
03-remove-portada
        │
        ▼
04-folder-select-shows-templates
        │
        ├──► 05-create-target-chip
        │
        └──► 06-collapse-workpane-on-folder
                    │
                    ▼
            07-tree-folder-plus-actions
```

---

## Planes de infraestructura (bugs)

| # | Plan | Resumen |
|---|------|---------|
| 0 | [00-theme-context-bootstrap.md](./00-theme-context-bootstrap.md) | ThemeProvider + store JSON en main + bootstrap pre-paint; sin flash dark→light |
| 1 | [01-git-context.md](./01-git-context.md) | Cola de operaciones sobre `useRun` + toast; un clic basta |

### Decisiones — tema

- Script sync en `index.html` + `ThemeProvider`
- Persistencia: **JSON en `app.getPath("userData")`** (migrando `localStorage` al primer arranque)
- Arreglar `styles.css`: un `body` sin clase ya no puede ser oscuro
- Modos: light / dark; OS solo sin preferencia guardada
- Chrome nativo sigue el tema del usuario

### Decisiones — operaciones

- Alcance renderer; envuelve `useRun`
- **Cola**: las acciones del usuario se encolan, no se descartan (rechazar no eliminaba el segundo clic)
- Deduplicación por operación; el refresh de fondo sí se descarta
- Toast HeroUI (`Toast.Provider` + `toast.info`) para anunciar la espera
- El refresh posterior va **dentro** del mismo lock

---

## Planes de carpetas/templates

| # | Plan | Resumen |
|---|------|---------|
| 3 | [03-remove-portada.md](./03-remove-portada.md) | Quitar UI, lógica, enums e i18n de portada de carpeta |
| 4 | [04-folder-select-shows-templates.md](./04-folder-select-shows-templates.md) | Carpeta → `EditorBlank` + templates; eliminar `SectionCanvas` |
| 5 | [05-create-target-chip.md](./05-create-target-chip.md) | Chip `Creando en: {path}` sobre `CreatePageForm` |
| 6 | [06-collapse-workpane-on-folder.md](./06-collapse-workpane-on-folder.md) | Colapsar columna WorkPane al navegar a carpeta |
| 7 | [07-tree-folder-plus-actions.md](./07-tree-folder-plus-actions.md) | Botón `+` VS Code + callbacks + parent explícito en modal |

### Decisiones — carpetas (acordadas previamente)

| Tema | Decisión |
|------|----------|
| Seleccionar carpeta | Siempre picker de templates en Stage |
| Portada | Eliminar por completo en este release |
| Submenú árbol | Botón `+` al hover; dropdown New file / New folder |
| Distintivo destino | Chip `Creando en: {path}` / `Creando en: /` |
| WorkPane | Colapsar al seleccionar carpeta |
| Atajos | Sin cambios (`Cmd+N`, `Cmd+Shift+N`) |

---

## Comandos útiles

```bash
# Infra
npm run test -- --run apps/desktop/src/theme
npm run test -- --run apps/desktop/src/App

# Home / árbol
npm run test -- --run apps/desktop/src/screens/home
npm run test -- --run apps/desktop/src/components/Tree

# Siempre antes de cerrar un plan
npm run desktop:typecheck
npm run desktop:lint

# App en dev
npm run desktop:dev
```

---

## Criterios de aceptación globales

### Infra

- [ ] Abrir app con OS dark + tema light → sin flash oscuro en ningún frame
- [ ] Tema persiste en `preferences.json` tras migrar desde localStorage
- [ ] Chrome nativo coherente con el tema del usuario
- [ ] **Un solo clic basta** en toda acción git, incluso con otra operación en vuelo
- [ ] Doble clic rápido → una sola operación (deduplicada)

### Carpetas

- [ ] Click carpeta → templates + chip destino
- [ ] WorkPane colapsada con carpeta seleccionada
- [ ] Hover carpeta → `+` con New file / New folder
- [ ] New folder desde `+` crea en carpeta del menú
- [ ] Cero referencias a portada de carpeta en home
- [ ] Specs del área pasan
