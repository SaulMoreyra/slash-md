# Plan de implementación

Producto: ver [README.md](../README.md). Decisiones: [DECISIONS.md](DECISIONS.md). Contexto: [RESEARCH.md](RESEARCH.md). Revisión crítica: [AUDIT.md](AUDIT.md).

Para ejecutar: [IMPLEMENTATION.md](IMPLEMENTATION.md) tiene el checklist por fase con sus validaciones. Este documento es el orden y el porqué.

## Objetivo de v1

Que una PO abra un draft, edite con slash tipo Notion, autosave local, **Review** abra un PR en el repo de documentación y **Publish** mergee ese PR una vez aprobado. Con el PR abierto, los review threads de GitHub flotan en el canvas: ver, responder, resolver y crear desde una selección.

## Dependencias entre fases

```
0.5 Repo de docs (sin código)
        │
0 Cimientos ─┬─► 1 Barra ──────────────► 4 Review ─► 5 Publish ─► 7 Hardening
             └─► 2 Crepe ─► 3 GitHub ────┘              ▲
                              │                         │
                              └─► 6 Bloques y docs ─────┘
                              └─► 8a Comments ver
                                    └─► 8b Comments write
```

GitHub (3–5) puede ir en paralelo a bloques (6) **después** del gate de fixtures de la fase 2. Comments (8) exige Review estable (4) y que el draft lleve `prNumber` + `headOid` + `path`.

Publish (5) **no** espera a comments.

**Checkpoint de adopción:** al terminar la fase 4, la PO escribe un doc real de punta a punta. Si no lo usa, el problema es la superficie (extensión de escritorio) y hay que reconsiderar `github.dev` antes de invertir en 6–8. Ver [AUDIT.md](AUDIT.md).

---

## Fase 0.5 — Repo de documentación (sin código)

**Meta:** que exista un repo de docs de verdad antes de construir la herramienta que escribe en él. Es configuración, no producto, y desbloquea las fases 3–5.

- Estructura de carpetas + índice (`README.md` como portada)
- Plantillas: PRD, spec, decisión
- `CODEOWNERS` para que el review llegue al dev correcto
- Plantilla de PR para cambios de documentación
- Actions: markdownlint + link checker
- **Branch protection en `main`**: required reviewers, sin push directo
- Convención de frontmatter: `title`, `owner`, `status`, `updated`

**Salida:** un repo privado donde un PR de docs ya se revisa y se mergea a mano, sin extensión. Esto también sirve de línea base para medir qué aporta slash-md.

## Fase 0 — Cimientos

**Meta:** la extensión abre, crea un draft y no se pierde al cerrar.

- Manifest de extensión (TS, esbuild, `launch.json`, F5)
- Comandos `Slash MD: New`, `Slash MD: Open Draft`
- Custom Editor `slash-md.editor` con selector estrecho (drafts, no `*.md` genéricos)
- Drafts en `globalStorage/drafts/`
- UI mínima: `<textarea>` + debounce 300 ms → disco

**Salida:** New → escribes → cierras → Open Draft y el texto sigue. Sin Milkdown, sin GitHub.

## Fase 1 — Barra de la página

**Meta:** la página es el producto; los botones hablan con el host.

- Chrome: título, path, estado (`draft saved · 3m`), **Review**, **Publish**
- Clic → `postMessage` → modal nativo → toast “repo no configurado”
- Review visualmente primario; Publish deshabilitado hasta que exista un PR aprobado

**Salida:** ambos botones llegan al host y vuelven con estado. GitHub mockeado.

## Fase 2 — Milkdown (CrepeBuilder)

**Meta:** WYSIWYG usable y Markdown estable. **Gate para todo lo demás.**

- Sustituir textarea por CrepeBuilder (features de DECISIONS)
- `markdownUpdated` → autosave; un editor por doc; `destroy()` al dispose
- Slash: apagar math/h4–h6; aliases `/h1` `/title1` `/code` `/quote` `/list` `/todo` `/table` `/image` `/divider`
- CodeMirror: 4–6 lenguajes lazy
- Tema: `--crepe-*` desde `--vscode-editor-*`
- `fixtures/*.md`: open → `getMarkdown()` → snapshot

**Salida:** editas con `/`, el draft es Markdown razonable, F5 no deja editor zombie. **Si el serializer ensucia los fixtures, no se avanza a GitHub.**

## Fase 3 — Repo de contenido + auth

**Meta:** la extensión sabe dónde vive el documento publicado.

- Settings: `contentRepo`, `contentPath`, `defaultBranch` (preconfigurados, no wizard por usuario)
- Wizard solo como fallback si falta config
- Auth `getSession('github', ['repo'])`
- Clone/worktree en `globalStorage/repos/<org>/<name>`
- Comando **Open from GitHub**
- Indicador `ahead of GitHub` si draft ≠ remoto
- Vista Activity Bar **Slash MD**: Drafts + Docs (árbol remoto)

**Salida:** abres un `.md` remoto, editas local, ves ahead. Sin commit todavía.

## Fase 4 — Review (camino default)

**Meta:** Review produce un PR de verdad. **Dejar en el estado del draft:** `prNumber`, `headOid`, `path`.

- Branch `slash-md/<slug>-<YYYYMMDD-HHmm>`
- Escribe el archivo en el clone (`contentPath` + slug)
- `git add/commit/push` + PR (título = H1)
- Re-Review del mismo draft → push a la **misma** rama, no un segundo PR
- `CODEOWNERS` asigna reviewers solo; la barra muestra a quién le toca
- Barra: `in review #123` + link + estado de aprobación

**Salida:** Review → PR en el browser → segundo Review actualiza ese PR. **Checkpoint de adopción:** la PO escribe un doc real aquí.

## Fase 5 — Publish (mergear el PR)

**Meta:** llevar el doc a `main` respetando la protección de rama.

`main` está protegida (fase 0.5), así que **no hay push directo**: Publish mergea el PR de review.

- Requiere PR abierto + aprobación + checks verdes; si no, Publish explica qué falta
- Merge vía API; borrar la rama
- Estado `published` + URL del archivo en GitHub
- Tratar como estados de UI, no errores genéricos: `sin aprobación`, `checks en rojo`, `push rechazado por protección de rama`, `conflicto`
- Dejar de pintar threads del PR (se mergeó)

**Salida:** Publish mergea un PR aprobado y el doc queda en `main`. Sin aprobación, Publish no hace nada y dice por qué.

## Fase 6 — Bloques y capa de documentación

Paralelo a comments; no mezclar con el primer Review. Orden por lo que desbloquea a la PO:

1. **Imágenes** — `onUpload` → host → `contentPath/images/` + `asWebviewUri`. Pegar sin miedo es lo que más importa
2. **Tablas** — Crepe + fixture GFM
3. **Frontmatter** — `title`, `owner`, `status`, `updated` editables como cabecera del doc, no como YAML crudo
4. **Plantillas** — `Slash MD: New` ofrece PRD / spec / decisión (las de la fase 0.5)
5. **Navegación del repo** — árbol de `contentPath` en la vista Docs, badge "en edición", crear doc dentro de una sección; tercera puerta: **Editar con Slash MD** desde Explorer si el workspace es el repo de docs (copia a draft, no in-place)
6. **Mover y renombrar** — carpeta + filename (carpetas implícitas); actualizar links relativos que apuntan al doc
7. **Callouts** — `> [!NOTE]`; slash `/callout` `/info` `/warning`
8. **Toggles** — `<details><summary>`; slash `/toggle`

**Salida:** la PO crea un doc desde plantilla dentro de una sección, con imagen y tabla, y sobrevive Open → editar → Review viéndose bien en GitHub. Carpetas sin CRUD vacío: existen porque hay `.md` dentro.

## Fase 7 — Endurecer

- CSP + nonce
- Recrear editor solo si cambia `version` externa
- Errores (auth, push rejected, conflicto) en la barra
- [USAGE.md](USAGE.md) (flujo Review → aprobación → Publish)
- **Onboarding de un clic para la PO**: `.vsix` + USAGE; settings de ejemplo en [workspace-settings.example.json](workspace-settings.example.json)

**Salida:** usable en Cursor sin tocar el código.

## Fase A — Biblioteca + Fase B — Endurecer (hecho en código)

Ver checklist en [IMPLEMENTATION.md](IMPLEMENTATION.md). Drafts/Docs muestran título y carpeta; `.vsix` + USAGE listos.

## Fase C — Checkpoint de adopción

La PO escribe un doc real con solo USAGE.md. Si no lo usa, parar antes de comments ([AUDIT.md](AUDIT.md)).

## Fase 8a / D1 — Comments: ver

**Depende de:** fase 4 + checkpoint C. **Post-v1.**

- Pull GraphQL `reviewThreads`
- Mapping snippet → highlight + popover solo lectura
- Huérfanos en rail
- Poll al focus + ~45s
- Fixture: pintar comments no cambia `getMarkdown()`

**Salida:** un compañero comenta una línea en GitHub; abres el draft; el globo está en el párrafo correcto.

## Fase 8b / D2 — Comments: Notion completo

- Reply y resolve/unresolve desde el popover
- “Comment” en selección (toolbar flotante)
- Push a la rama de review si el draft está ahead (aviso en el popover)
- Optimistic UI + refresh
- Read-only si no hay permiso de write

**Salida:** seleccionas una frase, comentas, aparece en el PR; respondes y resuelves sin salir; si reescribes esa frase, el hilo pasa a huérfanos.

---

## Criterio de “v1 lista” (ship)

- New draft desde plantilla → `/h1` `/list` `/table` `/image` → autosave
- **Home** + biblioteca Activity Bar: títulos + carpetas
- `.slashmd.json` en el repo de docs (opcional) define `contentPath` / `defaultBranch` / `sections`
- Review → PR en el repo de docs; segundo Review actualiza el mismo PR
- Publish mergea el PR aprobado; sin aprobación explica qué falta
- Imagen + tabla + callout GFM se ven bien en GitHub
- Cerrar y reabrir el draft no pierde trabajo
- Los `.md` del workspace de código **no** se abren aquí
- `.vsix` + [USAGE.md](USAGE.md): **la PO completa el ciclo sin ayuda y sin tocar settings**

Comments en el canvas = **post-v1** (fase D), después del checkpoint de adopción.

## Fuera de v1

Collab en vivo, webhooks, cursors, comments sin PR, anclar comments a imágenes como Notion, aplicar `suggestion` de GitHub, LaTeX, AI de Crepe, hijack de `*.md`, sitio de GitHub Pages, búsqueda entre documentos, New/rename/delete folder, drag-and-drop entre carpetas, editar el working tree in-place, `~/.slashmdrc`, editar `.slashmd.json` desde la UI.

## Siguiente paso

1. **Fase C**: checkpoint de adopción con la PO y [USAGE.md](USAGE.md).
2. Si C OK → **Fase D** comments (8a → 8b).
3. Empaquetar: `npm run package` → `slash-md-0.0.1.vsix`.
