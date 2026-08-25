# Architecture — Slash MD

Mapa para auditar flujos host ↔ webview. Monorepo `apps/` + `packages/` (motor compartido VS Code + Electron).

## Layout

```
apps/
  vscode/     # extensión Marketplace (host + VSIX)
  desktop/    # Electron skeleton (mismo editor UI)
packages/
  core/       # dominio puro + puertos + tipos Home/protocol
  ui/         # editor + home + tokens (bundles IIFE)
  github/     # API + modelos puros (inbox/batch publish)
```

## Capas

| Capa | Rol | Ubicación |
|------|-----|-----------|
| **Core** | Lógica pura (frontmatter, paths, protocolos, puertos) | `packages/core/` |
| **GitHub (puro)** | REST/GraphQL helpers + inbox/batch models | `packages/github/` |
| **GitHub (host)** | Review/Publish/clone orquestados con VS Code | `apps/vscode/src/github/` |
| **Host UI** | Panels, trees, custom editor | `apps/vscode/src/{home,editor,library}/` |
| **UI** | DOM + Milkdown (Crepe) | `packages/ui/src/{editor,home,shared}/` |
| **Desktop** | Electron main/preload; HostBridge vía preload | `apps/desktop/` |

## Bundles (VS Code)

| Entry | Output | Responsabilidad |
|-------|--------|-----------------|
| `packages/ui/src/home/home.ts` | `apps/vscode/dist/home.js` | Biblioteca, staging, inbox |
| `packages/ui/src/editor/main.ts` | `apps/vscode/dist/webview.js` | Editor Crepe + chrome |
| `apps/vscode/src/extension.ts` | `apps/vscode/dist/extension.js` | Composición |

Build: `npm run build` (workspace `slash-md` → `apps/vscode/esbuild.mjs`).

Desktop: `npm run desktop:dev` → `apps/desktop/dist/webview.js` + `Electron`.

## HostBridge

El webview no llama `acquireVsCodeApi()` al importar. Cada app inyecta un bridge:

- VS Code: `createVsCodeBridge()` / `createVsCodeHomeBridge()`
- Electron: preload expone `acquireVsCodeApi()` con el mismo shape (`postMessage`)

## Mensajes — Home

**Router host:** [`apps/vscode/src/home/homeMessageRouter.ts`](../apps/vscode/src/home/homeMessageRouter.ts)  
**Router webview:** [`packages/ui/src/home/homeController.ts`](../packages/ui/src/home/homeController.ts)  
**Tipos:** [`packages/core/src/homeProtocol.ts`](../packages/core/src/homeProtocol.ts) (simétrico a `protocol.ts`; HTML en [`homeHtml.ts`](../apps/vscode/src/home/homeHtml.ts))

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

**Listener webview (único):** [`packages/ui/src/editor/editorController.ts`](../packages/ui/src/editor/editorController.ts) → [`messaging/router.ts`](../packages/ui/src/editor/messaging/router.ts)  
**Router host:** [`apps/vscode/src/editor/editorMessageRouter.ts`](../apps/vscode/src/editor/editorMessageRouter.ts)  
**Tipos:** [`packages/core/src/protocol.ts`](../packages/core/src/protocol.ts)

| Webview → Host (`WebviewToHost`) | Handler deps | Efecto |
|----------------------------------|--------------|--------|
| `edit` | `applyEdit` + `persistSoon` | Autosave cuerpo (debounced) |
| `frontmatter` | `applyFrontmatter` + `persistSoon` | Patch YAML (title, icon, cover) |
| `review` / `publish` | `reviewOrPublish` | Wiki+workspace → Home; sidecar → PR flow |
| `uploadImage` / `resolveImage` | images | Imágenes locales/wiki |
| `threadCreate` / `threadReply` / `threadResolve` / `threadsRefresh` | threads | Review threads |
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

## Glosario

| Término | Significado |
|---------|-------------|
| **Wiki** | `.md` bajo `contentPath` en el repo de docs |
| **Sidecar** | `.slash.md` legacy (draft local + meta) |
| **Staging** | Selección de páginas locales para un lote de review |
| **Lote** | Conjunto de páginas en un mismo PR |
| **contentPath** | Prefijo de docs en el repo (ej. `docs` o `.`) |

## Convenciones de código auditable

1. **Un listener por bus** — solo `homeController.ts` / `editorController.ts`; mounts solo DOM + `postMessage` saliente.
2. **`switch` exhaustivo** — `assertNever` en routers para nuevos tipos.
3. **Puro en `packages/core`** — sin `vscode` ni `document`.
4. **`packages/github`** — sin `vscode` (API + models). Orquestación UI queda en `apps/vscode`.
5. **Tests** — `test/` en la raíz; imports `@slash-md/core`, `@slash-md/ui`, `apps/vscode/...`.

## Pendiente (post monorepo)

- Puertos `FsPort` / `Auth` / `HostUi` en batch review/publish y mover orquestación a `packages/github`
- Auth OAuth en `apps/desktop`
- Empaquetado Electron (electron-builder) — fuera del skeleton
