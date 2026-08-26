# Architecture — Slash MD

Mapa para auditar flujos host ↔ webview. Monorepo `apps/` + `packages/` (motor compartido VS Code + Electron).

## Layout

```
apps/
  vscode/     # extensión Marketplace: custom editor Markdown
  desktop/    # Electron: wiki (Home, review, publish) + editor
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
| **GitHub (host)** | Review/Publish/clone orquestados | `apps/desktop/electron/` |
| **Host UI (extensión)** | Custom editor Markdown | `apps/vscode/src/editor/` |
| **Host UI (desktop)** | Home, árbol, editor React | `apps/desktop/` |
| **UI** | DOM + Milkdown (Crepe) | `packages/ui/src/{editor,home,shared}/` |

## Bundles (VS Code)

| Entry | Output | Responsabilidad |
|-------|--------|-----------------|
| `packages/ui/src/editor/main.ts` | `apps/vscode/dist/webview.js` | Editor Crepe + chrome |
| `apps/vscode/src/extension.ts` | `apps/vscode/dist/extension.js` | Custom editor + Open with Slash MD |

Build: `npm run build` (workspace `slash-md` → `apps/vscode/esbuild.mjs`).

Desktop: `npm run desktop:dev` → `apps/desktop/dist/webview.js` + `Electron`.

## HostBridge

El webview no llama `acquireVsCodeApi()` al importar. Cada app inyecta un bridge:

- VS Code: `createVsCodeBridge()`
- Electron: preload expone `acquireVsCodeApi()` con el mismo shape (`postMessage`) para el canvas Crepe; Home es React nativo.

## Mensajes — Home (Desktop)

Home vive en Electron (`apps/desktop/electron/home.ts`, pantallas React). Tipos: [`packages/core/src/homeProtocol.ts`](../packages/core/src/homeProtocol.ts).

La UI de biblioteca en `packages/ui/src/home/` queda como motor compartido / tests; el producto wiki es Desktop.

## Mensajes — Editor (VS Code)

**Listener webview (único):** [`packages/ui/src/editor/editorController.ts`](../packages/ui/src/editor/editorController.ts) → [`messaging/router.ts`](../packages/ui/src/editor/messaging/router.ts)  
**Router host:** [`apps/vscode/src/editor/editorMessageRouter.ts`](../apps/vscode/src/editor/editorMessageRouter.ts)  
**Tipos:** [`packages/core/src/protocol.ts`](../packages/core/src/protocol.ts)

La extensión siempre arranca en **workflow `editor`**: autosave, frontmatter (title/icon/cover), imágenes locales. Review, publish y threads de GitHub se ignoran en el host (eso es Desktop).

| Webview → Host (`WebviewToHost`) | Handler | Efecto |
|----------------------------------|---------|--------|
| `edit` | `applyEdit` + `persistSoon` | Autosave cuerpo (debounced) |
| `frontmatter` | `applyFrontmatter` + `persistSoon` | Patch YAML (title, icon, cover) |
| `uploadImage` / `resolveImage` | images | Imágenes al lado del `.md` (`images/`) |
| `openUrl` | `openUrl` | Abrir `https` en el browser |
| `review` / `publish` / threads | no-op | Solo Desktop |

| Host → Webview (`HostToWebview`) | Router webview → |
|----------------------------------|------------------|
| `init` / `status` / `saved` | `bar.onHostMessage` |
| `frontmatter` | frontmatter + icon + cover `.apply()` |
| `editors` | `edited.apply()` |
| `setText` | crepe + bar (sync externo) |
| `imageMap` / `imageUploaded` / `imageResolved` | `core/images` + cover |

## Flujos críticos

Narrativa de producto + diagramas Mermaid: [FLOWS.md](FLOWS.md).

## Glosario

| Término | Significado |
|---------|-------------|
| **Wiki** | `.md` bajo `contentPath` en el repo de docs (Desktop) |
| **Sidecar** | `.slash.md` legacy (draft local + meta) |
| **Staging** | Selección de páginas locales para un lote de review (Desktop) |
| **Lote** | Conjunto de páginas en un mismo PR |
| **contentPath** | Prefijo de docs en el repo (ej. `docs` o `.`) |

## Convenciones de código auditable

1. **Un listener por bus** — solo `homeController.ts` / `editorController.ts`; mounts solo DOM + `postMessage` saliente.
2. **`switch` exhaustivo** — `assertNever` en routers para nuevos tipos.
3. **Puro en `packages/core`** — sin `vscode` ni `document`.
4. **`packages/github`** — sin `vscode` (API + models). Orquestación UI queda en `apps/desktop`.
5. **Tests** — `test/` en la raíz; imports `@slash-md/core`, `@slash-md/ui`, `apps/vscode/...`.
