# Plan 18 — Resize del ancho del editor

> Hoy la página del editor tiene un ancho fijo (`.page-inner`, por defecto 800px con fallback `--home-measure: 50rem`). No hay forma de ajustar el ancho del área de escritura; la tabla-resize de [Plan 12](./12-tablas-resize-columnas.md) ya demostró el patrón de "wells + drag + persistencia" en la app.

**Alcance (v1):**

| Capa | Archivos |
|---|---|
| Motor/UI | `apps/desktop/src/screens/editor/components/PageResizer/` (componente nuevo) |
| Hook de dominio | `apps/desktop/src/screens/editor/hooks/usePageWidth.ts` |
| Composición | `…/hooks/useEditorController.ts` (namespace `resize`), `…/hooks/index.ts` |
| Montaje | `…/components/Editor/components/Canvas.tsx` (`#page`) |
| Estilos | `apps/desktop/src/styles.css` (`.page-inner`, `.page-resize-well`) |
| i18n | `apps/desktop/src/i18n/locales/{es,en}.json` |

**Fuera de alcance v1:** guardar el ancho por *página* (se guarda por usuario en `localStorage`), barra de tamaño en el header/panel de propiedades, ancho variable para el lado de VS Code, `max-width` mayor que el contenedor.

---

## Lo que ya existe

| Pieza | Dónde | Qué hace |
|---|---|---|
| `PageResizer` | `screens/editor/components/PageResizer/` | **Nuevo.** Wells laterales `role="separator"` + controller |
| `usePageWidth` | `screens/editor/hooks/usePageWidth.ts` | Estado de ancho + persistencia en `localStorage` |
| Estilos `.page-inner` | `styles.css:476` | `width: var(--page-measure, auto)`; `max-width: min(var(--page-measure, var(--home-measure)), 100%)` |
| `#page` (canvas) | `Canvas.tsx:30` | Contenedor scrollable del contenido; `position: relative` vía CSS |

Patrón previo: la **persistencia de anchos de columna** del Plan 12 (`pkg/slashmd`/tablas) y mapeado de teclas con `localStorage` como en `useKeyboardShortcuts`.

---

## Objetivo

Arr** que el usuario pueda arrastrar el borde izquierdo/derecho de la página para ajustar el ancho del área de escritura, con doble clic para restaurar el ancho por defecto, en el mismo espíritu que Notion/Google Docs.

El ancho:

1. Se limita a `[320, min(640, contenedor - 24)]` (ver D-2).
2. Se aplica al instante durante el arrastre vía `--page-measure` sobre `#page` (sin re-render por píxel).
3. Se persiste por usuario en `localStorage` (`slashmd:editorWidth`) al soltar.
4. Se restaura con doble clic (800px por defecto).

---

## Piezas

### 1. Constantes y utilidades — `PageResizer/utils.ts`

```ts
export const PAGE_WIDTH_DEFAULT = 800;
export const PAGE_WIDTH_MIN = 320;
export const PAGE_WIDTH_GUTTER = 24; // margen min. del contenedor para bienes laterales
export const PAGE_WIDTH_STORAGE_KEY = "slashmd:editorWidth";
export const PAGE_WIDTH_STORAGE_CAP = 8192; // colchón por caracteres de la clave

export type ResizeEdge = "left" | "right";
export function clampWidth(w: number, max: number): number
export function edgeMaxWidth(containerWidth: number): number
export function nextWidth(edge: ResizeEdge, start: number, delta: number): number
export function applyPageMeasure(el: HTMLElement, width: number): void
```

- `applyPageMeasure` escribe `el.style.setProperty("--page-measure", \`${Math.round(width)}px\`)` — **no** React state por píxel.
- `nextWidth`: izquierda → `start - delta`; derecha → `start + delta`.

### 2. Controller — `PageResizer/hooks/usePageResizeController.ts`

Mismo esqueleto que el resize de columnas del Plan 12:

- `onPointerDown`: `preventDefault`, `setPointerCapture`, guarda `startX` / `startWidth`, marca `dragging`.
- `onPointerMove`: si `dragging`, `delta = ev.clientX - startX`, `applyPageMeasure` con `clamp(next, max)`.
- `onPointerUp`: si `|delta| < 4` → clic; sino `onCommit`.
- `onPointerCancel` / `Escape`: restaurar `startWidth`.
- `onDoubleClick`: `onReset()`.

Handlers por well vía `getWellProps(edge)` — cada well recibe `is-active` cuando `dragging === edge`.

### 3. Estado + persistencia — `usePageWidth.ts`

```ts
export function usePageWidth({ containerRef }: Params) {
  // read parametrizado (SSR-safe-case), state width, onCommit(calmb), onReset, onAssign
}
```

- Lectura inicial: `Number(localStorage.getItem(KEY))` si es `PAGE_WIDTH_MIN..640`; sino `PAGE_WIDTH_DEFAULT`.
- `onCommit`: setState + persistir.
- `onReset`: 800 + persistir (no solo volver en DOM).
- Expone `hasRoom` (¿cabe el mínimo + gutters?), `width`, `containerRef`.

### 4. Componente — `PageResizer/PageResizer.tsx`

```tsx
<div role="separator" className={`page-resize-well is-left${active ? " is-active" : ""}`} {...getWellProps("left")} />
<div role="separator" className={`page-resize-well is-right${active ? " is-active" : ""}`} {...getWellProps("right")} />
```

Montado como hijo directo de `#page` (invariante del CSS, ver §5).

### 5. CSS — `styles.css`

```css
#page.page { position: relative; } /* contenedor de los wells y ancestro de .page-inner */

#page .page-inner {
  width: var(--page-measure, auto);
  max-width: min(var(--page-measure, var(--home-measure)), 100%);
  margin: 0 auto;
  padding: 2.5rem 3rem 8rem;
}

#page .page-resize-well {
  position: absolute; top: 0; bottom: 0; width: 10px; z-index: 6;
  cursor: col-resize; touch-action: none;
}
#page .page-resize-well.is-left  { left: calc(50% - var(--page-measure)/2 - 8px); }
#page .page-resize-well.is-right { left: calc(50% + var(--page-measure)/2 - 2px); }
#page .page-resize-well::before { … 2px strip, transparent; hover/is-active → accent }
```

> **Lección (crucial):** los selectores se fijan en `#page` (**no** `.editor-shell`). `.editor-shell` no existe en el DOM desde la migración a la pantalla React — los estilos que lo usaban no aplicaban y los wells se renderizaban como bloques anónimos full-width/h:0. Verificado en el smoke real (sección [Verificación en Electron](#verificación-en-electron)).

Posicionar wells **relativo a `#page`**, no a `.page-inner`: `.page-inner` tiene `padding-inline` y su box no coincide con el ancho del área de escritura; `#page` es el scroll container y el host de `--page-measure`.

### 6. Composición — `useEditorController.ts` + montaje

- Hook expone namespace `resize` (mismo patrón que `editor`, `threads`, `comments`, `find`).
- `Canvas.tsx`:

```tsx
<div ref={resize.containerRef} style={{ "--page-measure": \`${resize.width}px\` } as CSSProperties}
     className={pageClass} id="page">
  <PageResizer visible={resize.hasRoom} width={resize.width}
               containerRef={resize.containerRef}
               onCommit={resize.onCommit} onReset={resize.onReset} />
```

### 7. i18n

Claves `editor.pageResize.resize` / `.reset` en `es.json` / `en.json` para `aria-label` de cada well.

---

## Decisiones (cerradas para v1)

| ID | Pregunta | Decisión | Razón |
|---|---|---|---|
| **D-1** | ¿Doble clic en qué well? | **Cualquiera de los dos** | Restaura el mismo ancho por defecto |
| **D-2** | ¿Rango de ancho? | `[320, min(640, contenedor - 24)]` | `640px` = máximo confortable de lectura; `24px` = gutters laterales mínimos |
| **D-3** | ¿Persistencia por página o por usuario? | **Por usuario** (clave única en `localStorage`) | Simplicidad v1; por-página pediría clave por `page.path` |
| **D-4** | ¿Dónde viven los wells relativo a? | `position: absolute` sobre `#page` | Escala con el scroll container; independiente del padding de `.page-inner` |
| **D-5** | ¿Aplicar por píxel con re-render? | **No** — CSS var + `setProperty` | Evita re-render por `pointermove`; típico de resize en apps desktop |
| **D-6** | ¿Quién persiste al reset? | `onReset` persiste 800 | El usuario espera que el doble clic sea un cambio permanente |
| **D-7** | ¿Atajo de teclado v1? | **No** | Fuera de alcance; ya hay muchos atajos y este es secundario |

---

## Qué puede salir mal

| Fallo | Riesgo | Qué hacer |
|---|---|---|
| Selector CSS sin match (`.editor-shell`) | Wells invisibles/sin geometría (w=a todo el contenedor, h:0) | Scope en `#page`; verificación de geometría con wells reales en el smoke |
| `pointermove` que no llega | Drag muerto | React escucha en root; dispatch sobre el well, no `window` (lección del smoke) |
| Persistir NaN / fuera de rango | Ancho roto en el próximo arranque | Validar en `usePageWidth` al leer: `Number.isFinite` + rango `[MIN, MAX]` |
| Re-render por píxel al arrastrar | Jank en docs grandes | `applyPageMeasure` sin estado; `setPointerCapture` en el well |
| Tabla/otro widget capturando eventos | Drag se cuela | `preventDefault` en pointerdown; `touch-action: none` en el well |
| `max-width: 100%` rompe en ventanas estrechas | La página se sale del canvas | `edgeMaxWidth(el.clientWidth)` capa el ancho al contenedor menos gutters |

---

## Orden de ejecución

```
1. utils + controller + PageResizer.tsx (specs unitarios del controller y utils)
        │
        ▼
2. usePageWidth + composición en useEditorController + montaje en Canvas.tsx
   (specs del hook: lectura/persistencia/reset; artículo en #page con CSS var)
        │
        ▼
3. estilos en styles.css + i18n en es/en
        │
        ▼
4. Verificación en Electron (smoke-shot + exfil de DOM)
```

## Verificación en Electron

El smoke real confirmó **geometría y comportamiento** (no solo que el código compila):

| Fase | Reporte exfil (`/read`) |
|---|---|
| Antes | `{"pageInnerW":800,"cssMeasure":"800px","stored":null,"wells":[{is-left,x:358,w:10,h:689},{is-right,x:1164,w:10,h:689}]}` |
| Tras drag +180px | `{"pageInnerW":922,"cssMeasure":"922px","stored":"922","wells":[{x:297},{x:1225}]}` |
| Tras doble clic | `{"pageInnerW":800,"cssMeasure":"800px","stored":"800","wells":[{x:358},{x:1164}]}` |

- Wells: tiras verticales finas (w:10, h:689) ancladas a los bordes de la página → **los selectores `#page …` aplican**.
- `pageInnerW` **sigue** a `--page-measure` (800 → 922 → 800) y `stored` persiste con el mismo valor → **drag + persistencia + reset OK**.
- El pasaje a `.editor-shell` (no existía en el DOM) dejaba `pageInnerW:900` fijo y wells sin estilo; la corrección de selectores fue el cambio que destrabó la verificación.

---

## Criterios de aceptación

- [x] Arrastrar un well ajusta el ancho `.page-inner` en vivo (`--page-measure` sobre `#page`)
- [x] Al soltar, el ancho se persiste en `localStorage` bajo `slashmd:editorWidth`
- [x] Doble clic en cualquier well restaura 800px y persiste
- [x] `Escape` durante el arrastre cancela y devuelve al ancho original
- [x] El ancho nunca cae por debajo de `320px` ni supera `min(640px, contenedor - 24px)`
- [x] Wells ocultos cuando `hasRoom` es falso (ventana demasiado estrecha)
- [x] Aplicación de `--page-measure` durante el arrastre **sin** re-render por píxel (`setProperty`)
- [x] `npm test`, `npm run typecheck` y `npm run lint` sin errores nuevos (suite: 90 archivos / 441 tests; resize: 20 tests)
- [x] Verificado en Electron real: geometría de wells, ancho de `.page-inner` siguiendo al CSS var, y persistencia (smoke + exfil)

Sin test automático de layout (la suite corre en happy-dom); la geometría real se valida en Electron con el smoke-shot + exfil de reportes DOM.