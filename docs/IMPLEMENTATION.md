# Implementación — flujo Notion (local-first)

Checklist ejecutable del ciclo **Borrador → Staging → Revisión → Feedback → Comentarios → Publicar**.

El modelo anterior (drafts en `globalStorage/*.slash.md`, un PR por archivo, clone en `globalStorage/repos`) queda **reemplazado**. El código viejo se reutiliza donde sirva; no se copia el flujo.

Contrato, orden y porqué: este archivo. Decisiones históricas: [DECISIONS.md](DECISIONS.md). Uso: [USAGE.md](USAGE.md).

Cada fase: **propósito**, **ya existe**, **hacer**, **validar**, **falla si**. Un agente nuevo ejecuta una sola fase y marca el tablero.

---

## Tablero

| Fase | Nombre | Estado | Notas |
|---|---|---|---|
| 1 | Creación y borrador | hecho | `.md` real en el workspace, `status: draft`, cero Git/GitHub |
| 2 | Staging (Borradores Locales) | hecho | Lista + checkboxes de páginas sucias / draft |
| 3 | Mandar a Revisión | hecho | Lote → `review/docs-YYYY-MM` + un PR; YAML `in_review` + `pr: N` |
| 4 | Feedback recibido | hecho | Inbox GraphQL + badge TreeView + revealThread en `.md` |
| 5 | Burbujas de comentario | hecho | Wiki `.md` + YAML `pr` pintan hilos; Resolve oculta la burbuja |
| 6 | Aprobar y Publicar | hecho | Merge del PR de lote (sin force) + `git pull --ff-only` + YAML `published` |

Estados de frontmatter (única fuente de ciclo de vida del archivo):

| `status` | Significa |
|---|---|
| `draft` | Solo disco local. Nadie más lo ve. |
| `in_review` | Empaquetado en un PR. Campo `pr` = número. |
| `published` | Mergeado en `defaultBranch`. |

---

## Contrato (reemplaza el modelo draft-sidecar)

1. **El documento es un `.md` del proyecto**, bajo `contentPath` (`.slashmd.json` / setting, default `docs`). Ejemplo: `docs/producto/mi-nota.md`. Nunca más `globalStorage/drafts/draft-….slash.md` para páginas nuevas.
2. **GitHub no se toca al crear ni al teclear.** Autosave = `workspace.fs.writeFile` del archivo abierto.
3. **Imágenes viven en `{contentPath}/images/`** en el workspace (misma carpeta compartida para covers e inline). Al subir o pegar, el host escribe el archivo ahí y deja una ruta relativa en el Markdown / YAML `cover`. El sidecar `globalStorage/images` solo cachea lecturas de GitHub y drafts legados.
4. **El lote, no la página, abre el PR.** Varias páginas seleccionadas → una rama `review/docs-YYYY-MM` → un commit → un PR.
5. **El PR id viaja en el YAML** (`pr: 42`), no solo en `globalState` de un sidecar.
6. **Comments y publish operan sobre ese PR de lote.**
7. **Workspace = repo de docs** es el camino feliz. El clone en `globalStorage` queda como fallback de lectura (`Open from GitHub`) hasta que una fase posterior lo retire.

Mapeo Notion ↔ SlashMD: al final de este archivo.

---

## Cómo se valida (todas las fases)

- Repo sandbox privado (p. ej. `docs-sandbox`), nunca el repo bueno.
- Abrir **ese** repo como workspace de Cursor (no el repo de la extensión).
- Segunda cuenta GitHub para aprobar (fases 3–6).
- Tras cada fase: `git status` / `git log` / `gh pr view` deben coincidir con lo que dice la UI.
- `npm run test:roundtrip` no debe romperse (el serializer no es el alcance de estas fases, pero no se ensucia).

---

## Fase 1 — Creación y borrador

**Propósito:** un clic crea una página privada: archivo `.md` real, se abre el lienzo, nadie en GitHub se entera.

### Ya existe

- Home: botón **New page** → `createNewDraft` ([`src/workspace/newDraft.ts`](../src/workspace/newDraft.ts), [`src/home/homePanel.ts`](../src/home/homePanel.ts)).
- Plantillas + `fillTemplate` ya escriben `status: draft` ([`src/domain/templates.ts`](../src/domain/templates.ts), [`templates/blank.md`](../templates/blank.md)).
- Custom Editor abre `.md` con `openWith` (`priority: option`) y autosave 300 ms ([`src/editor/editorProvider.ts`](../src/editor/editorProvider.ts)).
- Home ya puede listar `.md` locales si el folder es el content repo ([`src/home/homeTree.ts`](../src/home/homeTree.ts)).

### Hueco

- `createNewDraft` escribe `globalStorage/drafts/draft-….slash.md` y llama `getSession('github')` para `owner`.
- `resolveWorkflow` trata todo `.md` como `editor` (sin ciclo de vida de wiki). Para esta fase eso está bien: no hay Review en la barra todavía.
- Home no lista el archivo nuevo si el workspace no matchea el remote de `contentRepo`.

### Hacer

1. Reescribir `createNewDraft` (o extraer `createNewPage`) para:
   - Resolver la raíz: folder con `.slashmd.json`, o folder que matchee `contentRepo`, o el primer `workspaceFolder`.
   - `contentPath` desde config / `.slashmd.json` / default `docs`.
   - Seguir pidiendo plantilla + título + sección (reusar `pickSection` / `BUILTIN_TEMPLATE_PICKS`).
   - Crear `contentPath[/seccion]/<slug>.md` con `workspace.fs`. Si el path existe, sufijo `-2`, `-3`, …
   - Frontmatter vía `fillTemplate`: `title`, `status: draft`, `updated`. **No** llamar `getSession` ni ninguna API GitHub. `owner` vacío salvo que ya esté en la plantilla.
   - `vscode.openWith(uri, slash-md.editor)` de inmediato.
   - Refresh Home + árboles.
2. **Prohibido** en este click: `runGit`, `commit`, `push`, `createPullRequest`, `getGithubToken`, `getSession`.
3. Home: un archivo recién creado bajo `contentPath` debe aparecer en el árbol **sin auth GitHub**. Si hoy `docsWorkspaceRoot` exige remote match, ampliar: “hay `.slashmd.json`” o “existe `contentPath/` en el folder” cuenta como biblioteca local.
4. No borrar `DraftStore` todavía (páginas viejas `.slash.md`). Solo el camino **New page / slash-md.new / slash-md.newInFolder**.
5. No cambiar Review/Publish ni comments.

### Validar

1. Workspace = repo de docs. Home → **New page** → plantilla Blank → título `Mi nota`.
2. Existe `<contentPath>/…/mi-nota.md`. El YAML tiene `status: draft`. Se abre el editor Slash MD.
3. Escribir un párrafo, esperar 1 s, leer el archivo en disco: el texto está. Cerrar pestaña, reabrir desde Home: sigue.
4. `git status` (si el folder es git): el `.md` aparece **untracked** o dirty. `git log -1` no cambió. Cero toasts de GitHub / login.
5. Home lista la página por **título**, no por `draft-….slash.md`.
6. Un `README.md` fuera de `contentPath` sigue abriéndose en el editor de texto, no en Slash MD (salvo Open With).

### Falla si

El click crea un `.slash.md` en `globalStorage`, pide login de GitHub, o hace commit.

---

## Fase 2 — Staging (Borradores Locales)

**Propósito:** editar muchas páginas el mismo día y ver, en un solo sitio, cuáles están listas para empaquetar.

### Ya existe

- Autosave por documento.
- Activity Bar: vista **Drafts** (sidecars) + **Pages**.
- Home: árbol + stage ([`webview/home/home.ts`](../webview/home/home.ts)).

### Hueco

- No hay lista de “páginas sucias” del workspace.
- No hay checkboxes ni selección múltiple.
- Drafts Tree sigue anclado a `DraftStore`.

### Hacer

1. Definir **borrador local** = `.md` bajo `contentPath` que cumple **alguna**:
   - `status: draft`, o
   - `status: in_review` y el archivo está dirty vs HEAD, o
   - untracked / modified en git (solo paths de `contentPath`).
2. Nueva sección en **Home** (no un TreeView nativo: las checkboxes viven mal ahí): **Borradores Locales** con:
   - título (`frontmatter.title` → H1 → filename);
   - path corto;
   - badge (`draft` / `modificado` / `in review`);
   - checkbox por fila;
   - contador `N páginas`;
   - “Seleccionar todas”.
3. Persistencia de la selección en `globalState` (`slashMd.stagingSelection`) por path POSIX.
4. Refresh al autosave, al crear página, al volver a Home.
5. El botón **Mandar a Revisión** puede pintarse deshabilitado (`N = 0`); la acción es fase 3.
6. Git: solo `status --porcelain` de lectura. Cero commit/push.

### Validar

1. Crear 3 páginas (fase 1). Editar 2. Home → Borradores Locales muestra esas 2 (o 3 si `status: draft` cuenta todas).
2. Checkbox + “seleccionar todas” actualiza el contador.
3. Cerrar y reabrir Home: la selección se conserva.
4. Un `.md` publicado e idéntico a HEAD **no** aparece.
5. `git log` / remoto sin cambios.

### Falla si

La lista muestra sidecars `.slash.md`, o incluye archivos fuera de `contentPath`, o requiere GitHub para listar.

---

## Fase 3 — Mandar a Revisión

**Propósito:** el lote seleccionado viaja junto: una rama, un commit, un PR, revisores etiquetados.

### Ya existe

- Auth `getSession('github', ['repo'])`.
- `submitReview` + `createPullRequest` + `CODEOWNERS` ([`src/github/review.ts`](../src/github/review.ts), [`src/github/api.ts`](../src/github/api.ts)).
- `stampDocMeta` hoy escribe `status: review` (hay que alinearlo a `in_review`).
- Publish/review por **un** documento y rama `slash-md/<slug>-<stamp>`, clone/worktree en `globalStorage`.

### Hueco

- No hay review de lote.
- El commit se materializa en un worktree, no en el working tree del usuario.
- El PR id vive en `draftMeta` del sidecar, no en el YAML.

### Hacer

1. Comando + botón Home **Mandar a Revisión** (enabled si hay selección fase 2).
2. Confirmar lote (lista de títulos) + revisores opcionales (input `@user`; si vacío, deja que CODEOWNERS asigne).
3. Sobre el **git del workspace** (cwd = raíz del repo de docs):
   - Rama `review/docs-YYYY-MM`. Si ya existe en origin y el PR sigue abierto, reusar. Si el mes cambió o el PR se mergeó/cerró, nueva rama `review/docs-YYYY-MM-<dd>` o reusar la abierta del usuario (una sola PR activa por autor+mes).
   - Checkout / create branch **sin** perder archivos no seleccionados: no `git add -A`. Solo `git add --` los paths del lote (+ imágenes referenciadas si ya existen en disco).
   - Antes del add: en cada archivo del lote, `status: in_review`, `pr` se escribe **después** de conocer el número; primer commit puede ir sin `pr` y un segundo commit mínimo lo añade, **o** crear el PR primero contra un commit y enmendar/seguir con el YAML. Preferido: commit 1 (status + files) → push → crear/encontrar PR → commit 2 solo YAML `pr: N` si hace falta. Evitar amend de commits ya pusheados.
   - Commit mensaje: `docs: review <YYYY-MM> (<n> pages)`.
   - `git push -u origin HEAD`.
   - `createPullRequest` si no hay PR abierto para esa head: título `Docs review <YYYY-MM>`, body con la lista de paths. `requested_reviewers` si el usuario indicó logins.
4. Persistencia: YAML `status: in_review` + `pr: <n>` en **cada** archivo del lote (`FRONTMATTER_KEYS` + `setFrontmatterField`). Opcional `reviewBranch`.
5. Quitar esos paths de la selección de staging.
6. Abrir el PR en el browser solo si se **creó**.
7. Re-enviar el mismo lote (archivos ya `in_review` + dirty): push a la **misma** rama / mismo PR, no un segundo PR.
8. Alinear `stampDocMeta`: `in_review`, no `review`.
9. No mergear. No `git add` de archivos no seleccionados.

### Validar

1. Seleccionar 2 páginas draft → Mandar a Revisión → `gh pr list` = **1** PR; `git branch --show-current` o `gh pr view --json headRefName` = `review/docs-YYYY-MM`.
2. `gh pr view --json files` contiene exactamente esos 2 `.md` (más imágenes si las hay).
3. YAML de ambos: `status: in_review` y `pr: <n>`.
4. Editar una, volver a Mandar (seleccionada) → sigue habiendo **1** PR, commits extra en la misma rama.
5. `gh pr view --json reviewRequests` no vacío si hay CODEOWNERS o se pidieron revisores.
6. Un tercer `.md` dirty no seleccionado **no** está en el PR.

### Falla si

Se abren N PRs, se commitea el working tree entero, o el YAML sigue en `draft` / `review`.

---

## Fase 4 — Feedback recibido

**Propósito:** un punto en Slash MD avisa que hay comentarios; un clic lleva al bloque.

### Ya existe

- GraphQL `reviewThreads` por un PR + path ([`src/github/threads.ts`](../src/github/threads.ts)).
- Ancla por snippet ([`src/domain/commentAnchor.ts`](../src/domain/commentAnchor.ts)).
- Poll en el editor si hay `prNumber` en draftMeta ([`src/editor/threadsHost.ts`](../src/editor/threadsHost.ts)).
- **No** hay inbox global ni badge en el Activity Bar.

### Hueco

- Threads filtrados al path del doc abierto, no a “mis PRs”.
- El PR id no se lee del YAML (`pr:`).
- VS Code no pinta badge en el icono de Slash MD.

### Hacer

1. Inbox: nueva pestaña/sección en Home **Feedback recibido** (lista plana, no el canvas).
2. Fuente: GraphQL — PRs **abiertos** del `contentRepo` donde el usuario es author **o** hay review threads no resueltos en paths de `contentPath`. Reusar `githubGraphql`.
3. Cada fila: repo `#n`, archivo, excerpt del comentario, autor, antigüedad. Solo hilos **no resueltos**.
4. Click: abrir el `.md` del workspace con Slash MD (`openWith`). **Cero checkout / stash / switch.** Si el archivo no está: toast con **Open on GitHub** (si hay `prUrl`). Si la rama local o el `pr:` del YAML no coinciden con el feedback: banner dismissible en el editor + CTA GitHub. PostMessage `revealThread` / scroll al snippet (`findSnippetInText` + `mapTextRangeToDoc`). Si no hay match → rail de huérfanos (fase 5 ya pinta huérfanos).
5. Badge en la vista Slash MD (`TreeView.badge` en Drafts/Pages o `viewsWelcome` + context key). Número = hilos no resueltos. Poll al focus de Home + ~60 s si el view container está visible.
6. Leer `pr` del frontmatter para correlacionar archivo ↔ PR (además de `draftMeta` legado).

### Validar

1. Con la segunda cuenta, comentar una línea del PR de fase 3.
2. Activity Bar de Slash MD muestra badge ≥ 1.
3. Home → Feedback recibido lista ese comentario.
4. Click: se abre la nota correcta y el canvas hace scroll / highlight de ese bloque.
5. Resolver el hilo en github.com → tras el poll, desaparece de la inbox (o se marca resuelto) y el badge baja.

### Falla si

El badge exige tener el editor abierto, o el click abre el archivo en el editor de texto plano, o la inbox pinta hilos de otro repo.

---

## Fase 5 — Burbujas (responder y resolver)

**Propósito:** el margen del webview es el hilo de GitHub: leer, responder, resolver.

### Ya existe (reutilizar, no reescribir)

- Decorations + popover + rail de huérfanos ([`webview/editor/plugins/commentsPlugin.ts`](../webview/editor/plugins/commentsPlugin.ts) + [`webview/editor/threads/commentsMount.ts`](../webview/editor/threads/commentsMount.ts)).
- Reply / Resolve / Unresolve / Comment-on-selection ([`src/editor/threadActions.ts`](../src/editor/threadActions.ts)).
- Fixture: pintar threads no cambia `getMarkdown()` ([`test/comments.ts`](../test/comments.ts)).
- Gate actual: solo `workflow === "workspace"` (hoy = `*.slash.md`) + `prNumber` en draftMeta.

### Hueco

- Las páginas nuevas son `.md` → `resolveWorkflow` = `editor` → **cero comments**.
- El gate no lee `pr:` del YAML.
- “Resolver” debe ocultar la burbuja (hoy se atenúa si `isResolved`).

### Hacer

1. `resolveWorkflow`: `.md` bajo `contentPath` del workspace de docs = `workspace` (ciclo wiki). `.md` ajenos siguen `editor`.
2. Gate de threads: `status: in_review` + `pr` en YAML (fallback draftMeta).
3. Cargar **todos** los threads del PR que pertenezcan a **este** path (ya filtrado).
4. Reply = POST existente. Resolve = `setThreadResolved`; al resolver, **ocultar** la burbuja (no solo atenuar). Unresolve opcional desde el rail.
5. Read-only si `canWriteToRepo` es false.
6. Re-correr fixture de comments + roundtrip.

### Validar

1. Abrir una página `in_review` del lote: las burbujas coinciden con github.com.
2. Responder desde el popover → el reply aparece en el PR.
3. Resolver → `isResolved: true` en la API y la burbuja desaparece del margen.
4. Reescribir el párrafo ancla → el hilo va a huérfanos, no se pega a otro bloque.
5. `getMarkdown()` idéntico con o sin threads pintados.

### Falla si

Pintar comments reescribe el `.md`, o un `.md` de `contentPath` no muestra hilos teniendo `pr:` en el YAML.

---

## Fase 6 — Aprobar y Publicar

**Propósito:** un botón mergea **el PR del lote** y las notas quedan oficiales en `main`.

### Ya existe

- `publishPull` + blockers (aprobación, conflicto, checks) ([`src/github/publish.ts`](../src/github/publish.ts)).
- Barra del editor: Publish por documento, exige `draftMeta.prNumber`.
- Personal mode (`pushDirect`) no es este flujo; no mezclar.

### Hueco

- Publish es 1 archivo / 1 PR, no el lote.
- No hay `git pull` del workspace tras el merge.
- `status: published` se estampa en el sidecar, no necesariamente en los `.md` del lote ya mergeados.

### Hacer

1. Botón **Aprobar y Publicar** en Home (y opcionalmente en la barra de una página `in_review`). Actúa sobre el **PR del lote** (`pr` del YAML o selección).
2. Reusar `publishBlockers`. Sin aprobación / checks rojos / conflicto → no mergea y el mensaje nombra la causa. No inventar un “Publish anyway” en este flujo (el viejo force queda fuera).
3. `mergePull` vía API. Borrar la rama remota (ya lo hace `publishPull`).
4. En **cada** `.md` del PR (lista de files del PR bajo `contentPath`):
   - `status: published`;
   - quitar `pr` / `reviewBranch` o dejarlos como histórico (`pr` vacío). Preferido: quitar `pr` para que no reaparezcan en staging.
5. `git checkout <defaultBranch>` si hace falta + `git pull --ff-only` en el workspace. Si el pull falla (divergencia local): mensaje claro, no reset --hard.
6. Limpiar selección de staging. Badge/inbox de ese PR a cero.
7. Dejar de pintar threads del PR mergeado.

### Validar

1. Publish sin aprobación → PR sigue `OPEN`; UI dice `needs approval`.
2. Segunda cuenta aprueba → Aprobar y Publicar → `gh pr view` = `MERGED`, rama remota borrada.
3. `gh api …/contents/<path>?ref=main` muestra los `.md` del lote.
4. YAML local tras el pull: `status: published`.
5. Conflicto provocado en `main` → mensaje `conflict`, sin merge silencioso.
6. `git -C <workspace> log origin/main` solo tiene el merge/squash del PR, no un push directo de la fase 1–2.

### Falla si

Mergea sin aprobación, o solo actualiza un archivo del lote, o hace `reset --hard` al pull.

---

## Orden y agentes

```
1 New page (.md local)
    → 2 Borradores Locales (checkboxes)
        → 3 Un PR de lote
            → 4 Inbox + badge
            → 5 Burbujas (depende de 3; puede ir en paralelo a 4)
                → 6 Merge + pull
```

4 y 5 pueden solaparse tras 3; 5 exige el gate de workflow de `.md`. 6 exige 3.

**Regla de agente:** una fase por agente. El agente lee solo esta fase + archivos citados, implementa, corre las validaciones que pueda en frío (tests, `git grep`), marca el tablero (`pendiente` → `hecho` o `parcial`) y para. No adelanta la fase siguiente.

---

## Mapeo Notion ↔ SlashMD

| Acción / elemento | En Notion | En SlashMD |
|---|---|---|
| Borrador | Página privada sin compartir | `.md` local (`status: draft`) |
| Empaquetar | Mover páginas a un espacio compartido | Borradores Locales + checkboxes |
| Pedir review | Invitar / mencionar | Un PR con los `.md` seleccionados |
| Inbox | Notificaciones | Feedback recibido (GraphQL) |
| Comentarios | Burbujas inline | Overlay del webview ↔ PR review threads |
| Publicar | Estado “Publicado” | Merge del PR → `status: published` |

---

## Fuera de este ciclo

Collab en vivo, webhooks, cursors, comments sin PR, suggestions de GitHub, LaTeX, AI Crepe, hijack global de `*.md`, GitHub Pages, búsqueda full-text, drag-and-drop de carpetas, `~/.slashmdrc`.
