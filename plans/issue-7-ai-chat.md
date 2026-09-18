# Plan — Local AI chat harness vía agentes CLI (Issue #7)

> Estado: **en ejecución**. Cada fase se marca `[x]` al completarse y verificarse.

## Decisión de protocolo (auditoría)

- **Adapters headless CLI, no "MCP client sobre stdio".** opencode/Claude Code/Codex/Cursor son clientes MCP, no servidores. La interfaz universal para conducirlos desde una app es modo headless + NDJSON (`opencode run --format json`, `claude -p --output-format stream-json --verbose`, `codex exec --json`).
- **MCP real solo en la dirección inversa** (Slash como servidor de herramientas para agentes externos) → separado a fase 2 del producto.
- **Realtime en la hoja**: stream directo al buffer vía `setCrepeMarkdown` imperativo + eco al pipeline de guardado normal. Editor `readOnly` durante el stream + banner "Escribiendo… [Detener]" + "Revertir al guardado".

## Arquitectura

- `packages/agents/` (shared, puro; sin Electron): adapters por agente, normalizador de stream NDJSON→`ChatHostEvent`, context bundle serializado a Markdown, tipos (`switch` + `assertNever`).
- `apps/desktop/electron/agents.ts` (host; único dueño del spawn): `AgentManager` — spawn sin shell, readline NDJSON, timeout de inactividad 60s, cap 5MB, kill en abort/close/workspace-switch. Composición de contexto reusando `pages.ts` / `workspace.ts` / `git.ts`.
- `screens/chat/` (renderer, folder-per-component): ChatPanel global (4ª columna en `Home.Shell`, resizable) + chat por página (asíde junto a `WikiPeek`), `useChatController`, `useAiWriter`.
- `CrepeCanvas`: `forwardRef` + `CrepeCanvasHandle.setMarkdown` (envuelve `setCrepeMarkdown`, sin tocar el mount effect).

## Protocolo / IPC

```ts
type ChatHostEvent =
  | { type: "session"; sessionId: string }
  | { type: "started"; agent: string }
  | { type: "delta"; text: string }
  | { type: "thinking"; text: string }
  | { type: "tool"; name: string; brief?: string }
  | { type: "editStream"; step: number; markdown: string }
  | { type: "done" }
  | { type: "error"; message: string; code?: string };

type ChatSendRequest = { scope: "global" | "page"; path?: string; prompt: string; mode: "chat" | "editPage" };
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
- [x] Adaptadores `opencode` / `claude` (normalizar delta/thinking/tool/done/error desde fixtures NDJSON reales) + slot `codex`/`cursor` documentado.
- [x] `stream.ts` (normalizador + throttler) y `context.ts` (bundle + serialización a Markdown con caps).
- [x] Specs: adaptadores contra fixtures, serializer de contexto, throttle (99 archivos / 540 tests verdes).

### Fase 2 — Host: spawn + IPC
- [x] `electron/agents.ts`: `AgentManager` (spawn sin shell, readline NDJSON, timeout, cap, kill). Contexto con `pages.ts`/`workspace.ts`/`git.ts`.
- [x] `configTypes.ts` + `config.ts` (`mcp`). `api.ts` + `preload.ts` + `ipc.ts`: chat channels.
- [x] Specs: manager contra agente fake (`node -e` NDJSON), parse `mcp`, registro de canales (101 archivos / 548 tests verdes; lint 0 errores; `tsc` limpio).

### Fase 3 — Chat global
- [x] `screens/chat/` (ChatPanel, MessageList, MessageItem, Composer, useChatController).
- [x] Mini renderer Markdown (headings, code, inline, links, listas, blockquotes, hr).
- [x] Dock 4ª columna en `Home.Shell` (resizable como `PageResizer`, ancho persistido).
- [x] i18n `chat.*` (es/en) + specs (104 archivos / 563 tests verdes; smoke home + chat-open OK).

### Fase 4 — Chat por página
- [x] Panel en `Editor.tsx` junto a `WikiPeek` (permanece por tab; `EditorPanel` mantiene montados los inactivos).
- [x] Contexto: frontmatter + `editor.getMarkdown()` (buffer, `ChatRequest.bufferMarkdown`) + hermanos + lote si aplica.
      (Smoke `ai-edit` con aserciones DOM: toggle `editor.aiChat`, composer y botón "Editar página" presentes.)

### Fase 5 — Realtime "escribir en la hoja"
- [x] `CrepeCanvas.handle.setMarkdown` + `setEditable` + `useAiWriter` (throttle en `stream.ts`, `editable=false` durante el turno, banner, revert a `savedAt`).
- [x] "Aplicar a la página" (inyecta la respuesta sin re-streaming).
- [x] Specs: guarda antieco, cancelar, revert (105 archivos / 572 tests verdes; `packages/agents` 3 archivos / 34 tests).

### Fase 6 — Hardening + verificación
- [x] `npm run desktop:lint` (0 errores), `tsc --noEmit` (limpio), `npm test -w @slash-md/desktop` (105 / 572 verdes), `packages/agents` (3 / 34).
- [x] Smoke E2E con agente fake (`node` + `.slashmd.json` en workspace temporal aislado): crear página → chat de página → "Editar página" → stream `editStream` escribe en vivo en el canvas → "Aplicar" persiste el markdown en disco. Aserciones DOM OK.
- [x] Smoke E2E con `opencode` real (v1.18.31, workspace temporal aislado): el agente se detecta, se selecciona, y su stream escribe en el canvas. Forma real de NDJSON (`type:"text"` con `part.text`) cubierta por regresión en `adapters.spec.ts`.
- [ ] Revisión visual del PNG (el modelo actual no puede leer imágenes).

## Mapeo a AC del issue

AC#1 → F1–3 · AC#2 → F4 + F5 · AC#3 → F1–2 · AC#5 → F2 · AC#6 → transversal. **AC#4 (MCP server) → fase 2 del producto** (`packages/agents/server` con `@modelcontextprotocol/sdk`).

## Riesgos / mitigaciones

| Riesgo | Mitigación |
|---|---|
| NDJSON drop/hang (opencode/claude) | Consumir deltas + guarda 30s tras `done` → SIGKILL; cap y timeout |
| Stream vs autosave | Inyección imperativa (no vía prop `markdown`); eco → debounce; `readOnly` durante stream |
| Página grande → replaceAll caro | Throttle 10/s; cap de doc 50KB en modo edición |
| `.slashmd.json` malicioso | spawn sin shell + validación de args + PATH resolve + error claro |
| Agente no instalado / sin login | Probe en `chatListAgents` + error actionable |
| Procesos huérfanos | kill-tree en abort/cierre/cambio de workspace; sesión por turno |