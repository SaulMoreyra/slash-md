# Plan — POC: tab de historial de chats + vista principal de chat de agente

> Estado: **en ejecución**. Cada fase se marca `[ ]` y se verifica antes de pasar a la siguiente.
>
> Rama: `feat/ai-chat-harness` | Referencia: [`langchain-ai/agent-chat-ui`](https://github.com/langchain-ai/agent-chat-ui)

## Objetivo

Añadir a slash-md: (1) un **tab / historial de conversaciones de chat** y (2) una **vista principal de chat de agente**. Se entrega primero como **POC de una vista standalone** (recomendado por el usuario), y después se **revisa si puede integrarse en la burbuja de chat** (ChatBubble).

## Decisiones tomadas (con el usuario)

| Pregunta | Decisión |
|----------|----------|
| **Dónde montar la vista en el POC** | Nueva entrada en la **Rail** (`NavKind.AgentChat`) que abre la vista a pantalla completa en la columna de trabajo (WorkColumn/Stage). *(Recomendado)* |
| **Burbuja en esa vista** | La **burbuja desaparece** cuando la vista principal/historial está activa. *(Recomendado)* |
| **Alcance del historial** | **Global + vinculado a páginas** (índice agrega sesiones de ambos contextos). *(Recomendado)* |
| **Alcance del POC** | Solo la **vista standalone**; la integración a la burbuja se decide tras revisar el POC. *(Recomendado)* |

## Qué tomamos de `agent-chat-ui` (patrón, no código)

- **Historial = lista de conversaciones (threads)**, no una sola sesión. `agent-chat-ui` la obtiene de LangGraph (`client.threads.search`); nosotros la indexamos en `localStorage` (ya vivimos ahí).
- **Rail lateral de historial (300px) + vista principal de chat** como composición natural: rail/Sheet de "historial" a la izquierda, pane principal a la derecha; toggle de apertura (`chatHistoryOpen`), skeletons de carga, "Nueva conversación" (limpia la selección).
- **Persistencia de sesión con `updatedAt`** para ordenar el historial por `updatedAt` desc — oggi slash-md guarda **una única sesión por contexto** sin timestamps.
- **Vista reutilizable aislada del provider de streaming**: en `agent-chat-ui` `Thread` (vista) y `StreamProvider` están separados — en slash-md eso ya existe: `ChatPanel` (vista) vs `useChatController` (controlador) vs `chatStorage` (persistencia).

## Estado actual del chat en slash-md (dónde encaja)

- `screens/chat/components/ChatBubble/` — burbuja flotante (launcher FAB + `Panel`), montada en Home.
- `screens/chat/components/ChatPanel/` — **`ChatPanel` reutilizable** (`scope/mode/path/getBuffer/getEditApi/storageKey`). Reúsa `useChatController` + `chatStorage`.
- `screens/chat/hooks/useChatController.ts` — máquina de turnos + streaming de agentes CLI locales (IPC → `agents.ts`).
- `screens/chat/chatStorage.ts` — **UNA sesión por contexto** (`localStorage slashmd:chat:v1:<contextKey>`: `{draft, turns, agent}`). **No hay historial.** Este es el hueco central.

## Fase 1 — Modelo de datos: historial de sesiones (POC)

**Nuevo `screens/chat/chatStorage.ts` additions (retrocompatible — no toca el bubble):**
- `ChatStoredSession` + `updatedAt: string` (ISO). `saveChatSession` lo escribe; `loadChatSession` tolera su ausencia (será `EMPTY`/…).
- `listChatSessions(): ChatSessionMeta[]` — escanea `localStorage` por claves `slashmd:chat:v1:*` → `[{ contextKey, scope, path?, title, updatedAt, turnsCount, agent? }]`, ordenado por `updatedAt` desc.
- `deleteChatSession(contextKey)`.
- `title` derivado del primer turno de usuario (truncado) — preview, igual que `agent-chat-ui` usa el `firstMessage`.

**Specs:** `__specs__/chatStorage.spec.ts` — `listChatSessions` orden/scope/filtro, `deleteChatSession`, retrocompat.

## Fase 2 — Entrada en la Rail: `NavKind.AgentChat`

- `screens/home/enums.ts`: añadir `NavKind.AgentChat = "agentChat"`.
- `screens/home/types.ts`: añadir `NavView` case `{ kind: NavKind.AgentChat }`.
- `Rail/index.ts` + `RailNav`-ish: **no** — la entrada nueva va donde está la lista del rail (`components/Rail/...` o el switch de navegación de Home).
- Switch de pane en la columna de trabajo (donde `NavKind` decide el contenido): nuevo caso → `<AgentChatScreen/>`.
- `i18n`: `home.nav.*` key para la entrada.

**Specs:** render de la entrada al hacer nav + que burbuja no se ve en esa vista.

## Fase 3 — La vista standalone `AgentChatScreen`

**Nueva carpeta `screens/agent-chat/` (componente-por-carpeta, patrón del repo):**
- `AgentChatScreen/AgentChatScreen.tsx`: raíz de la vista (grid 2 columnas).
- `components/HistoryPane/HistoryPane.tsx`: **el historial (tab)** — lista (`listChatSessions`), skeleton, click → selecciona sesión, "Nueva conversación" → crea nueva.
- `components/ChatPane/ChatPane.tsx`: monta el **`ChatPanel` existente** con `scope/mode/path/getBuffer/getEditApi/storageKey` de la sesión seleccionada — **reusando `useChatController` + `chatStorage`, sin duplicar la lógica del bubble**.
- `hooks/useAgentChatController.ts`: estado de selección (`selectedContextKey`), lista de sesiones, `onNew` / `onSelect`, y swap de sesión (flush del draft previo al cambiar de contextKey — mismo patrón que `useChatController`).

**Specs:** `AgentChatHistory/index.spec`, `useAgentChatController.spec` (selección ↔ storage), e integración: seleccionar del historial → renderiza `ChatPanel` con esa sesión.

## Fase 4 — Ocultar la burbuja en esa vista

- En el raíz de Home (donde se monta el `ChatBubble`): si la vista activa es `NavKind.AgentChat`, no renderizar el `ChatBubble`. *(Recomendado)*

## Fase 5 — Revisión post-POC: integrar a la burbuja (fuera de alcance del POC implícito, se decide tras revisar)

Candidate: `ChatPanel` dentro de la burbuja, con **mini-router de 2 pestañas `[Chat | Historial]`** dentro del `Panel` (tab para ver historial + vista principal del chat de agente), reutilizando `useChatController` + `chatStorage` sin añadir backend. El POC standalone demuestra que la pieza es autonóma y reutilizable antes de embutirla.

## Verificación

- `npm run lint -w @slash-md/desktop`, `npm run typecheck -w @slash-md/desktop`, `npm run test -w @slash-md/desktop` (specs de las fases).
- `npm run desktop:dev` manual: Rail → AgentChat → historial lista sesiones globales + de páginas; seleccionar abre el chat con el draft correspondiente; burbuja oculta en esa vista; botón "Nueva conversación".
