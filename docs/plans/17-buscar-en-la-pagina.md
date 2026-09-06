# Plan 17 — Buscar dentro de la página actual

> Hoy `Cmd+K` busca **páginas** en la biblioteca. No hay forma de buscar **dentro** del documento abierto.

**Alcance (v1):**

| Capa | Archivos |
|---|---|
| Motor | `packages/ui/src/editor/plugins/search.ts`, `packages/ui/src/editor/core/crepe.ts`, `packages/ui/src/editor/theme.css` |
| Puente editor | `apps/desktop/src/components/CrepeCanvas/` |
| UI desktop | `apps/desktop/src/screens/editor/components/FindInPagePanel/`, `…/Canvas.tsx` (montaje), `…/hooks/useFindInPage.ts` |
| Atajos y menú | `screens/editor/hooks/useKeyboardShortcuts.ts`, `screens/home/hooks/useKeyboardShortcuts.ts`, `screens/home/hooks/useHomeController.ts`, `apps/desktop/shared/menu.ts`, `apps/desktop/electron/menu.ts` |
| i18n | `apps/desktop/src/i18n/locales/{es,en}.json` |

**Fuera de alcance v1:** reemplazar, expresiones regulares, buscar en documentos no abiertos (eso es `Cmd+K`), UI de búsqueda en la extensión de VS Code (el plugin sí; ver [VS Code](#vs-code-v1)).

---

## Lo que ya existe

| Pieza | Dónde | Qué hace |
|---|---|---|
| `useSearch` | `screens/home/hooks/useSearch.ts` | Busca **páginas** por título sobre el árbol (`rankLibraryHits`). No mira el contenido |
| `SearchPalette` | `components/SearchPalette/` | Modal grande centrado para `Cmd+K`. **No** es la referencia visual para find-in-page |
| `Cmd+K` | `home/hooks/useKeyboardShortcuts.ts:85` + `electron/menu.ts:106` | Abre el buscador de biblioteca |
| `commentsProse` | `packages/ui/src/editor/plugins/commentsPlugin.ts:39` | Plugin de ProseMirror que ya pinta decoraciones — **precedente del motor** |
| `useMenuActions` | `App/hooks/useMenuActions.ts` + `useHomeController` | Conecta el menú nativo con handlers de Home. Find-in-page necesita un puente hacia el editor |

**`Cmd+F` está libre**: no aparece en ningún atajo ni en el menú.

---

## Objetivo

Buscar texto en el **cuerpo** del documento abierto (ProseMirror): resaltar todas las coincidencias, moverse entre ellas y saber cuántas hay.

La UI es un **panel pequeño y discreto** — no un modal centrado como `SearchPalette`. Referencia: la barra de búsqueda de Chrome/VS Code (una fila flotante, sin oscurecer el documento).

---

## Tres caminos

**A — `webContents.findInPage()` de Electron.** Gratis y nativo. **Descartado:** busca en toda la ventana (barra lateral, panel de publicaciones, chrome incluidos), no se puede acotar al documento, no da control sobre el resaltado y se lleva mal con `contenteditable`. Además no existiría en la extensión de VS Code.

**B — Dependencia `prosemirror-search`.** Hace justo esto. **No está instalada** (verificado). Trae comandos y decoraciones ya resueltos, pero también su propio modelo de estado y su UI implícita, y una dependencia nueva en un monorepo que hoy no la necesita.

**C — Plugin propio de decoraciones.** ~80 líneas siguiendo exactamente el patrón de `commentsPlugin.ts`, que ya recorre el documento y devuelve un `DecorationSet`. **Elegido:** control total del resaltado, del recuento y de la navegación; cero dependencias; y vive en `packages/ui`, así que VS Code hereda el motor aunque no la UI React.

---

## El obstáculo real: no hay acceso al editor desde React

`CrepeCanvas` guarda el `CrepeBuilder` en un ref **privado** (`apps/desktop/src/components/CrepeCanvas/CrepeCanvas.tsx:35`) y no lo expone. Sin acceso a la vista de ProseMirror no se puede ni consultar el documento ni despachar la transacción que mueve la selección.

Es la parte del plan con más riesgo de tocar código que hoy funciona, y por eso va primera y sola:

1. `CrepeCanvas` acepta un callback `onReady(handle)` que entrega un `SearchHandle` acotado. **No** el builder entero: exponerlo invita a que cualquier pantalla manipule el editor por su cuenta.
2. El handle y el plugin viven en `packages/ui` (`createSearchHandle` + `registerSearch`). `CrepeCanvas` solo reenvía cuando `createSlashCrepe` termina. El tipo `SearchHandle` se exporta desde `@slash-md/ui/editor/plugins/search` (o `…/searchHandle.ts`).
3. Si el usuario abre find antes de que el canvas esté listo, la query se encola en el hook y se aplica en el primer `onReady`.

### API `SearchHandle`

```ts
export type SearchState = {
  query: string;
  active: number; // 1-based para la UI; 0 si total === 0
  total: number;
};

export type SearchHandle = {
  search(query: string): SearchState;
  next(): SearchState;
  prev(): SearchState;
  clear(): void;
  getSelectionText(): string;
  /** Se llama tras search/next/prev/clear y en cada docChanged con el panel activo. */
  subscribe(listener: (state: SearchState) => void): () => void;
};
```

React no lee el plugin directamente: `useFindInPage` se suscribe con `handle.subscribe` y mantiene `active` / `total` para el contador. Cada `search()` / `next()` / `prev()` también devuelve el estado por si hace falta una actualización síncrona tras la acción.

---

## Piezas

### 1. Motor — `packages/ui/src/editor/plugins/search.ts`

Plugin `$prose` con estado propio:

- `query`, `matches: { from, to }[]`, `active: number` (índice 0-based interno)
- Recalcula al cambiar la query y en cada `docChanged`; notifica suscriptores con el `SearchState` actualizado
- Matching **insensible a mayúsculas** (D-5), **literal** (sin regex — los caracteres especiales se buscan tal cual)
- **Sí** busca en código **inline** (`code` mark dentro de párrafos)
- **Excluye** nodos de bloque de código (D-4): no recorrer el contenido de `code_block` / lo que CodeMirror monta
- Si el documento cambia y desaparece la coincidencia activa, **clampear** `active` al rango válido (o a 0 si `total === 0`)
- `decorations`: una `Decoration.inline` por coincidencia, con clase `slash-search-hit` y `slash-search-hit-active` en la activa
- `searchNext` / `searchPrev`: mueven `active` con **wrap circular** (D-9), despachan `TextSelection` y `scrollIntoView()`

Registrar en `crepe.ts` con `registerSearch(builder.editor)` — mismo patrón que `registerComments`.

**Tests unitarios** (sin layout): matching case-insensitive y literal, recálculo tras cambio de documento, clamp del índice activo, wrap en next/prev, query vacía → cero coincidencias.

### 2. Estilos — `theme.css`

`.slash-search-hit` y `.slash-search-hit-active` con tokens del tema. **Cuidado:** que la coincidencia activa se distinga de la selección normal, y que ambas se lean en claro — es exactamente el fallo del [Plan 15](./15-seleccion-light-mode.md), así que hay que medir contraste, no elegir a ojo.

### 3. Posicionamiento del panel

`Overlays.tsx` queda para modales centrados (`ThreadPopover`, `CommentDraftModal`, `ReviewModal`). El find-in-page **no** va ahí: `#page` vive dentro de `Canvas.tsx` y es el contenedor con `overflow-auto` — el panel debe anclarse a ese scroll.

**Decisión (D-pos):** montar en `Canvas.tsx`, como primer hijo de `#page`:

```tsx
<div className={pageClass} id="page">
  {find.open ? <FindInPagePanel … /> : null}
  <HeroChrome>…</HeroChrome>
</div>
```

CSS del panel:

```css
.find-in-page-panel {
  position: sticky;
  top: 0.75rem;
  z-index: 20;
  margin-left: auto;
  margin-right: 0.75rem;
  width: fit-content;
  max-width: min(24rem, calc(100% - 1.5rem));
}
```

- **`sticky` + `top`:** la barra permanece visible al hacer scroll del documento (comportamiento Chrome/VS Code), sin desplazarse con el párrafo debajo.
- **Esquina superior derecha** del área scrollable del canvas, no de la ventana entera (no tapa rail ni work pane).
- Sin backdrop. `WikiPeek` abierto reduce el ancho del canvas; el panel se adapta al contenedor `#page`.

### 4. UI — `FindInPagePanel` (desktop)

Componente nuevo bajo `screens/editor/components/FindInPagePanel/`, siguiendo `.cursor/rules/desktop-react-components`:

```
FindInPagePanel/
  FindInPagePanel.tsx
  index.ts
  __specs__/FindInPagePanel.spec.tsx
  hooks/useFindInPagePanelController.ts
```

**No es `SearchPalette`.** Diferencias explícitas:

| | `SearchPalette` (`Cmd+K`) | `FindInPagePanel` (`Cmd+F`) |
|---|---|---|
| Propósito | Elegir otra página | Buscar dentro de la página abierta |
| Contenedor | `HeroModal` centrado, `size="lg"`, backdrop | Panel flotante **sin backdrop** |
| Posición | Centro superior de la ventana | Esquina superior derecha del canvas, `position: sticky` dentro de `#page` (ver §3) |
| Tamaño | Input 3xl + lista de resultados | Una fila compacta: input + `3 / 12` + ↑ + ↓ + ✕ |
| Estilo | Superficie de modal | `bg-surface/90 backdrop-blur`, borde sutil, sombra ligera — discreto sobre el documento |

**Contenido de la fila:**

- `Input` (HeroUI o `<input>` nativo con tokens) — placeholder i18n
- Contador `active / total` con `aria-live="polite"` (p. ej. `3 / 12`; `0 / 0` sin coincidencias)
- Botones icono anterior / siguiente (`onPress`)
- Botón cerrar

**Montaje:** `Canvas.tsx` renderiza `{find.open ? <FindInPagePanel … /> : null}` como primer hijo de `#page` (§3). `useFindInPagePanelController` solo orquesta foco del input, `Enter`/`Shift+Enter` con `preventDefault`, y ref del campo.

**Hook de dominio:** `useFindInPage` en `screens/editor/hooks/`:

- Estado: `open`, `query`, `active`, `total`, ref al `SearchHandle`
- Handlers: `onOpen`, `onClose`, `onQueryChange`, `onNext`, `onPrev` — **sin** `onToggle` (`Cmd+F` no cierra el panel)
- Suscripción a `handle.subscribe` para mantener `active` / `total` en React
- Al abrir: cerrar `SearchPalette` si estaba abierto (D-10); cerrar thread si lo hay (D-6); si hay texto seleccionado en ProseMirror (`getSelectionText()`), pre-rellenar y buscar
- Al cerrar: `clear()` en el plugin y vaciar `query`
- Al cambiar `page.path` (`docPath`): cerrar y limpiar
- Debounce ~150 ms en `onQueryChange` antes de llamar a `search(query)`

**Controller:** `useEditorController` compone `useFindInPage` y expone namespace `find` en el return (junto a `editor`, `threads`, `comments`, `chrome`). `Canvas` y atajos consumen `find` vía `useEditor()` — no `setState` crudo.

### 5. Atajos — teclado

Solo activos cuando hay página abierta (el hook del editor). Home registra un guard para `Cmd+F` sin página (D-11).

**Editor** — `screens/editor/hooks/useKeyboardShortcuts.ts`:

| Atajo | Acción |
|---|---|
| `Cmd+F` | `preventDefault`. Si cerrado → `find.onOpen()`. Si abierto → enfocar el input (no toggle cerrar; distinto de `Cmd+K`) |
| `Enter` | Siguiente coincidencia con wrap (D-9); solo con el panel abierto. En el input del panel: `preventDefault` |
| `Shift+Enter` | Anterior coincidencia con wrap (D-9) |
| `Escape` | Ver cadena abajo |

Listener en `window` con `preventDefault` en `Cmd+F`.

**Home** — `screens/home/hooks/useKeyboardShortcuts.ts`:

| Atajo | Acción |
|---|---|
| `Cmd+F` sin `pagePath` | `preventDefault` + no-op — evita el find nativo de Chromium sobre toda la ventana (D-11) |
| `Cmd+K` con find abierto | `requestCloseFindInPage()` y luego abrir `SearchPalette` (D-10) |

`useFindInPage.onOpen` llama a `useHomeOptional()?.search.onClose()` si la biblioteca estaba abierta (D-10).

### 6. Cadena de `Escape`

Orden fijo en `screens/editor/hooks/useKeyboardShortcuts.ts` — **find va primero**:

```
Escape → find abierto?        → cerrar find
       → moreOpen?            → cerrar menú más
       → thread abierto?      → cerrar thread
       → commentDraft?        → cancelar borrador
       → reviewOpen?          → cerrar review
       → onClose()            → cerrar página
```

Al **abrir** find: cerrar thread abierto si lo hay (D-6). No cerrar `commentDraft` ni `reviewOpen` automáticamente — el usuario puede estar en medio de una acción; find es un overlay ligero que no compite con modales centrados.

### 7. Menú Editar — puente Home → Editor

`MenuAction.FindInPage` nuevo en `apps/desktop/shared/menu.ts` + copia i18n en `menuCopy` (`findInPage`).

Entrada en `electron/menu.ts`, submenú Edición, **debajo** de Buscar (`Cmd+K`):

```
Buscar…              ⌘K
Buscar en la página  ⌘F
```

**Problema:** `useMenuActions` está en `useHomeController`, pero el estado de find vive en el editor.

**Solución v1:** módulo compartido `apps/desktop/src/screens/editor/findInPageBridge.ts`:

```ts
let openFind: (() => void) | null = null;
let closeFind: (() => void) | null = null;
export function registerFindInPageOpener(fn: () => void): () => void { … }
export function registerFindInPageCloser(fn: () => void): () => void { … }
export function requestOpenFindInPage(): void { openFind?.(); }
export function requestCloseFindInPage(): void { closeFind?.(); }
```

- `useFindInPage` registra `onOpen` / `onClose` al montar y desregistra al desmontar.
- `useHomeController` en `[MenuAction.FindInPage]`: si `pagePath` → `requestOpenFindInPage()`; si no hay página abierta, no-op.
- `useKeyboardShortcuts` de Home: antes de `search.onToggle()` en `Cmd+K`, llamar `requestCloseFindInPage()` (D-10).
- `useFindInPage.onOpen`: `useHomeOptional()?.search.onClose()` si `SearchPalette` estaba abierto (D-10).

### 8. i18n

Claves nuevas bajo `editor.find` en `es.json` / `en.json`:

| Clave | ES (ejemplo) |
|---|---|
| `editor.find.label` | Buscar en la página |
| `editor.find.placeholder` | Buscar en el documento… |
| `editor.find.previous` | Anterior |
| `editor.find.next` | Siguiente |
| `editor.find.close` | Cerrar |
| `editor.find.noMatches` | Sin coincidencias |
| `editor.find.scopeNote` | Solo el cuerpo del documento (no incluye el título ni bloques de código) — tooltip o `aria-description` opcional en v1 |

Menú nativo: `menuCopy.findInPage` en `shared/menu.ts` (Electron no usa react-i18n).

---

## Decisiones (cerradas para v1)

| ID | Pregunta | Decisión | Razón |
|---|---|---|---|
| **D-3** | ¿Incluye el título? | **No** | `#hero-title` es `contentEditable` fuera de ProseMirror; otro mecanismo de resaltado |
| **D-4** | ¿Texto en bloques de código? | **No** | CodeMirror no es texto plano de ProseMirror |
| **D-5** | ¿Sensible a mayúsculas? | **No** (insensible, sin toggle) | Comportamiento estándar de find-in-page |
| **D-6** | ¿Precedencia con thread abierto? | **Cerrar thread al abrir find** | Evita dos overlays sobre el canvas |
| **D-7** | ¿Modo solo lectura? | **Find sí, editar no** | Buscar no muta; el panel se muestra igual con `editable: false` |
| **D-8** | ¿VS Code UI en v1? | **No** | Motor en `packages/ui`; UI React solo desktop. VS Code en plan aparte si hace falta |
| **D-9** | ¿Navegación circular? | **Sí** | En la última coincidencia, `Enter` → primera; en la primera, `Shift+Enter` → última (Chrome/VS Code) |
| **D-10** | ¿Convivencia con `SearchPalette`? | **Mutuamente excluyentes** | Al abrir find → cerrar biblioteca; al abrir `Cmd+K` → cerrar find |
| **D-11** | ¿`Cmd+F` sin página abierta? | **`preventDefault` + no-op** | Evita find nativo de Chromium en sidebar/chrome; menú Editar igual |

---

## VS Code (v1)

- **Sí:** plugin + estilos + `registerSearch` en `createSlashCrepe` — la extensión ya importa `theme.css` vía `packages/ui/src/editor/main.ts`.
- **No:** barra flotante. El editor VS Code es DOM vanilla (`editorController.ts`); una UI allí sería `packages/ui/src/editor/chrome/findBar.ts` en otro plan.
- **Criterio v1:** documentar “pendiente en VS Code” como en el Plan 16, sin bloquear el merge desktop.

---

## Qué puede salir mal

| Fallo | Riesgo | Qué hacer |
|---|---|---|
| Exponer el builder entero desde `CrepeCanvas` | Cualquier pantalla acaba manipulando el editor | Exponer solo la API acotada |
| Recalcular en cada tecla en un doc largo | Se traba al escribir la query | Debounce ~150 ms; medir con un doc real de `docs/` |
| El resaltado se confunde con la selección | El usuario no sabe cuál es la coincidencia activa | Medir contraste en claro y oscuro. Ver Plan 15 |
| `Escape` cierra la página en vez del buscador | Pérdida de contexto | Find primero en la cadena; spec en `useKeyboardShortcuts` |
| Las decoraciones chocan con las de comentarios | Resaltados encimados o perdidos | Dos `DecorationSet` independientes; probar con PR + comentarios activos |
| `Cmd+F` se lo come el `contenteditable` | El atajo no llega | `preventDefault` en listener de `window`; probar con caret en canvas y en título |
| Panel se desplaza al hacer scroll | UX rota | `position: sticky` en `#page`, no `absolute` ni montaje en `Overlays` |
| Panel se confunde con `SearchPalette` | UX incoherente | Sin backdrop, sticky en canvas, una fila — criterio explícito; D-10 |
| Menú Find sin página abierta | Acción misteriosa | No-op + `preventDefault` (D-11) |
| `Cmd+F` sin página dispara find de Chromium | Busca en sidebar y chrome | Guard en `useKeyboardShortcuts` de Home (D-11) |
| Dos overlays (`SearchPalette` + find) | UI amontonada | D-10: cerrar el otro al abrir uno |
| `onReady` llega tarde | Primera búsqueda se pierde | Encolar query en el hook hasta que el handle exista |
| Buscar en bloque de código | Resultados incompletos o crash | Excluir en el recorrido del plugin (D-4) |

---

## Orden de ejecución

```
1. Motor en packages/ui: plugin + SearchHandle + registerSearch + estilos
   (specs del matcher; CrepeCanvas onReady; contraste medido)
        │
        ▼
2. useFindInPage + FindInPagePanel + montaje en Canvas.tsx
   (specs del panel, hook y subscribe)
        │
        ▼
3. Atajos (editor + home) + cadena Escape + menú + bridge + i18n
```

---

## Criterios de aceptación

### Motor

- [x] Escribir en el campo resalta coincidencias en el cuerpo ProseMirror (incluye código **inline**; excluye bloques `code_block`)
- [x] Matching insensible a mayúsculas y literal, sin regex (D-5)
- [x] No busca en bloques de código (D-4) ni en el título (D-3)
- [x] Sin coincidencias: `0 / 0` y sin resaltados
- [x] Editar el documento con el panel abierto recalcula el resaltado y clampea el índice activo si hace falta
- [x] `Enter` / `Shift+Enter` con wrap circular (D-9)
- [x] La coincidencia activa entra en el viewport al navegar
- [x] Funciona con comentarios activos sin romper sus decoraciones
- [ ] La coincidencia activa se distingue de las demás **y** de la selección normal, medido en claro y oscuro

### UI y atajos

- [x] `Cmd+F` abre el panel con foco en el campo; un segundo `Cmd+F` re-enfoca el campo si ya estaba abierto
- [x] Si hay texto seleccionado en el documento al abrir, el campo se pre-rellena y busca de inmediato
- [x] El panel es una fila compacta, `sticky` en la esquina superior derecha del canvas, **sin** backdrop — no compite con `SearchPalette`
- [x] Permanece visible al hacer scroll del documento (no se va con el contenido)
- [x] Contador `n / total` visible (`aria-live`); botones ↑↓ y cerrar funcionan
- [x] `Enter` en el input del panel navega (con `preventDefault`), no envía ningún formulario
- [x] `Escape` cierra el panel y limpia resaltados, **sin** cerrar la página
- [x] Al cambiar de página (`docPath`), el panel se cierra y limpia
- [x] En modo solo lectura el panel funciona (D-7)
- [x] Abrir find cierra un thread abierto sobre el canvas (D-6)

### Menú e integración

- [x] Edición → «Buscar en la página» (`Cmd+F`) abre el mismo panel que el atajo (con página abierta)
- [x] Sin página abierta: menú y `Cmd+F` no hacen nada y no disparan find de Chromium (D-11)
- [x] `Cmd+K` cierra find si estaba abierto; abrir find cierra `SearchPalette` (D-10)
- [x] `Cmd+K` sigue abriendo solo la biblioteca cuando find estaba cerrado

### Calidad

- [x] Specs: matcher del plugin, `FindInPagePanel`, cadena `Escape` en shortcuts
- [x] `npm test`, `npm run typecheck` y `npm run lint` sin errores nuevos
- [ ] **Pendiente en la app real:** caret al principio y al final de una coincidencia larga
- [ ] **Pendiente en VS Code:** motor heredado; UI find bar no incluida en v1 (D-8)

Sin test automático de layout: hace falta motor real para posición del panel y scroll. La suite corre en happy-dom; medir en Electron para placement y contraste.
