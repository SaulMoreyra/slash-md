# Decisiones

Cerradas en el research. Cambiar una implica actualizar [PLAN.md](PLAN.md) y [RESEARCH.md](RESEARCH.md).

Revisadas en [AUDIT.md](AUDIT.md) (2026-08-21): se mantiene la extensión de escritorio, el repo de docs es privado con plan pagado, y **Publish pasa a ser "mergear el PR"**.

## Propósito

Que una **Product Owner** escriba documentación en GitHub, que los devs la consuman fácil, y tener un repo entero de documentación sin pagar una plataforma extra. Toda decisión se juzga contra eso.

## Producto

| Decisión | Valor |
|---|---|
| Nombre | `slash-md` |
| Superficie | Custom Editor / página WYSIWYG. `*.slash.md` = default; `*.md` = Open With (option). Hijack global de `*.md` solo con setting opt-in |
| Workflow (archivo) | **Drafts** (`*.slash.md`): biblioteca + GitHub. **Editor** (`.md` real): WYSIWYG in-place, sin Review/Publish. Detectado por extensión |
| Publish mode (repo) | En `.slashmd.json`: **`mode: "workspace"`** (default) = Review → PR → Publish merge. **`mode: "personal"`** = un solo Publish = commit + push a `defaultBranch`. Init lo pregunta |
| Default Markdown | `slash-md.useAsDefaultMarkdown` (false) + comandos Use/Stop; escribe `workbench.editorAssociations["*.md"]` |
| Vista Activity Bar | **Slash MD**: Drafts + Pages (atajos nativos). TreeView no se estiliza; el look Notion vive en Home |
| Home | Webview Workbench: sidebar (árbol) + stage (bienvenida / carpeta / página). No auto-abrir al activar |
| UI | Tokens Notion-like dark/light (`webview/tokens.css`) según `body.vscode-dark` / `vscode-light`. Editor = página con título hero + barra mínima Review/Publish |
| Config repo | **`.slashmd.json`** en la raíz del repo de docs (Init lo escribe). No se usa `.vscode/settings.json`. Fallback de lectura: globalState de la extensión + settings legacy |
| Biblioteca | Drafts = copias locales; Docs = remoto GitHub; Home = misma fuente. Refresh al guardar / Review / Publish |
| Puertas al editor | (1) Home, (2) vista Pages, (3) `Open from GitHub`, (4) Explorer **Editar con Slash MD** (docs workspace → draft), (5) **Open with Slash MD** / default MD (in-place) |
| Claim desde Explorer | En content repo: copia el `.md` a un draft. Autosave **no** escribe el Explorer; Review/Publish van al clone. Fuera del content repo: Open with Slash MD edita el archivo real |
| Carpetas | Implícitas + `sections` en `.slashmd.json`. **New folder** (Home) escribe en `sections` y crea el dir local si el workspace es el repo de docs |
| Comandos | `Home`, `New`, `Open Draft`, `Open from GitHub`, `Editar con Slash MD`, `Open with Slash MD`, `Use/Stop as default Markdown editor`, `Move / Rename`, `Delete`, `Init` |
| Delete | Marca `pendingDelete`; Workspace: Review hace `git rm` + Publish mergea; Personal: Publish hace `git rm` + push y borra el draft |
| Botones | Workspace mode: **Review** + **Publish**. Personal mode: solo **Publish**. Editor (archivo `.md`): barra sin esos botones |
| Usuaria objetivo | Product Owner, no dev. Cero configuración por usuario: `contentRepo` / `.slashmd.json` vienen del repo |
| Riesgo aceptado | La PO tiene que instalar el IDE y la extensión. Mitigación en [AUDIT.md](AUDIT.md#mitigación-del-riesgo-de-adopción) |
| Drafts | Autosave local (no se pierde al cerrar). GitHub no se toca al teclear |
| Repo destino | Repo de contenido **dedicado** y configurable, no el workspace de código |
| v1 ship | Editor + Review/Publish + biblioteca + Home + `.slashmd.json` + `.vsix` + [USAGE.md](USAGE.md). **Sin** comments en el canvas |
| v1 bloques | Prioridad: `/h1` `/h2` `/h3` `/p` `/list` `/ol` `/todo` `/table` `/image` `/code` `/quote` `/divider`. Después: `/callout` `/toggle` |
| Documento | Frontmatter: **title** + optional **cover** / **coverPosition** editable in the page chrome (hero + Notion-style cover). `owner` / `status` / `updated` los escribe el host (New / Review / Publish). Cover is YAML chrome, not a body image |
| Fuera de v1 / post-v1 | Comments en canvas (fase D), `~/.slashmdrc`, collab en vivo, LaTeX, AI Crepe, webhooks, suggestions de GitHub, New/rename/delete folder, drag-drop, búsqueda entre docs |

## Stack

| Decisión | Valor | Por qué |
|---|---|---|
| UI del webview | TypeScript vanilla, **sin React** | Menos capas; Crepe ya trae slash y bloques |
| Editor | **CrepeBuilder**, no `new Crepe()` | Tree-shaking; apagamos Latex / TopBar / AI |
| Features Crepe | `blockEdit`, `listItem`, `codeMirror` (pocos langs), `table`, `imageBlock`, `toolbar`, `linkTooltip`, `placeholder` | Alcance Notion-like sin KaTeX ni language-data entero |
| Host | TypeScript + esbuild | Estándar de extensiones |
| Auth GitHub | `vscode.authentication.getSession('github', ['repo'])` | Sin PAT en settings |
| Escritura git | Clone / worktree en `globalStorage`, no Contents API | Imágenes y commits reales |
| Callouts | Alertas GFM `> [!NOTE]`, no `:::directive` | GitHub ya las renderiza |
| Toggles | `<details><summary>` | HTML válido en Markdown |
| Custom Editor | Solo drafts (p. ej. `*.slash.md` o carpeta de drafts), `priority: "option"` | No pelear con READMEs de código |

## GitHub

| Acción | Comportamiento |
|---|---|
| Repo de docs (Workspace) | **Privado, plan pagado** (Pro/Team) para branch protection, required reviewers y CODEOWNERS |
| Repo de docs (Personal) | Solo / sin required PR: `mode: "personal"` permite push directo a `defaultBranch` |
| `main` (Workspace) | Protegida. Nadie escribe directo; todo entra por PR |
| Autosave | Solo disco local (`globalStorage/drafts`) |
| Review | Solo en `mode: "workspace"`. Branch `slash-md/<slug>-<YYYYMMDD-HHmm>` + push + PR contra `main`. Re-Review actualiza la misma rama |
| **Publish (Workspace)** | **Mergear el PR** (requiere aprobación) |
| **Publish (Personal)** | Commit + push a `defaultBranch` (sin PR). Si branch protection rechaza → error de UI + hint a usar Workspace |
| Routing de review | `CODEOWNERS` (Workspace) asigna al dev correcto automáticamente |
| Settings | Solo lectura legacy. La fuente de verdad es `.slashmd.json` (+ `contentRepo` en globalState tras Init) |

El antiguo `slash-md.allowDirectPublish` se reemplaza por **`mode` en `.slashmd.json`**: direct push solo en Personal; Workspace mantiene el contrato de PR + merge. "Push rejected by branch protection" es un estado de UI, no un error genérico.

## Comments (fase D, post-v1)

| Decisión | Valor |
|---|---|
| Alcance | Notion completo: ver, responder, resolver, **crear** desde una selección |
| Cuándo | **Después** del checkpoint de adopción (fase C). No bloquea v1 ship |
| Fuente de verdad | Review threads de GitHub (GraphQL), no sidecar ni HTML comments en el `.md` |
| Ancla | `path` + `commitOid` + `line` + **snippet** del texto. Sin `<!-- block:id -->` |
| Si el texto se movió | Fuzzy match del snippet; si falla → hilo huérfano en un rail, no highlight inventado |
| Crear comment | Requiere que la selección exista en un commit del PR → push a la rama de review si hay cambios locales |
| Tiempo real | No. Poll al focus + ~45s mientras `in review` |
| UI | Decorations de ProseMirror en el webview, no Comments API nativa de VS Code |

## Repo de documentación

Lo que se configura en GitHub, sin código (fase 0.5):

| Pieza | Para qué |
|---|---|
| Estructura de carpetas + índice | Que sea un repo de docs, no documentos sueltos |
| Plantillas (PRD, spec, decisión) | Consistencia; una PO con plantilla escribe mejor que con lienzo blanco |
| `CODEOWNERS` | El review llega al dev correcto |
| Plantilla de PR | Contexto del cambio de docs |
| Actions: markdownlint + link checker | Que los links relativos no se rompan |
| Branch protection en `main` | Forzar revisión (por eso el plan pagado) |

Los devs consumen los `.md` en el repo o en su IDE. GitHub Pages queda fuera de v1 (en repo privado exige plan pagado y el sitio sería público salvo Enterprise).

## Orden innegociable

1. Gate de **round-trip Markdown** (fase 2) antes de GitHub.
2. **Review** (fase 4) guarda `prNumber` + `headOid` + `path` desde el día uno (lo necesita comments).
3. Comments **después** de Review y Publish estables (8a ver → 8b write).
4. Publish (fase 5) no espera a comments.
5. Checkpoint de adopción al terminar la fase 4: la PO escribe un doc real antes de invertir en 6–8.
