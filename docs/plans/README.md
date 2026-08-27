# Planes: infra + crear en carpeta

Planes de implementación para el home de la app desktop y mejoras de infraestructura transversales.

**Alcance principal:** `apps/desktop/src/` (+ `electron/` para el store de tema).

**Auditoría:** todos los planes fueron verificados contra el código real. Ver [AUDIT-2026-08.md](./AUDIT-2026-08.md).

---

## Prerrequisito

**El árbol de trabajo debe estar limpio.** La auditoría encontró ~30 archivos en staging con un refactor `ReviewsPane` → `PublicationsPane` a medias, sobre los mismos archivos que tocan estos planes (`WorkPane.tsx`, `utils.ts`, `enums.ts`, `Overlays.tsx`, `RailNav.tsx`, `useKeyboardShortcuts.ts`). Commitear o stashear antes de empezar.

---

## Orden de ejecución

Ejecutar **en secuencia**. Los planes 00–01 son prerrequisitos de calidad; 03–07 implementan el flujo de carpetas/templates; **08a–08f** enriquece Publicaciones; **09** es independiente de 08.

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
                    │
                    ├──► 08a-mine-only → 08b-status → 08c-hub
                    │                      08d-github → 08e-host → 08f-discard-ui
                    │                      (08d puede ir en paralelo a 08b/08c)
                    │                            │
                    │                            ▼
                    │                      10a-detect-merged → 10b-land-wiki
                    │
                    └──► 09-workpane-closed-tree-empty
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
| 5 | [05-create-target-chip.md](./05-create-target-chip.md) | Path `/docs` + preview del archivo; `/` en el título crea subcarpeta |
| 6 | [06-collapse-workpane-on-folder.md](./06-collapse-workpane-on-folder.md) | Colapsar columna WorkPane al navegar a carpeta |
| 7 | [07-tree-folder-plus-actions.md](./07-tree-folder-plus-actions.md) | Botón `+` VS Code + callbacks + parent explícito en modal |

---

## Planes de publicaciones

Índice y decisiones: [08-publications-pane-rich.md](./08-publications-pane-rich.md).

| # | Plan | Resumen |
|---|------|---------|
| 8a | [08a-publications-mine-only.md](./08a-publications-mine-only.md) | **Hecho.** Lista = solo mis `pub/…` (PR mío o draft local) |
| 8b | [08b-publication-status-card.md](./08b-publication-status-card.md) | **Hecho.** Card con estado humano; `PrStrip` fuera del pane |
| 8c | [08c-publication-action-hub.md](./08c-publication-action-hub.md) | **Hecho.** Un CTA; Wiki/GitHub/copiar en `⋯`; modal solo Enviar |
| 8d | [08d-discard-github.md](./08d-discard-github.md) | **Hecho.** `closePull` / `openPull` |
| 8e | [08e-discard-host.md](./08e-discard-host.md) | **Hecho.** IPC `discardPublication` (force + clean + rollback) |
| 8f | [08f-discard-ui.md](./08f-discard-ui.md) | **Hecho.** Modal confirmar; `⋯` en Actual y Otras; sign-in |
| 9 | [09-workpane-closed-tree-empty.md](./09-workpane-closed-tree-empty.md) | **Hecho.** WorkPane cerrado al arrancar; click abre; ⌘1/2/3 alternan; skeleton + empty del árbol |
| 10 | [10-wiki-after-github-merge.md](./10-wiki-after-github-merge.md) | **Hecho.** Índice. Merge en GitHub → wiki local |
| 10a | [10a-detect-merged-publication.md](./10a-detect-merged-publication.md) | **Hecho.** Detectar PR mergeado → `kind: published` |
| 10b | [10b-land-wiki.md](./10b-land-wiki.md) | **Hecho.** Actualizar wiki / Leave / prune |

### Decisiones — carpetas (acordadas previamente)

| Tema | Decisión |
|------|----------|
| Seleccionar carpeta | Siempre picker de templates en Stage |
| Portada | Eliminar por completo en este release |
| Submenú árbol | Botón `+` al hover; dropdown New file / New folder |
| Distintivo destino | Path grande `/docs` + preview `/docs/{slug}.md`; `/` anida subcarpeta |
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

- [x] Click carpeta → templates + path destino (`/docs` + preview)
- [x] WorkPane colapsada con carpeta seleccionada
- [x] Hover carpeta → `⋯` con New file / New folder
- [x] New folder desde `⋯` crea en carpeta del menú
- [ ] Cero referencias a portada de carpeta en home
- [x] Specs del área pasan

### Home chrome (plan 09)

- [x] WorkPane cerrado al arrancar
- [x] Click Inbox / Borradores / Publicaciones solo abre
- [x] ⌘1 / ⌘2 / ⌘3 alternan el pane
- [x] Árbol: skeleton al cargar, empty si no hay páginas
