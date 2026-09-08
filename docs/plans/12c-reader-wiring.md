# Plan 12c — Reader consume app-theme + content.css

> Guardado de memoria viva del plan [12](./12-reader-desktop-theme.md). Entrega: `apps/reader` usa los CSS compartidos.

**Depende de:** [12a](./12a-app-theme-tokens.md), [12b](./12b-content-css.md). **Siguiente:** [12d](./12d-dark-boot.md).

---

## Haz

1. **`apps/reader/src/reader.css`**: sustituir los 11 imports (`tokens.css` + 10 crepe commons) por:

   ```css
   @import "@slash-md/ui/app-theme.css";
   @import "@slash-md/ui/content.css";
   ```

2. **Alinear chrome reader a la wiki Desktop (read-only)**:
   - Hero icon: `78px`, `--slash-font-emoji` (Desktop `.hero-icon`).
   - Título: `40px`, `700`, `-0.02em`, `--color-ink-bright` (Desktop `.hero-title`).
   - Cover: `min(30vh, 280px)`, min-height `120px`, fondo `--slash-chrome`.
   - Canvas: `max-width: var(--home-measure)` (50rem), padding `0 48px 40px`.
   - Body: `font-size: var(--text-ui)`, `-webkit-font-smoothing: antialiased`.
   - Tree: `--slash-hover`/`--slash-selected`, folder `--slash-muted`, botón search con `--radius-md`/`--slash-surface`.
   - Palette: overlay `--slash-overlay`, box `--slash-surface` + `--border` + `--slash-shadow-2`, input focus `--slash-accent`.
   - Light/dark out of the box: todos los colores vía tokens (no hex sueltos).

3. **`apps/reader/src/shell.ts`**: `meta[name=color-scheme]` + preconnect + Google Fonts `<link>` (mismo que `apps/desktop/index.html`). El `THEME_KEY` usa `slash-md-theme`.

## Decisiones clave

- Scale = Desktop: el reader deja de inventar medidas (cubría 180px/2rem/650).
- Fuentes: CDN Google, `font-display=swap` implícito → fallback system si offline.

## Comandos

```bash
npm run reader:build
ls apps/reader/dist/reader.css   # contiene --slash-accent:#006fee e "Inter"
```

## Verificación

- [x] esbuild produce `dist/reader.css` con la paleta HeroUI y `content.css` fusionado.
- [x] El shell generado incluye preconnect + fonts link + color-scheme.