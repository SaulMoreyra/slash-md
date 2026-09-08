# Plan 12b — `content.css`: rendering Crepe compartido

> Guardado de memoria viva del plan [12](./12-reader-desktop-theme.md). Entrega: `packages/ui/src/editor/content.css`.

**Depende de:** — **Siguiente:** [12c](./12c-reader-wiring.md).

---

## Haz

1. **Nuevo** `packages/ui/src/editor/content.css`, movido desde `theme.css`:
   - Los 10 `@milkdown/crepe/theme/common/*.css`.
   - Mapa de tokens `--crepe-color-*` → `--slash-*`.
   - Rules `.milkdown` / `.ProseMirror`: h1–h3, p, list bullets, task lists, links, code inline, blockquote, hr, fill de SVGs.
   - `.slash-callout*`, `.slash-toggle*`, `.milkdown-code-block` + `.slash-mermaid-error`.
   - **Merge** de los extras que vivían solo en `apps/desktop/src/styles.css`: ProseMirror `font-size: var(--text-body)` / `line-height: 1.6`, h2 `1.5rem` + `--color-ink-bright`, code-block `border-radius/border/bg`, inline code, `.cm-editor` transparente.

2. `theme.css`: quedarse como `@import "../shared/tokens.css"; @import "./content.css";` + chrome del editor (`.bar`, cover toolbar, icon picker, `.edited-*`, threads, slash-menu, comentarios).

3. `apps/desktop/src/styles.css`: borrar los extras `.milkdown` que ahora viven en `content.css` (el `.milkdown-slash-menu` queda en Desktop).

4. Exportar en `packages/ui/package.json`: `"./content.css": "./src/editor/content.css"`.

## Decisión clave

- `content.css` es el rendering Crepe *único*: webview (vía `theme.css`), Desktop y Pages muestran el mismo Markdown.
- `--text-body`/`--color-ink-bright` existen en `app-theme.css` (`:root`); en el webview VS Code caen al fallback (`16px`, `--slash-text`) — comportamiento aceptado, fuera de alcance.

## Comandos

```bash
npm run desktop:build
npm run build   # vscode webview bundle incluye content.css
```

## Verificación

- [x] ambos builds pasan.
- [x] Computed (reader, dark): prose `15px`/`line-height 24px`, h2 `24px` = Desktop exacto.