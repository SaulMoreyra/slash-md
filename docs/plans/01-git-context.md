# Plan 01 — Contexto de operaciones + cola (fix doble clic)

> **Auditado.** Ver [AUDIT-2026-08.md](./AUDIT-2026-08.md). La estrategia cambió de *rechazar con toast* a **encolar**, porque rechazar no elimina el segundo clic.

## Objetivo

Que **un solo clic baste** en cualquier acción git-adjacent. Centralizar la ejecución de operaciones en un context que **encola** las acciones del usuario en vez de descartarlas, y que informe qué está pasando.

**Decisiones acordadas:**

| Tema | Decisión |
|------|----------|
| Alcance | Solo renderer (sin mutex en Electron main por ahora) |
| Base | Envuelve el `useRun` existente |
| Estrategia | **Cola**: las acciones del usuario se ejecutan al liberarse el lock |
| Feedback | Toast HeroUI con la operación en curso |
| Flujos | Global: publicaciones, review, publish, sync, refresh |

---

## Diagnóstico verificado

### La causa raíz

```14:20:apps/desktop/src/App/hooks/useRun.ts
  const run = useCallback<Run>(async (fn) => {
    if (busyRef.current) {
      return undefined;
    }
    busyRef.current = true;
    setBusy(true);
```

`busyRef` es síncrono, así que **el IPC duplicado ya está bloqueado**. El síntoma "tengo que hacer clic dos veces" viene del otro lado: si había una operación en vuelo cuando el usuario hizo clic, `run` **descarta su acción en silencio** y devuelve `undefined`. El usuario no ve nada, vuelve a hacer clic cuando ya se liberó, y entonces funciona.

**Consecuencia para el diseño:** un toast que diga "operación en curso" explica el problema pero **no lo resuelve** — el usuario seguiría necesitando el segundo clic. Por eso encolamos.

### Ventana real de doble disparo

```83:87:apps/desktop/src/screens/home/hooks/useHomeActions.ts
  async function onPublishBatch() {
    onError(null);
    await run(() => api().publishBatch(publicationPr));
    await onRefresh();
  }
```

`run` libera `busyRef` en su `finally`, o sea **antes** de que corra `onRefresh()`. Durante ese refresh el botón está habilitado otra vez. Mismo patrón en `onSignOut`, `onLeavePublication`, `onInitWorkspace`, `onSaveConfig`, `onSignIn`, `onSendReview`.

### Otros hallazgos

| # | Hallazgo | Detalle |
|---|----------|---------|
| 1 | `onRefresh` no pasa por `run` | `useWorkspace.ts` líneas 19-28: puede leer el árbol mientras otra op muta el repo |
| 2 | Botones sin `isDisabled` | `PublicationFab`, botón "+" de `PublicationsPane`, sync de `AlertBanner` |
| 3 | `PublicationRow` usa `onClick` nativo | Inconsistente con `onPress` de HeroUI |
| 4 | Handlers fire-and-forget | `void actions.onPublishBatch()` en `Overlays.tsx` |
| 5 | **`useRun` no es solo git** | La misma instancia la usa `usePageSession` (`savePage`, `openPage`) — el label del toast debe reflejarlo |

---

## Implementación

### Fase A — Enum de operaciones

Por el hallazgo 5, el nombre correcto es `AppOperation`, no `GitOperation`: el lock es compartido con operaciones que no son git.

**Archivo:** `apps/desktop/src/App/enums.ts`

```ts
export enum AppOperation {
  // Git — mutan el repo
  CreatePublication = "createPublication",
  ResumePublication = "resumePublication",
  LeavePublication = "leavePublication",
  ReviewBatch = "reviewBatch",
  PublishBatch = "publishBatch",
  PublishPersonal = "publishPersonal",
  SyncWithWiki = "syncWithWiki",
  FinishSync = "finishSyncWithWiki",
  AbortSync = "abortSyncWithWiki",
  ResolveConflict = "resolveConflict",
  DiscardDraft = "discardDraft",
  // Workspace / archivos — no son git pero comparten el lock
  Refresh = "refresh",
  OpenFolder = "openFolder",
  CreatePage = "createPage",
  CreateFolder = "createFolder",
  SavePage = "savePage",
  …
}
```

Clasificar cada una como `background` (refresh, preview) o `userAction` — la cola solo aplica a las segundas.

### Fase B — useOperationsController (cola)

**Archivo nuevo:** `apps/desktop/src/App/hooks/useOperationsController.ts`

```ts
type OperationsApi = {
  busy: boolean;
  operation: AppOperation | null;
  pending: number;
  error: string | null;
  runOp: <T>(op: AppOperation, fn: () => Promise<T>) => Promise<T | undefined>;
  refresh: () => Promise<void>;
};
```

Comportamiento de `runOp`:

1. Si no hay nada en vuelo → ejecutar de inmediato vía `run(fn)`.
2. Si hay algo en vuelo y la nueva op es **acción del usuario** → **encolar** y mostrar toast informativo ("Enviando a review… se ejecutará al terminar"). Devuelve la promesa que resuelve cuando la cola llegue a ella.
3. Si hay algo en vuelo y la nueva op es **background** (refresh) → descartar; ya vendrá otro refresh.
4. **Deduplicar**: si la misma `AppOperation` ya está en cola, no encolar de nuevo — devolver la promesa existente. Esto es lo que evita que un doble clic dispare dos publish.

La cola es un `useRef<Array<QueueItem>>` con un drenado secuencial; nada de estado en render para las entradas en vuelo.

**Regla clave:** el `refresh` posterior a una operación va **dentro** del mismo `runOp`, no después (corrige la ventana de doble disparo).

### Fase C — Toast

Verificado en `@heroui/react` v3.2.4: `dist/components/index.d.ts` reexporta `./toast`, así que el barrel funciona.

```tsx
import { Toast, toast } from "@heroui/react";

// Provider — montar en main.tsx dentro de ThemeProvider
<Toast.Provider placement="bottom-right" maxVisibleToasts={3} />

// Uso
toast.info(t("operations.queued", { operation: label }));
```

API disponible: `toast()`, `toast.info/success/warning/danger()`, `toast.promise()`, `toast.close(key)`, `toast.clear()`.

Cuándo dispara el context:

| Situación | Toast |
|-----------|-------|
| Acción encolada detrás de otra | `info` — "{{operación}} en cola" |
| Acción duplicada deduplicada | `info` — "{{operación}} ya en curso" |
| Operación falla | `danger` con el mensaje de error |
| Operación normal sin espera | Ninguno (no hacer ruido) |

### Fase D — Migrar callers

Todos pasan de `run(...)` a `runOp(AppOperation.X, ...)` **con el refresh adentro**:

```ts
async function onPublishBatch() {
  onError(null);
  await runOp(AppOperation.PublishBatch, async () => {
    await api().publishBatch(publicationPr);
    await onRefresh();
  });
}
```

| Archivo | Funciones |
|---------|-----------|
| `useHomeActions.ts` | `onSignOut`, `onLeavePublication`, `onPublishBatch`, `onCreatePage`, `onCreateFolder`, `onInitWorkspace`, `onSaveConfig`, `onSignIn`, `onCreatePublication`, `onSendReview` |
| `useConflicts.ts` | `onSyncWithWiki`, `onFinish`, `onRequestAbort`, `onResolve` |
| `useDraftPaneController.ts` | `onDiscard` |
| `useEditorChrome.ts` | Review / publish del editor |
| `useWorkspace.ts` | `onRefresh` (background), `onOpenFolder`, `onOpenPath` |
| `usePageSession.ts` | `savePage`, `openPage` — etiquetar aunque no sean git |

### Fase E — Wiring

```
useRun  →  useOperationsController(run)  →  AppContext.operations
```

**Archivo:** `apps/desktop/src/App/hooks/useAppController.ts`

- `chrome.busy` pasa a derivar de `operations.busy` (una sola fuente de verdad).
- Exponer `operations` namespaced en el retorno.

**Archivo:** `apps/desktop/src/screens/home/components/Home/context.tsx` — las acciones del home reciben `runOp` desde `AppContext`.

### Fase F — Audit de botones

Añadir `isDisabled={busy}` donde falta:

| Componente | Nota |
|------------|------|
| `PublicationFab.tsx` | Sin disable hoy |
| `PublicationsPane.tsx` | Botón "+" nueva publicación |
| `PublicationRow.tsx` | Además migrar `onClick`/`disabled` → `onPress`/`isDisabled` |
| `AlertBanner.tsx` | Botón de sync |
| `ReviewModalActions.tsx` | Send / Publish / Leave |
| `WikiSyncAlert.tsx`, `ConflictPane.tsx`, `DraftPane.tsx`, `EditorMoreActions.tsx` | Verificar |

Con la cola, `isDisabled` es cosmético (evita ruido visual), no la defensa principal.

### Fase G — Atajos

**Archivo:** `useKeyboardShortcuts.ts` — `Cmd+Shift+R` → `operations.refresh()` (background, descartable).

### Fase H — i18n

```json
"operations": {
  "names": {
    "refresh": "Actualizando biblioteca",
    "reviewBatch": "Enviando a review",
    "publishBatch": "Publicando",
    "syncWithWiki": "Sincronizando con la wiki",
    "createPublication": "Creando publicación",
    "resumePublication": "Cambiando de publicación"
  },
  "queued": "{{operation}} — se ejecutará al terminar la actual",
  "alreadyRunning": "{{operation}} ya está en curso"
}
```

---

## Testing

### Specs

| Archivo | Casos |
|---------|-------|
| Nuevo: `src/App/hooks/__specs__/useOperationsController.spec.ts` | Ver casos abajo |
| Actualizar: `src/App/hooks/__specs__/useRun.spec.ts` | El mutex base no cambia |
| Actualizar: `src/screens/home/hooks/__specs__/useConflicts.spec.ts` | Mockear `runOp` |
| Actualizar: `AlertBanner.spec.tsx`, `PublicationFab.spec.tsx`, `PublicationsPane.spec.tsx`, `PublicationRow.spec.tsx` | Nuevo `isDisabled` |

### Casos mínimos de la cola

1. Op A en vuelo + op B del usuario → B **se ejecuta** al terminar A (no se descarta).
2. Doble disparo de la misma op → **una sola** ejecución; la segunda reusa la promesa.
3. Refresh de fondo durante una op → descartado sin toast.
4. A falla → B de la cola **igual se ejecuta**; el error de A no la cancela.
5. Cola vacía tras drenar; `pending === 0`.
6. `busy` vuelve a `false` solo cuando la cola queda vacía.

### Comandos

```bash
npm run test -- --run apps/desktop/src/App
npm run test -- --run apps/desktop/src/screens/home
npm run desktop:typecheck
npm run desktop:lint
```

---

## Validación manual

Precondición: workspace git con publicaciones y wiki sync.

| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Clic **una vez** en "Send to review" estando la app recién abierta | Funciona al primer intento, sin necesidad de repetir |
| 2 | Doble clic rápido en "Send to review" | **Una** operación; segunda deduplicada |
| 3 | Clic en "Publish" mientras corre el review | Se encola y corre solo al terminar; toast lo anuncia |
| 4 | `Cmd+Shift+R` durante un sync de wiki | Refresh descartado; el árbol queda consistente al terminar |
| 5 | Resume publication (clic en fila) | Un clic basta |
| 6 | PublicationFab durante una operación | Deshabilitado, sin abrir modal duplicado |
| 7 | Sync de AlertBanner durante otra op | Encolado con toast |
| 8 | Resolver conflicto ×2 rápido | Una sola resolución |
| 9 | Flujo completo review → publish | Ningún paso necesita clic repetido |
| 10 | Provocar un error (sin red) durante publish | Toast de error; la app sigue usable; la cola se drena |
| 11 | Sesión larga con muchas acciones | Los toasts no se acumulan (`maxVisibleToasts`) |

**Regresión:** crear página/carpeta y guardar sigue funcionando; las operaciones que no son git no muestran labels de git.

---

## Fuera de scope

- Mutex/cola en Electron main (`ipc.ts`)
- Store de estado git (branch, status) en el context — sigue derivándose de `homeTree`
- Reintento automático de operaciones fallidas
- Barra de progreso por subpaso git (fetch/switch/commit)

---

## Dependencias

- **Después de:** [00-theme-context-bootstrap.md](./00-theme-context-bootstrap.md) — `Toast.Provider` se monta junto a `ThemeProvider` en `main.tsx`
- **Independiente de:** planes 03–07
