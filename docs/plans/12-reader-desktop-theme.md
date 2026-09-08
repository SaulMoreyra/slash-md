# Plan 12 — El sitio Pages usa el tema del Desktop por defecto

> El reader de [11](11-reader-site.md) pintaba con los **tokens base Notion** (`tokens.css`) y sin dark mode; el Desktop sobrescribe esos tokens con la paleta **HeroUI blue/zinc** (`app-theme.css`). Este plan hace que el sitio público consuma la **misma fuente de verdad** que el Desktop: mismos colores, tipografías y rendering Crepe. **No toca** `CrepeCanvas` ni `packages/ui` vanilla DOM.

**Depende de:** 11 (reader site). **Documento:** [READING.md](../READING.md).

---

## Superficie

```
Desktop (electron)  ─┐
VS Code webview     ─┼─► packages/ui: tokens.css + content.css (Crepe MVP)
Reader (Pages)      ─┘       │
                              ├─► app-theme.css (paleta Desktop: HeroUI blue/zinc, Inter)
                              └─► theme.css (chrome editor) = tokens + content.css
```

- `app-theme.css`: paleta HeroUI light/dark + fuentes, **compartida** Desktop ↔ Pages.
- `content.css`: tokens Crepe + typography `.milkdown`, **compartida** webview ↔ Desktop ↔ Pages.
- Reader: `dark`/`light` por `prefers-color-scheme` + toggle persistido (como el Desktop sigue al OS).

---

## Orden

```
12a  app-theme.css (tokens Desktop compartidos)
  │
  └──► 12b  content.css (rendering Crepe compartido)
           │
           └──► 12c  reader consume app-theme + content.css (chrome + fuentes)
                    │
                    └──► 12d  dark boot + toggle
                             │
                             └──► 12e  verify + docs
```

| # | Plan | Entrega |
|---|------|---------|
| a | [12a-app-theme-tokens.md](./12a-app-theme-tokens.md) | `packages/ui/src/shared/app-theme.css`; Desktop importa desde ahí; light = `body` sin clase |
| b | [12b-content-css.md](./12b-content-css.md) | `packages/ui/src/editor/content.css`; `theme.css` lo re-importa |
| c | [12c-reader-wiring.md](./12c-reader-wiring.md) | Reader usa ambos; chrome/hero igual que wiki; Google Fonts |
| d | [12d-dark-boot.md](./12d-dark-boot.md) | `<script>` inline pre-paint + `matchMedia` + toggle persistido |
| e | [12e-verify-docs.md](./12e-verify-docs.md) | Build fixture + smoke light/dark + lint typecheck test + READING |

---

## Decisiones (cerradas)

| Tema | Decisión |
|------|----------|
| Paleta | La del Desktop (HeroUI blue `#006fee` / zinc). Reader deja de usar azul Notion `#2383e2` |
| Dark | `prefers-color-scheme` + toggle en el árbol, persistido en `localStorage["slash-md-theme"]` (EL Desktop sigue al OS por defecto; el toggle replica `ThemeSelector`) |
| Fuentes | Google Fonts CDN idéntico a `apps/desktop/index.html` (Inter + JetBrains Mono); fallback system fonts via `font-display: swap` |
| Escala | `content.css` y `app-theme.css` son la **única** fuente; no duplicar overrides en `reader.css` |
| VS Code webview | Sigue con `theme.css` → usa `content.css` automáticamente. **No** importa `app-theme.css` (mantiene paleta base). Fuera de alcance |
| Chrome reader | Se mantiene simple (árbol + paleta); solo se re-temea. No imita rail/breadcrumbs del Desktop |
| FOUC | `<script>` bloqueante inline (antes del `<link>` CSS) que aplica `html.dark`/`html.light` |

---

## Comandos (al cerrar cada slice)

```bash
npm run reader:build
npm run desktop:build
npm run lint        # 3 errores pre-existentes en brand-electron.mjs (no de este plan)
npm run typecheck
npm test            # roundtrip core

# smoke local fixture
SITE_ROOT=apps/reader/fixtures/wiki SITE_OUT=$PWD/.tmp/site SITE_BASE=/ \
  node apps/reader/dist/build-site.mjs
cd .tmp/site && python3 -m http.server 4899
```