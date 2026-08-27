# Plan 11e — Init + docs de lectura

> La PO enciende el sitio en Slash MD. READING deja de mandar a Docsify.

**Depende de:** [11a](./11a-site-config-and-routes.md) (campo `site`). El snippet YAML de [11d](./11d-github-workflow.md) se pega en la guía. **Índice:** [11](./11-reader-site.md).

---

## Init / Settings

Toggle **solo si** el modo no es `local` (sin GitHub no hay Pages).

- Label: publicar sitio de lectura (GitHub Pages).
- On → `site.enabled: true`. `site.name` default = nombre del repo (`parseOwnerName`). No inventar `basePath` (el workflow default basta).
- Off → `site.enabled: false` (conservar `name` si existía).
- **No** escribir `.github/workflows/docs.yml`. Un párrafo bajo el toggle: hay que añadir el workflow y elegir Pages → GitHub Actions. Link a USAGE/READING.

i18n `es` / `en` (`home.modals.init.siteTitle`, `siteBody`, `siteHint`).

`useInitModalController.onSubmit` incluye `site` en el `SlashmdFile`. Si el usuario no toca el toggle, persistir el valor actual del workspace (no clobber).

---

## Docs

- [READING.md](../READING.md): Option 2 = reader + workflow. Docsify → “legacy / no recomendado”.
- [USAGE.md](../USAGE.md): una subsección “Sitio público” (toggle + YAML + Settings).
- [slashmd.example.json](../slashmd.example.json): bloque `site`.
- [DECISIONS.md](../DECISIONS.md): una línea — Pages reader opt-in vía `site.enabled` (ya no “fuera de v1” como único camino).
- [FLOWS.md](../FLOWS.md): caja corta post-merge: `main` → Action → Pages (opcional).

No borrar `docs-site/` en este slice (follow-up). Actualizar `docs-site/README.md` con puntero al plan 11.

---

## Qué puede salir mal

| Fallo | Qué hacer |
|-------|-----------|
| Toggle on, sin YAML | El sitio no sale; hint en el modal, no error de Init |
| Settings guarda y borra `site` | 11a parse + submit envía `site` |
| `local` + toggle | Ocultar toggle |
| Copy promete sitio privado | READING ya cubre plan GitHub; no mentir |

---

## Archivos

- `InitModal` + `useInitModalController`
- locales `es.json` / `en.json`
- Specs Init: toggle on → `onSave` con `site.enabled: true`; local no muestra toggle
- Markdown de docs listados

No `apps/reader`. No workflow nuevo.

---

## Criterios

- [x] Workspace/personal: toggle escribe `site.enabled`
- [x] Local: sin toggle
- [x] READING describe el reader, no Docsify como default
- [x] Snippet YAML copiable
