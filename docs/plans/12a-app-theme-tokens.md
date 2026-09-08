# Plan 12a — `app-theme.css`: tokens Desktop compartidos

> Guardado de memoria viva del plan [12](./12-reader-desktop-theme.md). Entrega: `packages/ui/src/shared/app-theme.css`.

**Depende de:** — **Siguiente:** [12b](./12b-content-css.md).

---

## Haz

1. **Nuevo** `packages/ui/src/shared/app-theme.css`:
   - `@import "./tokens.css";` al principio (self-contained: base Notion + fuentes/radio).
   - Mover **verbatim** desde `apps/desktop/src/styles.css`: bloques light (`html.light body, body.vscode-light, body.vscode-high-contrast-light`) y dark (`html.dark body, body.vscode-dark, body.vscode-high-contrast`) con todos los `--slash-*` y `--color-*` HeroUI, y `:root` con `--font-display/body/outlier`, `--text-*`, `--radius-md/lg`, `--home-measure`.
   - Añadir `body` desnudo al grupo light → sin clase ⇒ light (default no-JS). Los tokens solo viven en `body`.

2. Exportar en `packages/ui/package.json`: `"./app-theme.css": "./src/shared/app-theme.css"`.

3. `apps/desktop/src/styles.css`: borrar los bloques movidos → `@import "@slash-md/ui/app-theme.css";`. Dejar el chrome del Desktop (drag, scrollbars, editor-shell, crumbs, rail/pane, media queries).

## Decisión clave

- `app-theme.css` define la paleta Desktop una sola vez; Desktop y Pages la comparten.
- El selector light incluye `body` (sin clase) para que el reader sin JS pinte light, igual que hoy renderiza el Desktop en VS Code light.

## Comandos

```bash
npm run desktop:build
npm run build   # vscode (usa theme.css, no app-theme)
```

## Verificación

- [x] `desktop:build` y `npm run build` (vscode) pasan.
- [x] El bundle reader.css incluye `--slash-accent: #006fee` y `"Inter"` (cascade gana sobre tokens.css).