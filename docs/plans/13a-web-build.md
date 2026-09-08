# 13a — Web build del app desktop (Enfoque A)

**Hecho.**

## Objetivo

Web-buildar la misma app desktop (React + Vite) en modo solo lectura, sin Electron.

## Archivos

- `apps/desktop/vite.web.config.ts` — nuevo config Vite
  - Plugins: `react()` + `tailwindcss()` (sin `vite-plugin-electron`)
  - `base: "./"` (para desplegar en GitHub Pages bajo subpath)
  - `resolve.alias`: `@slash-md/core|github|ui` → `packages/*/src`
  - `build.outDir: "dist-web"`, `emptyOutDir: true`
  - `rollupOptions.input.main` → `index.web.html`
- `apps/desktop/index.web.html` — template del entry web
  - Script inline de tema (lee `localStorage["slash-md-theme"]` → fallback
    `prefers-color-scheme`), setea `__SLASHMD_INITIAL_THEME__` + `data-theme` +
    clases antes del render (sin flash)
  - Google Fonts (Inter/JetBrains Mono) igual que el desktop
  - `<div id="root">` + `<script type="module" src="/src/main.web.tsx">`
- `apps/desktop/src/main.web.tsx` — entry web
  - `applyTheme(getThemeSnapshot())` pre-mount
  - `window.slashmd = createWebApi()`
  - `installWebLinkNavigation()`
  - Render `ThemeProvider` → `LocaleProvider` → `Toast.Provider` → `<App />`
- `apps/desktop/src/vite-env.d.ts` — declara `__SLASH_MD__`

## Scripts

- `apps/desktop/package.json`: `"web:build": "vite build --config vite.web.config.ts"`
- raíz `package.json`: `"desktop:web:build"`; `site:build`/`site:preview` ahora
  construyen web primero.

## Verificación

- `npm run desktop:web:build` -> `dist-web/index.html` + `assets/main.*.js|css`
- `npm run desktop:typecheck` verde
