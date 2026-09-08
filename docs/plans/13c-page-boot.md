# 13c — Auto-open de la página de arranque (`WebPageBoot`)

**Hecho.**

## Objetivo

Cuando el shell te baja a una ruta concreta (`/getting-started/`), la app abre ese
documento automáticamente (no-op en Electron).

## Archivo

- `apps/desktop/src/App/components/WebPageBoot.tsx`
  - `useApp()` + `useRef<boolean>` para ejecutarse una sola vez por sesión
  - Si `getWebBoot()?.page` y `phase === AppPhase.Workspace` → `actions.onOpenPage(boot.page)`
- `apps/desktop/src/App/App.tsx`
  - `<WebPageBoot />` junto a `<Gate />` dentro de `AppContext.Provider`

## Detalle

La navegación entre documentos ya la maneja `StaticWebApi.openPage` (redirige
`location.href`). Este componente solo cubre la **carga inicial** del documento que
el shell pidió.

## Verificación

- Abrir `http://localhost:4199/getting-started/` → se carga "Getting started"
- Abrir `http://localhost:4199/` → se carga la home
