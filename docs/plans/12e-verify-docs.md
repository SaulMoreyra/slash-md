# Plan 12e — Verify + docs

> Guardado de memoria viva del plan [12](./12-reader-desktop-theme.md). Cierre: smoke local + checks repo + READING.

**Depende de:** 12a–12d.

---

## Haz

1. **Smoke fixture** (ambos temas):

   ```bash
   npm run reader:build
   SITE_ROOT=apps/reader/fixtures/wiki SITE_OUT=$PWD/.tmp/site SITE_BASE=/ \
     node apps/reader/dist/build-site.mjs
   cd .tmp/site && python3 -m http.server 4899
   # Playwright: home / getting-started / producto en light y dark; ⌘K palette; toggle
   ```

   Comprobar contra el Desktop wiki: callouts, toggles, task lists, code blocks, mermaid, hero cover/icon, árbol, paleta.

2. **Repo checks**: `npm run lint` (3 errores pre-existentes en `apps/desktop/scripts/brand-electron.mjs` ajenos a este plan), `npm run typecheck`, `npm test` (roundtrip), `npm run test -w @slash-md/desktop` (409 specs).

3. **Docs**: `docs/READING.md` — el sitio Pages ya no dice “mismo preview” a secas; aclara que usa el tema del Desktop (columns, dark mode, toggle).

## Verificación

- [x] Build fixture 3 páginas; sin errores de consola en light/dark/nested.
- [x] Computed coincide con Desktop: `Inter`, prose 15px/1.6, h2 24px, dark `#18181b`/`#ececec`, light `#ffffff`/`#18181b`.
- [x] `typecheck`, roundtrip y 409 desktop specs pasan; lint solo con los 3 errores pre-existentes.