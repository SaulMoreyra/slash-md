# Plan — Pestañas multi-documento estilo VSCode (Issue #6)

> Estado: **en ejecución**. Cada fase se marca `[x]` al completarse y verificarse.

## Decisiones tomadas

- **Estado del editor**: editores montados ocultos (`display:none` + `inert`) — switch instantáneo, cero IPC.
- **Ubicación barra**: arriba del Stage (sobre la `EditorBar`), estilo Obsidian.
- **Nav a carpeta**: mantener pestañas abiertas (se quita `onClosePage` de `useNav.onOpenFolder`).
- **Cerrado sucio**: conservar cambios silenciosamente al cambiar de tab (VSCode); `onFlushSave()` best-effort antes de desmontar al cerrar.

## Arquitectura

- `useTabs` sustituye a `usePageSession`: `TabState[]` (`key = page.path`, `page`, `focusThreadId`, `dirty`), `activeKey`, `order` (MRU).
- `session.page/focusThreadId/trail` se derivan del tab activo → compatibilidad con todos los consumidores.
- `EditorSlot` → carpeta con `EditorStack` (paneles `absolute inset-0`, activo visible + `inert`) y `EditorPanel` (`memo`).
- Hooks del editor gateados por `active` (keydown, find-in-page bridge, body-class) y reportan `onDirtyChange(path, dirty)`.
- `TabBar/` bajo `screens/home/components/`, renderizado por `Body` en modo página.
- `onRewritePath(from, to)` / `onCloseTabsUnder(prefix)` para rename/delete de árbol.

## Non-negotiables de performance

1. Cambio de tab = solo toggle de visibilidad, ni una llamada IPC.
2. `dirty` en ref + versión; nada de estado App por pulsación de tecla.
3. Panels `memo` + callbacks estables → tabs ocultos no se re-renderizan por el activo.
4. Dedupe por path en `useTabs` (más el dedupe concurrente de `useOperationsController`).
5. Listeners de ventana registrados solo cuando `active`.

## Fases

### Fase 1 — Modelo `useTabs` + cableado App
- [x] `App/hooks/useTabs.ts` (nuevo, sustituye `usePageSession.ts`)
  - `openTab` / dedupe, `activateTab`, `closeTab`, `closePage`, `closeAllPages`,
    `closeTabsUnder`, `rewritePath`, `pageBy(key)` (update), `reloadPage`, `dirty` ref+versión.
- [x] `App/hooks/useAppController.ts`: `useTabs`, `onClearPage = closeAllPages`, nuevos actions.
- [x] `App/hooks/useWorkspace.ts`: sin cambios (usa `onClearPage`).
- [x] `App/__specs__/mocks.ts`: `session.tabs/activeKey`, nuevos actions.
- [x] `App/hooks/__specs__/useTabs.spec.ts` (reemplaza `usePageSession.spec.ts`).
- [x] `App/__specs__/App.spec.tsx` actualizado.

### Fase 2 — EditorSlot multi-editor
- [x] Carpeta `App/components/EditorSlot/` (EditorSlot.tsx, components/EditorStack.tsx,
      components/EditorPanel.tsx, hooks/useEditorSlotController.ts, index.ts).
- [x] `__specs__/EditorSlot.spec.tsx`.

### Fase 3 — Gateo `active` + dirty + flush-on-close
- [x] `EditorScreenProps` + `useEditorController`: `active`, `onDirtyChange`.
- [x] `useKeyboardShortcuts` (editor): registrar solo si `active`.
- [x] `useFormatter`: body-class solo activo; efecto `onDirtyChange`.
- [x] `useFindInPage`: bridge solo activo.
- [x] `Editor.tsx` root: `onClose` = flush best-effort + `onClose`.
- [x] Spec formatter (dirty transitions + gateo).

### Fase 4 — TabBar
- [x] `screens/home/components/TabBar/` (TabBar, TabList, TabItem, hooks/useTabBarController, index).
- [x] i18n `home.tabs.*` (es/en).
- [x] `__specs__/TabBar.spec.tsx`.

### Fase 5 — Cableado Home
- [x] `HomeScreenProps` + `Workspace.tsx` (+ `tabs/activeKey/onActivateTab/onCloseTab/onRewritePath/onCloseTabsUnder`).
- [x] `useHomeController` + `Home/context.tsx` exponen tabs/acciones.
- [x] `Body` página + conflicto: renderiza `TabBar` sobre children.
- [x] `useNav.ts`: quitar `onClosePage` de `onOpenFolder`.
- [x] `useTreeMutations.ts`: `onRewritePath`/`onCloseTabsUnder` en rename/delete.

### Fase 6 — Hardening
- [ ] `stageKey`: no remonta en flips `editing/selected` con `hasPage`.
- [ ] Accesibilidad tablist/tab, flechas ←/→, clic central.
- [ ] ⌘⇧]/⌘⇧[ (opcional) en `screens/home/hooks/useKeyboardShortcuts.ts`.

### Fase 7 — Verificación
- [ ] `npm run desktop:lint`
- [ ] `npm run desktop:typecheck`
- [ ] `npm test -w @slash-md/desktop`
- [ ] Smoke (`slash-md-smoke`): abrir 2 docs, switch, dirty dot, cerrar, ⌘W, último tab → Home.

## Riesgos / mitigaciones

| Riesgo | Mitigación |
|---|---|
| Tabs fantasma tras rename/delete | `onRewritePath` / `onCloseTabsUnder` |
| Remount de `Body` en conflicto pierde buffers | `stageKey` endurecido (Fase 6) |
| Listeners duplicados con N editores | Gateo por `active` |
| Re-render de todos los editores al teclear | dirty en ref + `memo(EditorPanel)` |
| Pérdida de guardado pendiente al cerrar | `onFlushSave()` antes de desmontar |