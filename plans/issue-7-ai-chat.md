# Plan — Local AI chat harness vía agentes CLI (Issue #7)

> Estado: **en ejecución**. Cada fase se marca `[x]` al completarse y verificarse.

## Decisión de protocolo (auditoría)

- **Adapters headless CLI, no "MCP client sobre stdio".** opencode/Claude Code/Codex/Cursor son clientes MCP, no servidores. La interfaz universal para conducirlos desde una app es modo headless + NDJSON (`opencode run --format json`, `claude -p --output-format stream-json --verbose`, `codex exec --json`).
- **MCP real solo en la dirección inversa** (Slash como servidor de herramientas para agentes externos) → separado a fase 2 del producto.
- **Realtime en la hoja**: stream directo al buffer vía `setCrepeMarkdown` imperativo + eco al pipeline de guardado normal. Editor `readOnly` durante el stream + banner "Escribiendo… [Detener]" + "Revertir al guardado".

## Arquitectura

- `packages/agents/` (shared, puro; sin Electron): adapters por agente, normalizador de stream NDJSON→`ChatHostEvent`, context bundle serializado a Markdown, tipos (`switch` + `assertNever`).
- `apps/desktop/electron/agents.ts` (host; único dueño del spawn): spawn sin shell, readline NDJSON, timeout de inactividad 60s, cap 5MB, kill en abort/close/workspace-switch — `startChat`/`abortChat`/`abortAllChats` (funciones, no clase). Composición de contexto reusando `pages.ts` / `workspace.ts` / `git.ts`.
- `screens/chat/` (renderer, folder-per-component): ChatPanel global + por página, `ChatBubble` flotante en `Home.Shell` (ancho/estado persistidos), `useChatController`, `useAiWriter`. (La 4ª columna dock del plan original quedó como burbuja flotante + `ChatBubble` launcher.)
- `CrepeCanvas`: `forwardRef` + `CrepeCanvasHandle.setMarkdown` (envuelve `setCrepeMarkdown`, sin tocar el mount effect).

## Protocolo / IPC

```ts
type ChatHostEvent =
  | { type: "started"; agent: string }
  | { type: "delta"; text: string }
  | { type: "thinking"; text: string }
  | { type: "tool"; name: string; brief?: string }
  | { type: "editStream"; markdown: string }
  | { type: "done"; code: number | null }
  | { type: "error"; message: string; code?: string };

type ChatRequest = {
  scope: "global" | "page";
  mode: "chat" | "editPage";
  prompt: string;
  path?: string;
  bufferMarkdown?: string;
  agent?: string;
  references?: string[];
};
```

DesktopApi (espejo patrón `onTheme`/`theme`): `chatListAgents()`, `chatSend(req)`, `chatAbort(sessionId)`, `onChatEvent(l)` → push channel `"chat-event"`.

## Config `.slashmd.json`

```jsonc
{
  "mcp": {
    "agent": { "name": "opencode", "args": ["run", "--format", "json"], "env": {} }
  }
}
```
`mcp?: MCPConfig` en `SlashmdFile` + rama en `parseSlashmd`. Agente ausente/no instalado → error claro en panel (AC#5).

## Fases

### Fase 1 — `packages/agents`
- [x] Adaptadores `opencode` / `claude` (normalizar delta/thinking/tool/done/error desde fixtures NDJSON reales) + presets `codex` (`codex exec --json`) y `cursor` (`agent -p --output-format stream-json --stream-partial-output`, con normalizador propio para deltas/tool_call/result).
- [x] `stream.ts` (normalizador + throttler) y `context.ts` (bundle + serialización a Markdown con caps).
- [x] Specs: adaptadores contra fixtures, serializer de contexto, throttle (99 archivos / 540 tests verdes).

### Fase 2 — Host: spawn + IPC
- [x] `electron/agents.ts`: `AgentManager` (spawn sin shell, readline NDJSON, timeout, cap, kill). Contexto con `pages.ts`/`workspace.ts`/`git.ts`.
- [x] `configTypes.ts` + `config.ts` (`mcp`). `api.ts` + `preload.ts` + `ipc.ts`: chat channels.
- [x] Specs: manager contra agente fake (`node -e` NDJSON), parse `mcp`, registro de canales (101 archivos / 548 tests verdes; lint 0 errores; `tsc` limpio).

### Fase 3 — Chat global
- [x] `screens/chat/` (ChatPanel, ChatBubble, MessageList, MessageItem, Composer, useChatController).
- [x] Mini renderer Markdown (headings, code, inline, links, listas, blockquotes, hr).
- [x] Burbuja flotante `ChatBubble` en el shell (launcher + panel con ancho persistido) + flush rail scroll.
- [x] i18n `chat.*` (es/en) + specs (104 archivos / 563 tests verdes; smoke home + chat-open OK).

### Fase 4 — Chat por página
- [x] `ChatBubble` montado por host (registry `PageChatHost`) + chip "página actual" + barriers `@`-mentions hacia el editor; contexto: frontmatter + `editor.getMarkdown()` (buffer, `ChatRequest.bufferMarkdown`) + hermanos + lote si aplica.
      (Smoke `ai-edit` con aserciones DOM: toggle `editor.aiChat`, composer y botón "Editar página" presentes.)

### Fase 5 — Realtime "escribir en la hoja"
- [x] `CrepeCanvas.handle.setMarkdown` + `setEditable` + `useAiWriter` (throttle en `stream.ts`, `editable=false` durante el turno, banner, revert a `savedAt`).
- [x] "Aplicar a la página" (inyecta la respuesta sin re-streaming).
- [x] Specs: guarda antieco, cancelar, revert (105 archivos / 572 tests verdes; `packages/agents` 3 archivos / 34 tests).

### Fase 6 — Hardening + verificación
- [x] `npm run desktop:lint` (0 errores / 6 warnings), `npm run typecheck` (limpio, tras arreglar el helper `textOf` y los cuerpos JSON-RPC en `server.spec.ts` contra el SDK MCP 1.30), `npm test -w @slash-md/desktop` (113 / 648 verdes; `packages/agents` solos 5 archivos / 74 tests, incluidos los de cursor).
- [x] Smoke E2E con agente fake (`node` + `.slashmd.json` en workspace temporal aislado): crear página → chat de página → "Editar página" → stream `editStream` escribe en vivo en el canvas → "Aplicar" persiste el markdown en disco. Aserciones DOM OK.
- [x] Smoke E2E con `opencode` real (v1.18.31, workspace temporal aislado): el agente se detecta, se selecciona, y su stream escribe en el canvas. Forma real de NDJSON (`type:"text"` con `part.text`) cubierta por regresión en `adapters.spec.ts`.
- [ ] Revisión visual del PNG (el modelo actual no puede leer imágenes).

### Fase 7 — Servidor MCP del wiki (AC#4)
- [x] `packages/agents/src/server/`: `WikiSource` (tipos + `normalizeWikiPath` con guard de traversal), tools `list_pages` / `read_page` / `search_pages` / `get_git_context` / `get_review_lote` (schemas zod, errores como `isError`), `createWikiMcpServer` y `startWikiHttpServer` (Streamable HTTP en 127.0.0.1, sesiones por `Mcp-Session-Id`, cap 32, puerto 0 para tests). Exports `./server` en package.json.
- [x] Specs: tools con fake `WikiSource` + server vía `InMemoryTransport` (`Client.listTools`/`callTool`) + E2E HTTP real (fetch `initialize` → `tools/list` → `tools/call` → `DELETE`) — `packages/agents/src/server` (2 archivos / 29 tests).
- [x] `electron/mcpServer.ts`: `wikiSourceForRoot` real (listLocalMarkdown/titleFor/mtime, splitFrontmatter, buildSearchIndex, git status/diff, listPendingReviewMarkdown) + lifecycle `startMcpServerForRoot`/`stopMcpServer`/`mcpServerUrl`; wiring en `ipc.ts` (`openFolder`/`closeFolder`), `main.ts` (`applyCliFolder`/`before-quit`, log `[mcp]`); `WorkspaceInfo.mcpUrl`.
- [x] Verificación: typecheck limpio, lint 0 errores / 6 warnings, `npm test -w @slash-md/desktop` (113 archivos / 648 tests). Build de producción bundlea el SDK sin errores (solo warnings de comentarios rollup).
- [x] E2E contra la app real: workspace `mode:local` + `mcp.server.enabled:true` → curl `initialize` (`serverInfo: slash-md-wiki`, sesión), `tools/list` (5 tools + JSON Schema), `read_page`, `list_pages`, `search_pages`, `get_git_context`, traversal `../` → `isError`, `DELETE` sesión.

## Mapeo a AC del issue

AC#1 → F1–3 · AC#2 → F4 + F5 · AC#3 → F1–2 · AC#4 → **F7** · AC#5 → F2 · AC#6 → transversal.

## Riesgos / mitigaciones

| Riesgo | Mitigación |
|---|---|
| NDJSON drop/hang (opencode/claude) | Consumir deltas + guarda 30s tras `done` → SIGKILL; cap y timeout |
| Stream vs autosave | Inyección imperativa (no vía prop `markdown`); eco → debounce; `readOnly` durante stream |
| Página grande → replaceAll caro | Throttle 10/s; cap de doc 50KB en modo edición |
| `.slashmd.json` malicioso | spawn sin shell + validación de args + PATH resolve + error claro |
| Agente no instalado / sin login | Probe en `chatListAgents` + error actionable |
| Procesos huérfanos | kill-tree en abort/cierre/cambio de workspace; sesión por turno |