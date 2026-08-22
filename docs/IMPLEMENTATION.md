# Implementación por fase

Checklist ejecutable. El orden y el porqué están en [PLAN.md](PLAN.md); las decisiones en [DECISIONS.md](DECISIONS.md).

Cada fase: **propósito** (una frase), **hacer** (lo mínimo), **validar** (pasos concretos), **falla si** (señal de parar).

## Antes de empezar: cómo se valida

- **Repo sandbox**: un repo privado `docs-sandbox` con la misma configuración que el real. Nada se prueba contra el repo bueno.
- **Segunda cuenta de GitHub** (o un compañero): con required reviewers **no puedes aprobar tu propio PR**. Sin esto la fase 5 no se puede validar.
- **Regla transversal**: después de cada fase, `git -C <clone> log origin/main` no debe tener commits que no pasaron por un PR.

---

## Fase 0.5 — Repo de documentación (sin código)

**Propósito:** que exista un repo de docs revisable antes de construir la herramienta.

**Hacer**
- Estructura: `docs/` con índice en `README.md`
- Plantillas: `templates/prd.md`, `templates/spec.md`, `templates/decision.md`
- `CODEOWNERS`, plantilla de PR
- Action: markdownlint + link checker
- Branch protection en `main`: required reviewers = 1, sin push directo

**Validar**
1. Crear una rama a mano, cambiar un `.md`, abrir PR → el Action corre y CODEOWNERS pide reviewer.
2. `git push origin main` directo → **rechazado** por protección.
3. Meter un link roto a propósito → el Action falla.

**Falla si:** puedes empujar a `main` sin PR. La protección no está activa y las fases 4–5 se diseñarían sobre una premisa falsa.

---

## Fase 0 — Cimientos

**Propósito:** abrir un draft y no perderlo.

**Hacer**
- Manifest TS + esbuild + `launch.json`
- `Slash MD: New`, `Slash MD: Open Draft`
- Custom Editor con selector estrecho (drafts, no `*.md`)
- Drafts en `globalStorage/drafts/`
- `<textarea>` + debounce 300 ms → disco

**Validar**
1. F5 → `Slash MD: New` → escribir → esperar 1 s → `ls globalStorage/drafts` y leer el archivo: el texto está.
2. Cerrar la ventana sin guardar a mano → `Open Draft` → el texto sigue.
3. Abrir un `README.md` cualquiera del workspace → se abre en el editor de texto normal, **no** en slash-md.

**Falla si:** el draft solo se escribe al cerrar, o el Custom Editor secuestra `.md` ajenos.

---

## Fase 1 — Barra de la página

**Propósito:** la página es el producto y los botones llegan al host.

**Hacer**
- Barra: título, path, estado (`draft saved · 3m`), **Review**, **Publish**
- Clic → `postMessage` → host → modal nativo → respuesta de estado
- Publish deshabilitado mientras no haya PR

**Validar**
1. Clic en Review → aparece modal nativo de VS Code (no un `alert` del webview).
2. Sin `contentRepo` configurado → mensaje claro "repo no configurado", no una excepción.
3. El host responde y la barra cambia de estado sin recargar el editor.

**Falla si:** el estado de la barra se pierde al cambiar de pestaña y volver.

---

## Fase 2 — Milkdown (gate)

**Propósito:** WYSIWYG usable **y** Markdown que no ensucia diffs. Puerta para todo lo demás.

**Hacer**
- CrepeBuilder con las 8 features de DECISIONS (sin Latex/TopBar/AI)
- `markdownUpdated` → autosave; `destroy()` al dispose
- Slash: labels Notion + aliases (`/h1`, `/title1`, …)
- CodeMirror con 4–6 lenguajes lazy
- Tema desde variables `--vscode-*`
- `fixtures/`: headings, listas, tabla GFM, code fence, blockquote, links + imagen

**Validar**
1. `npm run test:roundtrip`: abrir cada fixture y comparar con `getMarkdown()`. Debe ser idéntico salvo normalización declarada (newline final).
2. Escribir `/h1` y `/title1` → los dos insertan H1.
3. Abrir y cerrar el editor 5 veces → un solo editor vivo (sin listeners duplicados, sin fugas en consola).
4. Cambiar el tema de VS Code (claro/oscuro) → el canvas acompaña.

**Falla si:** el round-trip reescribe líneas que no tocaste. **No avanzar a la fase 3**: cada PR posterior tendría ruido.

---

## Fase 3 — Repo de contenido + auth

**Propósito:** saber dónde vive el documento publicado, sin pedirle nada a la PO.

**Hacer**
- Settings `contentRepo`, `contentPath`, `defaultBranch` preconfigurados
- `getSession('github', ['repo'])`
- Clone/worktree en `globalStorage/repos/<org>/<name>`
- `Slash MD: Open from GitHub`
- Indicador `ahead of GitHub`

**Validar**
1. `Open from GitHub` lista los `.md` de `contentPath`; abrir uno → contenido idéntico al de github.com.
2. `git -C <clone> status` → limpio después de abrir (leer no debe dejar basura).
3. Editar el draft → la barra pasa a `ahead of GitHub`.
4. Revocar la sesión de GitHub en VS Code → la siguiente acción pide login otra vez, sin crashear.

**Falla si:** la PO tiene que escribir un setting o pegar un token.

---

## Fase 4 — Review

**Propósito:** el botón Review produce un PR de verdad, y el segundo Review no duplica nada.

**Hacer**
- Rama `slash-md/<slug>-<YYYYMMDD-HHmm>`
- Commit del archivo en `contentPath` + push
- PR contra `main`, título = H1
- Guardar `prNumber`, `headOid`, `path` en el estado del draft
- Barra: `in review #N` + link + estado de aprobación

**Validar**
1. Review → `gh pr list` muestra **1** PR; `git ls-remote --heads` muestra la rama con el nombre esperado.
2. `gh pr view --json reviewRequests` → CODEOWNERS pidió reviewer.
3. Editar el draft → Review otra vez → **sigue habiendo 1 PR**, con 2 commits en la misma rama.
4. Cerrar VS Code, reabrir el draft → la barra sigue diciendo `in review #N`.
5. Ver el PR en github.com: el diff toca solo las líneas que editaste.

**Falla si:** el segundo Review abre un PR nuevo, o el diff incluye reformateos.

**Checkpoint de adopción:** aquí la PO escribe un documento real de punta a punta. Si no lo usa, parar y releer [AUDIT.md](AUDIT.md).

---

## Fase 5 — Publish (mergear el PR)

**Propósito:** llevar el doc a `main` sin saltarse la revisión.

**Hacer**
- Publish exige PR abierto + aprobación + checks verdes
- Merge vía API + borrar rama
- Estados de UI: `sin aprobación`, `checks en rojo`, `conflicto`, `push rechazado`
- Estado final `published` + URL

**Validar**
1. Publish **sin** aprobación → no mergea y dice qué falta; `gh pr view` sigue `OPEN`.
2. Aprobar con la segunda cuenta → Publish mergea; `gh pr view` = `MERGED`, rama borrada.
3. El archivo está en `main` (`gh api .../contents/<path>?ref=main`).
4. Romper un check a propósito → Publish lo reporta y no mergea.
5. Provocar conflicto (editar el archivo en `main` desde la web) → mensaje de conflicto, sin merge silencioso.

**Falla si:** Publish mergea algo sin aprobación, o "falta aprobación" aparece como error genérico.

---

## Fase 6 — Bloques y capa de documentación

**Propósito:** que la PO escriba documentación de verdad, no solo párrafos.

**Hacer (en este orden)**
1. Imágenes: `onUpload` → host → `contentPath/images/` + `asWebviewUri`
2. Tablas
3. Frontmatter editable (`title`, `owner`, `status`, `updated`)
4. Plantillas en `New` (PRD / spec / decisión)
5. Navegación del árbol de `contentPath` + crear dentro de una sección
6. Mover/renombrar con links relativos
7. Callouts `> [!NOTE]`
8. Toggles `<details>`

**Validar**
1. Pegar una imagen → existe en `contentPath/images/`, el Markdown tiene ruta **relativa**, y se ve en el PR de GitHub. Cero `blob:` en el archivo.
2. Frontmatter: editar `status` → `getMarkdown()` cambia solo esa línea del YAML.
3. `New` desde plantilla PRD → el doc nace con las secciones de la plantilla.
4. Renombrar un doc que otros dos enlazan → `rg` no encuentra links roto; el link checker pasa.
5. Callout y toggle: verlos renderizados en github.com, no como texto plano.
6. Re-correr `test:roundtrip` con fixtures nuevos de cada bloque.

**Falla si:** una imagen queda como `blob:` o con ruta absoluta local; renombrar rompe links.

---

## Fase 7 — Endurecer y entregar

**Propósito:** que la PO lo instale y lo use sin ti al lado.

**Hacer**
- CSP + nonce
- Recrear editor solo si cambia la `version` externa
- Errores de auth/push/conflicto en la barra
- README de uso (flujo Review → aprobación → Publish)
- `.vsix` (o Marketplace) + instrucciones de una página

**Validar**
1. Revisar el HTML del webview: nonce presente, sin `unsafe-inline`; consola sin errores.
2. Instalar el `.vsix` en un perfil limpio de VS Code, sin settings de usuario → el ciclo completo funciona.
3. **La PO instala y publica un doc siguiendo solo el README**, sin preguntarte nada.
4. Modo avión → mensaje de red claro, el draft no se corrompe.

**Falla si:** hace falta explicarle algo que no está en el README.

---

## Fase 8a — Comments: ver

**Propósito:** ver los hilos del PR sobre el párrafo correcto.

**Hacer**
- GraphQL `reviewThreads` → highlight + popover de lectura
- Huérfanos en un rail
- Poll al focus + ~45 s

**Validar**
1. Con la segunda cuenta, comentar una línea en github.com → abrir el draft → el globo está en **ese** párrafo.
2. Reescribir ese párrafo → el hilo pasa a huérfanos; no desaparece ni se pega a otro bloque.
3. Resolver el hilo en github.com → tras el poll, se atenúa en el editor.
4. Fixture: con comments pintados, `getMarkdown()` es idéntico a sin ellos.

**Falla si:** pintar comments cambia el Markdown, o un hilo se ancla al párrafo equivocado.

---

## Fase 8b — Comments: escribir

**Propósito:** responder, resolver y comentar sin salir del editor.

**Hacer**
- Reply + resolve/unresolve desde el popover
- "Comment" sobre una selección
- Push a la rama de review si el draft está ahead (avisando)
- Optimistic UI + refresh
- Read-only sin permiso de write

**Validar**
1. Seleccionar una frase → comentar → aparece en el PR en github.com, en la línea correcta.
2. Responder desde el editor → la respuesta se ve en github.com.
3. Resolver desde el editor → `gh api` confirma `isResolved: true`.
4. Con cambios locales sin pushear, comentar → avisa que va a publicar y luego el comment cae en el commit nuevo.
5. Con una cuenta sin write → la UI es de solo lectura, sin botones muertos.

**Falla si:** un comment se crea contra un commit que no existe en el PR, o se pushea sin avisar.

---

## Fase A — Biblioteca (pantalla general)

**Propósito:** ver docs por **título** y **carpeta**, no por `draft-….slash.md`.

**Hacer**
- Docs: label = `displayTitle` (frontmatter → H1 → filename); description = estado del draft
- Drafts: agrupar por carpeta de `remotePath`; label = título; description = carpeta · estado
- Refresh de labels tras autosave / Review / Publish / rename

**Validar**
1. New “Onboarding PO” en `docs/producto` → Drafts muestra ese título bajo la carpeta.
2. Docs lista el mismo título; badge `en edición` tras abrir.
3. Sin sesión GitHub → welcome de login.

**Falla si:** la PO solo ve nombres de archivo internos.

---

## Fase B — Endurecer y entregar

**Propósito:** instalar y usar sin el repo de la extensión abierto.

**Hacer**
- Errores de auth / push / conflicto en la barra (`sin sesión GitHub`, `conflicto`, …)
- Recrear/push al webview solo si cambia el hash externo del draft
- [USAGE.md](USAGE.md) + [workspace-settings.example.json](workspace-settings.example.json)
- `npm run package` → `slash-md-0.0.1.vsix`

**Validar**
1. Instalar el `.vsix` en perfil limpio → ciclo con solo USAGE.md.
2. Sin auth → barra `sin sesión GitHub`; draft intacto.

**Falla si:** hace falta explicar algo que no está en USAGE.md.

---

## Fase C — Checkpoint de adopción (humano)

**Propósito:** confirmar que la superficie sirve antes de comments.

**Hacer** (no es código)
1. Instalar el `.vsix` siguiendo [USAGE.md](USAGE.md).
2. Init → New desde plantilla → editar → Review → aprobación con segunda cuenta → Publish.
3. Anotar fricción (auth, Init, biblioteca, copia vs Explorer).

**Validar:** la PO completa el ciclo **solo** con USAGE.md.

**Falla si:** no lo usa → reconsiderar superficie antes de fase D ([AUDIT.md](AUDIT.md)).

**Salida:** **v1 ship** (Notion-like usable; comments del PR se leen en github.com).

---

## Fase D — Comments (post-v1)

Solo si la fase C pasó. Checklist = 8a (ver) → 8b (escribir) arriba.

**Estado implementado (code):**
- Gate: solo `mode: workspace` + draft con PR abierto (`prNumber`). Personal / Editor: sin comments.
- 8a: GraphQL `reviewThreads` + snippet desde HEAD del PR; decorations ProseMirror; rail de huérfanos; poll al focus + ~45s ([`src/github/threads.ts`](../src/github/threads.ts), [`src/threadsHost.ts`](../src/threadsHost.ts), [`webview/comments.ts`](../webview/comments.ts)).
- 8b: Reply / Resolve / Unresolve / Comment sobre selección (push a la rama de review si el draft está ahead, con aviso); read-only si no hay write en el repo ([`src/threadActions.ts`](../src/threadActions.ts)).
- Fixture: pintar threads no cambia `getMarkdown()` (`test/comments.ts`).

No bloquea el ship de v1.

---

## Home + `.slashmd.json`

**Propósito:** pantalla Inicio con el árbol, y config del repo de docs en un archivo versionado.

**Hacer**
- `.slashmd.json` en la raíz del repo de docs (`contentPath`, `defaultBranch`, `sections`, `repo` opcional)
- Merge: archivo → settings VS Code → defaults ([slashmdConfig.ts](../src/slashmdConfig.ts))
- Comando `Slash MD: Home` → webview panel con árbol, New, Refresh, Init
- Botón Home en el Activity Bar; welcome apunta a Inicio

**Validar**
1. Con `.slashmd.json` en el workspace → Init / Home usan sus valores.
2. Home muestra títulos por carpeta; clic abre el editor.
3. Sin JSON → settings como antes.

**Falla si:** hace falta editar settings a mano cuando el repo ya trae `.slashmd.json`.
