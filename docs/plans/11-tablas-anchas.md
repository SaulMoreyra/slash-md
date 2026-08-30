# Plan 11 — Tablas anchas: scroll propio y columnas al contenido

> El bug de producción: una tabla con muchas columnas se aplasta, y lo que se sale de la página se recorta sin manera de alcanzarlo.

**Alcance:** `packages/ui/src/editor/theme.css`. Solo CSS. Aplica a desktop y a la extensión de VS Code (ambos importan el mismo theme).

---

## Diagnóstico

Tres hechos encadenados, verificados en el código instalado — no inferidos:

**1. El node view de Crepe desplaza al de prosemirror-tables.**
`@milkdown/components/src/table-block/view/view.ts` registra `TableNodeView` con `$view`, que aterriza en `nodeViewCtx` y de ahí a `Object.fromEntries(...)` como prop **directa** del `EditorView` (`@milkdown/core/src/internal-plugin/editor-view.ts:127`). En ProseMirror las props directas ganan sobre las de plugins, así que el `TableView` que registra `columnResizing()` (preset-gfm) nunca se usa.

**2. Sin ese `TableView` no hay `<colgroup>` ni `--default-cell-min-width`.** Era el único que los creaba (`prosemirror-tables/dist/index.js:2283-2291`). Sin ellos:

- `.ProseMirror td:not([data-colwidth]) { min-width: var(--default-cell-min-width) }` queda con una variable indefinida → declaración inválida → **sin ancho mínimo**.
- `.ProseMirror table { table-layout: fixed; width: 100% }` reparte el ancho **a partes iguales**. En `.page-inner` (`max-width: 50rem`, padding `3rem`) son ~730 px útiles: 8 columnas ≈ 90 px cada una, sin importar que una diga `sí` y otra un párrafo.

**3. El scroller no existe.** Crepe emite `<div class="table-wrapper">`; la regla de prosemirror es `.ProseMirror .tableWrapper { overflow-x: auto }` — **otro nombre de clase**, nunca aplica. Y `apps/desktop/src/styles.css:221` pone `html, body { overflow-x: clip }`, así que lo que sobra no se ve ni se alcanza.

### Comprobación headless

Montando una tabla de 8 columnas con el mismo arranque que `test/boot.mjs`:

```
has colgroup: false
has .table-wrapper: true
has .tableWrapper: false
table inline style: null
primera celda: <th style="text-align: left;"><p>Campo</p></th>
```

---

## Objetivo

Comportamiento Notion: cada columna toma el ancho de su contenido, con piso y techo, y la tabla scrollea horizontalmente **dentro de su propio marco** sin mover ni recortar el resto del documento.

```
┌ página ─────────────────────────┐
│ | Campo        | Tipo   | Requ… │
│ | nombre_com…  | string | sí  … │
│ ◀━━━━━━━ scroll ━━━━━━━━━━━━━━▶ │
└─────────────────────────────────┘
```

**Fuera de alcance:** el resize de columnas (→ [Plan 12](./12-tablas-resize-columnas.md)), el formato del `.md` en disco (→ [Plan 13](./13-tablas-markdown-estable.md)), header pegajoso al scrollear.

---

## El cambio

Un bloque nuevo en `theme.css`, junto a las demás reglas de `.milkdown .ProseMirror` (después de `hr`, antes de las reglas de `svg`):

```css
/* —— Tablas —— */
/* Crepe monta `.milkdown-table-block > div > .table-wrapper > table.children`.
   Su node view desplaza al de prosemirror-tables, así que no hay <colgroup>:
   sin él, `table-layout: fixed` reparte el ancho a partes iguales. Plan 11. */

.milkdown .milkdown-table-block .table-wrapper {
  position: relative;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  padding-left: 14px;   /* sitio para el botón «añadir fila» */
  padding-right: 2px;   /* absorbe el handle de «añadir columna» */
  margin-left: -14px;
}

.milkdown .milkdown-table-block table.children {
  table-layout: auto;
  width: max-content;
  min-width: 100%;
}

.milkdown .milkdown-table-block table.children :is(th, td) {
  min-width: 8ch;
  max-width: 40ch;
  overflow-wrap: anywhere;
}
```

> **Corregido al medir en Chromium.** El plan proponía el techo en el `<p>`
> (`:is(th, td) > p { max-width: 40ch }`). Eso rompe las columnas alineadas a la
> derecha: cuando `min-width: 100%` estira la tabla, la celda crece pero el `<p>`
> se queda en 40ch y el texto acaba **166 px corto** del borde. Con el techo en la
> celda, el `<p>` la llena (`rightGap: 17px` = el padding) y el tope sigue
> haciendo su trabajo: 403 px en vez de los 1208 px que mide sin tope.
>
> El `padding-right: 2px` tampoco estaba en el plan. El handle de «añadir columna»
> se sitúa en el borde derecho de la tabla y sobresale 1 px — suficiente para
> volver scrolleable hasta una tabla de dos columnas. No se arregla con
> `display: none`: `pointer.ts` lee el ancho del handle **mientras está oculto**
> para colocarlo, y con `display: none` leería 0.

### Por qué cada declaración

| Declaración | Qué arregla |
|---|---|
| `overflow-x: auto` en `.table-wrapper` | El scroller que nunca existió. Es el marco: la tabla se mueve dentro, el documento no |
| `position: relative` en `.table-wrapper` | Los handles de línea («añadir fila/columna») viven dentro del wrapper con `position: absolute`. Sin un ancestro posicionado su bloque contenedor es `.page` → ni se recortan ni scrollean con la tabla, y quedan dibujados sobre contenido ajeno |
| `padding-left` + `margin-left` negativo | El botón de añadir fila lleva `translateX(-50%)`; el scroller lo cortaría por la mitad. El margen negativo entra en el padding de `.page-inner` (48 px), así que no desborda la página |
| `table-layout: auto` | Vence a `table-layout: fixed` de prosemirror-tables (especificidad 0,2,1 vs 0,1,1). Devuelve el dimensionado por contenido |
| `width: max-content` + `min-width: 100%` | Ancha cuando el contenido lo pide (y entonces scrollea); a página completa cuando cabe |
| `min-width: 8ch` en celdas | Piso legible: una columna de `sí`/`no` no colapsa a nada |
| `overflow-wrap: anywhere` | Una URL larga ya no fija sola el ancho de su columna |
| `max-width: 40ch` en la celda | Techo: acota la contribución max-content de la columna. En la celda y no en el `<p>` — ver la nota de arriba |
| `padding-right: 2px` | El handle de «añadir columna» sobresale 1 px y volvía scrolleable cualquier tabla |
| `table.children` (no `table`) | Excluye la tabla fantasma de `.drag-preview`, que también vive dentro de `.table-wrapper` |

---

## Qué puede salir mal

| Fallo | Riesgo | Qué hacer |
|---|---|---|
| El botón «añadir fila» sale cortado | Se pierde la acción de insertar filas | El colchón `padding-left: 14px / margin-left: -14px`. Verificar a ojo en `desktop:dev`; subir a 20 px si sigue cortado |
| Los handles de arrastre quedan desfasados al scrollear | Arrastras la columna equivocada | `position: relative` en el wrapper. Los handles usan `computePosition` de floating-ui, que recalcula contra el `offsetParent` en cada `pointermove` — se adapta solo |
| Los handles de fila/columna (`.cell-handle`) siguen anclados a `.page` | Flotan sobre contenido ajeno con la página scrolleada | Están **fuera** del wrapper (hermanos, dentro del root de Vue). Si se ve mal, añadir `position: relative` a `.milkdown-table-block > div`. No incluido de entrada: hoy no está roto |
| `40ch` corta texto que el usuario quiere ver entero | Columnas de descripción se vuelven altas | Es techo de ancho, no de contenido: el texto envuelve, no se recorta. Ajustable en un solo sitio |
| `overflow-wrap: anywhere` parte palabras a media sílaba | Se ve feo en columnas estrechas | Solo actúa cuando la palabra no cabe; antes de esto la palabra desbordaba la celda |
| El scroller anida con el scroll vertical de `.page` | Trackpad diagonal roba el scroll de la página | `overscroll-behavior-x: contain` |
| La tabla del `.drag-preview` hereda el ancho | Fantasma deformado al arrastrar | Selector `table.children`; el preview es `.drag-preview > table` |
| En VS Code se ve distinto | El theme es compartido | Revisar también en la extensión antes de cerrar el plan |

---

## Cómo verificarlo

```bash
npm run test          # round-trip: no debe moverse nada (este plan no toca markdown)
npm run lint
npm run desktop:dev   # y abrir un .md con la tabla de prueba
```

Tabla de prueba (8 columnas, contenido desigual):

```markdown
| Campo | Tipo | Requerido | Descripción larga de la columna | Default | Notas adicionales | Owner | Estado |
| --- | --- | :-: | --- | --- | --- | --- | ---: |
| nombre_completo_del_usuario | string | sí | El nombre completo tal como aparece en la identificación oficial | vacío | Se valida contra el RFC | equipo-kyc | activo |
| fecha | date | no | Fecha de alta del registro en el sistema | hoy | ninguna | plataforma | activo |
```

---

## Criterios de aceptación

Medidos en Chromium real (Electron, `show: false`) sobre el DOM exacto que monta Crepe, con `theme.css` bundleado por esbuild. Ventana 1200 px, columna de editor 1000 px, `.page-inner` a `50rem` con `padding: 2.5rem 3rem` — igual que el desktop.

- [x] Las columnas se miden por contenido — **257 / 88 / 113 / 403 / 89 / 200 / 115 / 88 px**, no ocho iguales de ~90
- [x] La tabla scrollea horizontalmente dentro de su marco — `scrollWidth 1400 > clientWidth 718`
- [x] El resto del documento no se mueve ni se recorta — `document.scrollWidth - clientWidth === 0`
- [x] El botón «añadir fila» se ve completo — 37 px de holgura por la izquierda, borde derecho dentro
- [x] Una columna alineada a la derecha llega hasta el borde de su celda — `gap 17px` = el `padding: 4px 16px`
- [x] Una tabla de 2 columnas ocupa el ancho de la página y **no** scrollea — 702 px de 702 disponibles
- [x] Una celda con una URL de 200 caracteres no ensancha la tabla — se queda en 702 px, sin desbordar
- [x] `npm run test` en verde (exit 0); round-trip de las 10 fixtures intacto
- [ ] **Pendiente en la app real:** hover sobre una celda coloca los handles de fila y columna en su sitio, también con la tabla scrolleada
- [ ] **Pendiente en la app real:** mismo resultado en la extensión de VS Code

Los dos pendientes necesitan el editor corriendo (`npm run desktop:dev`): dependen de `computePosition` de floating-ui reaccionando a `pointermove`, que un fixture estático no ejerce.

### Nota sobre `npm run lint`

Reporta 3 errores en `apps/desktop/scripts/brand-electron.mjs` (`'process' is not defined`). Son **previos a este plan**: salen idénticos con el cambio guardado en stash. No los toco aquí.
