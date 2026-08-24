# Architecture — Slash MD

Mapa para auditar flujos host ↔ webview. Actualizado tras segmentar `webview/home`, `webview/editor` y el router de mensajes del host Home.

## Capas

| Capa | Rol | Ubicación |
|------|-----|-----------|
| **Domain** | Lógica pura (frontmatter, paths, inbox, publish model) | `src/domain/` |
| **GitHub** | API, review, publish, inbox | `src/github/` |
| **Host UI** | VS Code panels, trees, custom editor | `src/home/`, `src/editor/`, `src/library/` |
| **Webview** | DOM + Milkdown (bundles IIFE) | `webview/home/`, `webview/editor/` |
| **Shared webview** | Tokens, avatars | `webview/shared/` |

## Bundles

| Entry | Output | Responsabilidad |
|-------|--------|-----------------|
| `webview/home/home.ts` | `dist/home.js` | Biblioteca, staging, inbox |
| `webview/editor/main.ts` | `dist/webview.js` | Editor Crepe + chrome |
| `src/extension.ts` | `dist/extension.js` | Composición |

## Mensajes — Home

**Router host:** [`src/home/homeMessageRouter.ts`](../src/home/homeMessageRouter.ts)  
**Router webview:** [`webview/home/homeController.ts`](../webview/home/homeController.ts)  
**Tipos:** [`src/domain/homeProtocol.ts`](../src/domain/homeProtocol.ts) (simétrico a `protocol.ts`; HTML en [`homeHtml.ts`](../src/home/homeHtml.ts))

| Webview → Host (`HomeFromWebview`) | Handler | Efecto principal |
|-----------------------------------|---------|------------------|
| `ready` | `pushTree` | Carga árbol inicial |
| `refresh` | `invalidateInboxAndPushTree` | Refresca inbox + árbol |
| `open` / `rename` / `delete` | docs | Abre / renombra / borra página |
| `new` / `newFolder` | workspace | Crea página o carpeta |
| `init` / `signIn` | config/auth | Init repo / sesión GitHub |
| `toggleDraft` / `setDraftSelection` / `selectAllDrafts` | staging | Selección de lote |
| `previewReview` | staging | Modal confirmación |
| `reviewBatch` | `sendBatchToReview` | Crea/actualiza PR del lote |
| `publishBatch` | `publishBatch` (github) | Merge del PR |
| `openInbox` | inbox | Abre editor + reveal thread |
| `getConfig` / `saveConfig` | config | `.slashmd.json` |
| `renameFolder` / `openIndex` / `createIndex` | workspace | Carpetas e índice |

| Host → Webview (`HomeToWebview`) | Efecto |
|----------------------------------|--------|
| `tree` | Payload completo (roots, drafts, inbox, loteReview) |
| `status` | Barra lateral |
| `configResult` | Panel configuración |
| `reviewPreview` | Modal “Confirmar revisión” |

## Mensajes — Editor

**Listener webview (único):** [`webview/editor/editorController.ts`](../webview/editor/editorController.ts) → [`messaging/router.ts`](../webview/editor/messaging/router.ts)  
**Router host:** [`src/editor/editorMessageRouter.ts`](../src/editor/editorMessageRouter.ts)  
**Deps de sesión:** [`src/editor/editorSessionDeps.ts`](../src/editor/editorSessionDeps.ts)  
**Shell provider:** [`src/editor/editorProvider.ts`](../src/editor/editorProvider.ts)  
**Tipos:** [`src/domain/protocol.ts`](../src/domain/protocol.ts)

| Webview → Host (`WebviewToHost`) | Handler deps | Efecto |
|----------------------------------|--------------|--------|
| `edit` | `applyEdit` + `persistSoon` | Autosave cuerpo (debounced) |
| `frontmatter` | `applyFrontmatter` + `persistSoon` | Patch YAML (title, icon, cover) — keys no editables se ignoran |
| `review` / `publish` | `reviewOrPublish` | Wiki+workspace → Home; sidecar → PR flow; workflow `editor` → no-op |
| `uploadImage` / `resolveImage` | `uploadImage` / `resolveImage` | Imágenes locales/wiki |
| `threadCreate` | flush + persist + `threadCreate` | Nuevo hilo en PR |
| `threadReply` / `threadResolve` / `threadsRefresh` | threads | Review threads |
| `openUrl` | `openUrl` | Abrir PR en browser |

| Host → Webview (`HostToWebview`) | Router webview → |
|----------------------------------|------------------|
| `init` / `status` / `saved` | `bar.onHostMessage` |
| `frontmatter` | frontmatter + icon + cover `.apply()` |
| `editors` | `edited.apply()` |
| `setText` | crepe + bar (sync externo) |
| `threads` | comments plugin + thread chrome |
| `revealThread` | scroll + highlight |
| `reviewContext` | banner mismatch PR |
| `imageMap` / `imageUploaded` / `imageResolved` | `core/images` + cover |

## Flujos críticos

Narrativa de producto + diagramas Mermaid: [FLOWS.md](FLOWS.md).

### F1 — Autosave wiki

1. Usuario escribe en Crepe → `onMarkdown` → `core/save.scheduleSave`
2. Webview `edit` → host persiste documento + `saved` / `status`
3. Host `onDidChangeTextDocument` → `setText` + `frontmatter` si cambio externo

### F2 — Staging → Review (Home)

1. Usuario marca borradores locales en Home
2. `previewReview` → modal → `reviewBatch`
3. Host `sendBatchToReview` → branch + PR + YAML `in_review` / `pr` / `reviewBranch`

### F3 — Aprobar y Publicar

1. Home `publishBatch` o PR abierto con approvals
2. Host `publishBatch` (github) → merge PR → `stampPublishedLocal`

### F4 — Wiki: Review/Publish desde editor

1. Editor bar → `review` / `publish` con `pageKind === wiki`
2. Host intercepta → `wikiHomeActions` → abre Home + staging

### F5 — Inbox → thread en editor

1. Home `openInbox` → abre `.md` + opcional `reviewContext` + `revealThread`
2. Webview router → highlight snippet o rail de huérfanos

## Glosario

| Término | Significado |
|---------|-------------|
| **Wiki** | `.md` bajo `contentPath` en el repo de docs |
| **Sidecar** | `.slash.md` legacy (draft local + meta) |
| **Staging** | Selección de páginas locales para un lote de review |
| **Lote** | Conjunto de páginas en un mismo PR |
| **contentPath** | Prefijo de docs en el repo (ej. `docs` o `.`) |

## Convenciones de código auditable

1. **Un listener por bus** — solo `homeController.ts` / `editorController.ts`; mounts solo DOM + `postMessage` saliente (`test/webview/messageListeners.ts`).
2. **`switch` exhaustivo** — `assertNever` en routers para nuevos tipos.
3. **Puro en `domain/`** — sin `vscode` ni `document`.
4. **Tests por dominio** — `test/editor.ts`, `test/homeController.ts`; evitar god-file único a largo plazo.

## Pendiente (plan)

- [x] `src/editor/editorMessageRouter.ts` — extraer handler de `editorProvider.ts`
- [x] `src/domain/homeProtocol.ts` — unificar tipos Home con `protocol.ts`
- [x] Split `test/roundtrip.ts` en `test/domain/`, `test/github/`, `test/webview/`, `test/integration/`
- [x] Regla: mounts editor solo DOM + `postMessage` saliente
- [x] Partir `cover.ts` / `icon.ts` / `threadChrome.ts` → `coverModel`, `coverMenu`, `iconPicker`, `threadPopover`, `threadRail`
