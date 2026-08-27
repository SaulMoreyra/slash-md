# Plan 11a — Contrato `site` + rutas

> El JSON de la wiki declara si hay sitio y cómo se mapea cada `.md` a una URL. Core puro, sin fs de Pages ni Crepe.

**Siguiente:** [11b](./11b-build-site.md). **Índice:** [11](./11-reader-site.md).

Hoy `parseSlashmd` vive en `apps/desktop/electron/config.ts` y **tira claves desconocidas**. Si alguien añade `site` a mano y luego guarda Init, **se borra**. Hay que parsear `site` en core y que Electron delegue.

---

## Contrato

```json
{
  "repo": "acme/Help",
  "contentPath": ".",
  "mode": "workspace",
  "site": {
    "enabled": true,
    "name": "Help",
    "basePath": "/Help/"
  }
}
```

| Campo | Regla |
|-------|--------|
| `site` | Ausente = no hay sitio |
| `site.enabled` | Solo `true` enciende el build. Otro valor / omitido = off |
| `site.name` | Título del sidebar. Fallback: `name` del repo (`Help`) |
| `site.basePath` | Prefijo de URLs. Normalizar: vacío → `""`; `"Help"` → `"/Help/"`; `"/"` se queda `"/"` |

`mode` no se lee en este módulo de rutas.

---

## Rutas (`routeFor`)

Input: path posix del archivo en el repo (`producto/guia.md`) + `contentPath` resuelto (`""` si `.`).

1. Quitar el prefijo `contentPath` (`docs/foo.md` + content `docs` → `foo.md`).
2. `README.md` (case-insensitive) en ese rel → ruta `/`.
3. `foo.md` → `/foo/`.
4. `a/b.md` → `/a/b/`.
5. Siempre trailing slash (excepto `/` que ya es la raíz). Concatenar con `basePath` en el HTML, no en `routeFor` (el helper puro devuelve path desde la raíz del sitio).

Specs: content `.` vs `docs`; `README.md` vs `readME.md`; no colisionar `foo.md` y `foo/README.md` — si chocan, **archivo no-README gana la carpeta** y el README de carpeta se publica como `/foo/` solo si no hay `foo.md`. Documentar en spec; implementación: preferir `foo.md` para `/foo/`; `foo/README.md` entonces `/foo/readme/` o skip con warning. **Decisión:** `foo.md` → `/foo/`; `foo/README.md` → `/foo/` **solo si no existe `foo.md`**; si existe, `foo/README.md` → `/foo/readme/` (slug del stem). Evitar 404 silenciosos.

---

## Qué publicar (`shouldPublishPage`)

Reusar predicados de core, no copiar `walkMd`.

Publicar si:

- `isUnderContentPath(path, contentPath)`
- termina en `.md` y **no** en `.slash.md`
- **no** `isTemplateRepoPath` contra `templateDirCandidates(contentPath, templatesPath)`

Dotfiles/dirs los filtra el walk (11b). Aquí solo el path.

Mover la lógica de `isContentMarkdown` (`electron/workspace.ts`) a core (`sitePages.ts` o `paths.ts`) y que Electron la importe.

---

## Parse

Nuevo (o extender) `packages/core/src/slashmd.ts` / `configTypes.ts`:

- Tipo `SlashmdSite` + `site?: SlashmdSite` en `SlashmdFile`
- `parseSlashmd(raw)` **en core** (hoy solo Electron)
- `parseSlashmdSite(raw)` interno; claves de más en `site` se ignoran

`electron/config.ts` `parseSlashmd` pasa a reexportar el de core + las mismas reglas de `repo` / `contentPath` / `mode`. **Un solo parser.** Specs en `test/domain` (o `packages/core` si ya hay tests ahí): round-trip `site.enabled`; Init-save no pierde `site` si el parse de Electron usa core.

`writeSlashmd` ya hace spread del existente: con parse correcto, Settings sin tocar el toggle **conserva** `site`.

---

## Qué puede salir mal

| Fallo | Qué hacer |
|-------|-----------|
| `basePath` sin slashes → assets 404 | Normalizar siempre leading+trailing salvo `"/"` |
| `contentPath: "docs"` y ruta `/docs/foo/` | `routeFor` **strips** contentPath |
| `parseSlashmd` Electron vs core divergen | Electron solo llama core |
| `site: true` (boolean) | Tratar como off; solo objeto |
| `foo.md` + `foo/README.md` | Spec de colisión arriba; test fixture |
| Templates filtrados a medias | Usar `templateDirCandidates` + `isTemplateRepoPath`, no un string hardcode |

---

## Archivos

- `packages/core/src/configTypes.ts` — `SlashmdSite`, campo `site`
- `packages/core/src/slashmd.ts` (o parse junto a configTypes) — `parseSlashmd`
- `packages/core/src/sitePages.ts` — `shouldPublishPage`, `routeFor`, `normalizeBasePath`
- `apps/desktop/electron/config.ts` — delegar parse
- `docs/slashmd.example.json` — ejemplo `site` comentado o con `enabled: false`
- Tests domain / core

No `apps/reader` todavía. No workflow. No Init UI (11e).

---

## Criterios

- [x] `parseSlashmd` en core entiende `site.enabled` / `name` / `basePath`
- [x] Electron usa ese parse (no un segundo objeto)
- [x] `routeFor` + colisión README cubiertos por spec
- [x] `shouldPublishPage` excluye templates y sidecars
- [x] `isContentMarkdown` del host importa el predicado de core (o se elimina el duplicado)
