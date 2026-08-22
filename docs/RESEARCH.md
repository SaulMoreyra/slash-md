# Research

Contexto de producto, arquitectura y landscape. Las decisiones cerradas están en [DECISIONS.md](DECISIONS.md).

## Problema

Editar docs como en Notion (bloques, slash `/h1` `/code`) pero con el archivo en Markdown y el ciclo de vida en GitHub: Review = PR, Publish = `main`, comments del PR flotando en el canvas.

El `.md` local es un **borrador**. GitHub es el control de versiones. Los hilos de review son los comments del documento.

## Arquitectura

```
┌─────────────────────────────────────────────┐
│  Página (webview)                           │
│  [estado] [Review] [Publish]                │
│  Milkdown CrepeBuilder + slash              │
│  Decorations de review threads              │
└──────────────┬──────────────────────────────┘
               │ postMessage
┌──────────────▼──────────────────────────────┐
│  Extension host                             │
│  drafts (globalStorage)                     │
│  clone del repo de contenido                │
│  GitHub auth + GraphQL/REST                 │
└──────────────┬──────────────────────────────┘
               │ solo en botones / comments
               ▼
         repo org/docs  (main / PR)
```

### Por qué Custom Editor (acotado)

| Enfoque | Veredicto |
|---|---|
| Markdown preview nativo | Solo lectura |
| Webview panel suelto | Undo/save/dirty no cuelgan del documento |
| Custom Text Editor sobre **todos** los `.md` | Pelea con el workspace de código |
| Custom Editor **solo drafts** + comando Open | Encaja con CMS en el IDE |

El webview *es* el editor del draft. Autosave escribe el archivo de draft; no es un commit.

### Sync (lo que no hacemos)

No hay sync continuo a git. Protocolo:

```
host → webview   init | externalUpdate | status
webview → host   autosave | review | publish | uploadImage
                 (fase 8) createComment | reply | resolve
```

`autosave` nunca hace git. Review/Publish/comments sí.

### Host ↔ GitHub

- Auth: sesión GitHub de VS Code/Cursor, scope `repo`.
- Clone/worktree en `globalStorage/repos/<org>/<name>`.
- Review: branch, commit, push, `gh`/Octokit `pulls.create`. Si el draft ya tiene PR, push a la misma rama.
- Publish: mergear el PR de review vía API (`main` está protegida, no hay push directo). Requiere aprobación y checks verdes.
- Imágenes: `onUpload` → host guarda en `contentPath/images/` → ruta relativa en el Markdown. En el webview, `asWebviewUri`. Cero blob URLs persistidos.

## Milkdown: cómo no usarlo mal

`new Crepe()` activa Latex, TopBar, AI y el catálogo entero de CodeMirror. Eso es peso y ruido.

**Usar `CrepeBuilder`** e importar solo:

- `blockEdit` — slash `/` y drag de bloques
- `listItem`, `codeMirror`, `table`, `imageBlock`, `toolbar`, `linkTooltip`, `placeholder`

Apagar: Latex/KaTeX, TopBar (la barra Publish/Review es nuestra), AI.

### Slash

No montar `@milkdown/plugin-slash` a mano. Configurar `blockEdit`:

- `math: null`, `h4–h6: null` si el producto es h1–h3
- Labels tipo Notion
- Aliases (`/title1` → h1) vía `buildMenu` o labels que el filtro pueda matchear (`Heading 1 /h1 /title1`)

### Round-trip

Milkdown reformatea. Con GitHub como destino, un serializer ruidoso = diffs basura.

- Una fuente: `markdownUpdated`, debounce ~300 ms
- Un editor por documento; `destroy()` al dispose
- Fixtures `fixtures/*.md`: open → `getMarkdown()` → snapshot **antes** de cablear git
- Callouts como `> [!NOTE]` (blockquote con atributo), no directives
- Toggles como `<details>`

### CodeMirror

Lista corta y lazy (js, ts, json, md, python). Tema según `vscode-theme-kind`. No `@codemirror/language-data` completo.

### Callouts y toggles

La parte cara de “Notion-like” en vanilla. Estrategia: **mapear a Markdown que GitHub ya entiende**, no inventar `:::callout`.

Nodos custom (`$nodeSchema` + `$view` DOM) solo cuando el parser/serializer GFM/HTML no alcanza. Las decorations de comments no deben cambiar el Markdown (fixture: pintar hilos no ensucia `getMarkdown()`).

## Comments tipo Notion sobre review threads

GitHub ancla a **línea + commit**. Notion ancla a **block id**. No vamos a meter `<!-- block:id -->` en el `.md` (ensucia el PR y rompe “es Markdown normal”).

### Modelo de ancla

| Campo | Origen |
|---|---|
| `threadId` | GraphQL `PullRequestReviewThread.id` |
| `path` | archivo en el repo de contenido |
| `commitOid` | HEAD del PR |
| `line` / `startLine` | línea en ese commit |
| `snippet` | texto de esas líneas (ancla real) |
| `isResolved`, `comments[]` | GitHub |

Pintado:

1. Draft === HEAD del PR → línea exacta.
2. Draft divergió → fuzzy match del snippet (contexto del hunk).
3. Sin match → **huérfano** en rail derecho, no highlight inventado.

### Crear un comment desde el editor

La selección tiene que existir en un commit del PR:

1. Autosave
2. Si hay cambios sin pushear → push a la rama de review (decirlo en el popover)
3. Mapear selección a `path` + `line` + `side: RIGHT`
4. REST create review comment
5. Pintar optimistic + refresh de threads

Sin push no hay línea en GitHub. Comments generales del PR (no de línea) van a una bandeja, no a globos.

### API

- Listar: GraphQL `reviewThreads`
- Reply: REST `POST .../pulls/{n}/comments` + `in_reply_to`
- Resolve: GraphQL `resolveReviewThread` / `unresolveReviewThread`
- Crear: REST create review comment (`commit_id`, `path`, `line`)
- Poll: al focus + ~45s en `in review`. No webhooks (haría falta URL pública)

### UI

Highlight del rango, avatar/icono a la derecha del bloque, popover (hilo, reply, resolve, link a GitHub). Selección + “Comment” en la toolbar flotante. Resueltos atenuados; filtro “solo abiertos” por defecto.

Plugin ProseMirror vanilla en el webview. La Comments API de VS Code no pinta dentro de Crepe.

### Riesgos

- Párrafo reescrito → huérfano, no crash
- Selección intra-bloque: anclar al rango de texto, no a todo el `/h1`
- Push implícito al comentar: hay que avisarlo
- Read-only si no hay write en el repo
- Suggestions (`\`\`\`suggestion`) fuera de v1

## Landscape: qué existe y qué no

**No hay un producto que una:** editor Notion + slash + repo de contenido dedicado + Publish/Review + review threads flotando en el canvas.

### Comments / review sobre Markdown

| Pieza | Qué hace | Hueco |
|---|---|---|
| [GitHub Pull Requests](https://marketplace.visualstudio.com/items?itemName=GitHub.vscode-pull-request-github) | Hilos en el **diff** | No WYSIWYG |
| [Markdown PR Review](https://marketplace.visualstudio.com/items?itemName=frankledo.markdown-pr-review) | Preview + hilos GitHub con source maps `data-line` | Preview, no se edita con `/` |
| [Gitnotate](https://github.com/pedrofuentes/gitnotate) | Comments sub-línea, re-ancla, API de GitHub | Editor de texto, no canvas |
| [Penmark](https://github.com/carlosboeing/penmark) | Comments tipo Docs en preview | Hilos **dentro del `.md`**, no GitHub |
| [Markdown Collab](https://github.com/ronicayu/markdown-collab-plugin) | WYSIWYG + Review PR vía `gh` | Muy inmaduro; flujo agente, no CMS |
| [Markdown Threads](https://github.com/busadave13/markdown-threads) | Hilos + Publish a PR | Sidecar `.comments.json` |

De estos, lo útil para **copiar ideas** (no código a ciegas):

- Markdown PR Review → source maps línea → nodo
- Gitnotate → ancla por snippet cuando el doc se mueve

### Editor WYSIWYG en VS Code

| Pieza | Motor | GitHub |
|---|---|---|
| [Milkdown/vscode](https://github.com/Milkdown/vscode) | Milkdown | No |
| [inlineMark](https://marketplace.visualstudio.com/items?itemName=2001Y.inlinemark) | Tiptap | No |
| MalkDown / md-wysiwyg-editor | Crepe | No |

Componer “Milkdown + extensión de PRs” no da globos en el mismo sitio donde escribes `/h1`.

### Publish / Review editorial

[TinaCMS](https://tina.io/editorial-workflow) (y en menor medida Keystatic/Decap): save → rama → PR → merge. Los comments se quedan en github.com. Es CMS de sitio, no extensión de Cursor.

### Conclusión de landscape

El trabajo original es el **puente**:

1. CrepeBuilder en un Custom Editor de drafts
2. Git solo en Review/Publish hacia un repo dedicado
3. `reviewThread` → snippet → decoration ProseMirror, y el inverso al crear desde una selección

No reinventar Milkdown ni GitHub Reviews.

## Settings previstos

```json
{
  "slash-md.contentRepo": "org/docs",
  "slash-md.contentPath": "docs",
  "slash-md.defaultBranch": "main"
}
```

Preconfigurados en el workspace, no un wizard por usuario: la PO no debería tocar settings.

Drafts: `globalStorage/drafts/`. Clone: `globalStorage/repos/`.

## Estructura de código (cuando se implemente)

```
slash-md/
  docs/                  # este research
  package.json
  esbuild.mjs
  src/
    extension.ts
    editorProvider.ts
    draftStore.ts
    github/
      auth.ts
      contentRepo.ts
      publish.ts
      review.ts
      comments.ts        # fase 8
    messaging.ts
  webview/
    main.ts
    crepe.ts
    slash.ts
    bar.ts
    theme.ts
    images.ts
    comments.ts          # decorations
    callout.ts
    toggle.ts
  fixtures/
```

## Referencias

- [Crepe API](https://github.com/Milkdown/milkdown/blob/main/docs/api/crepe.md) — `CrepeBuilder`, `buildMenu`, features
- [VS Code Custom Text Editor](https://code.visualstudio.com/api/extension-guides/custom-editors)
- GitHub GraphQL `PullRequestReviewThread`
- GitHub REST pull review comments (`in_reply_to`, `commit_id`, `path`, `line`)
