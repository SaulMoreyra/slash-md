# Plan 12d — Dark boot + toggle en el reader

> Guardado de memoria viva del plan [12](./12-reader-desktop-theme.md). Entrega: el sitio sigue al OS y permite toggle persistido.

**Depende de:** [12c](./12c-reader-wiring.md). **Siguiente:** [12e](./12e-verify-docs.md).

---

## Haz

1. **`apps/reader/src/theme.ts`** (nuevo):
   - `currentTheme()` lee `documentElement.dataset.theme`.
   - `applyReaderTheme()` toggles `dark`/`light` + `data-theme`.
   - `bindSystemTheme()`: `matchMedia("(prefers-color-scheme: dark)")` + cambio de OS, solo si no hay override guardado (mismo comportamiento que `ThemeSource.Os` del Desktop).
   - `toggleTheme()`: invierte, persiste `localStorage["slash-md-theme"]`.
   - `paintThemeToggle()`: pinta ☀︎/☾ según estado actual.

2. **`apps/reader/src/shell.ts`**: `<script>` bloqueante inline en `<head>` **antes del CSS** (no FOUC): ci `localStorage` → si no, `matchMedia` dark → `html.dark`/`html.light` + `data-theme`. Inline ya existe para el boot JSON, así que Pages CSP no es problema.

3. **`apps/reader/src/main.ts`**: botón `[data-toggle-theme]` en el árbol (junto al de Search) y `bindTheme()` en boot (pinta icono + listener OS + click). Copy en inglés según [11c](./11c-reader-ui.md).

## Decisiones clave

- El Desktop por defecto sigue al OS (sin preferencia guardada). El reader hace lo mismo vía `bindSystemTheme`.
- El toggle es accesible (`aria-label` + `title`) y respeta el estado real (`documentElement.dataset.theme`).

## Comandos

```bash
npm run reader:build
# smoke: SITE_ROOT/SITE_OUT/SITE_BASE → http server
```

## Verificación

- [x] Playwright `colorScheme: dark` → `data-theme=dark`, bg `#18181b`, texto `#ececec`, toggle muestra ☀︎.
- [x] Click toggle → `data-theme=light` (persiste).
- [x] Ligero: bg `#ffffff`, texto `#18181b`.