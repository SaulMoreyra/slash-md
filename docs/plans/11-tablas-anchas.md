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
  /* El botón «añadir fila» cuelga medio cuerpo fuera del borde izquierdo:
     sin este colchón el scroller lo recorta. */
  padding-left: 14px;
  margin-left: -14px;
}

.milkdown .milkdown-table-block table.children {
  table-layout: auto;
  width: max-content;
  min-width: 100%;
}

.milkdown .milkdown-table-block table.children :is(th, td) {
  min-width: 8ch;
  overflow-wrap: anywhere;
}

/* Techo de crecimiento por columna: sin esto una celda con un párrafo largo
   se lleva la tabla a 3000 px. El <p> es el hijo directo que emite Crepe. */
.milkdown .milkdown-table-block table.children :is(th, td) > p {
  max-width: 40ch;
}
```

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
| `max-width: 40ch` en el `<p>` | Techo: acota la contribución max-content de la celda, que es lo que suma `width: max-content` |
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

- [ ] La tabla de prueba muestra `sí`/`no` en columnas estrechas y la descripción en una ancha — no ocho columnas iguales
- [ ] La tabla scrollea horizontalmente dentro de su marco; el resto del documento no se mueve
- [ ] Ninguna parte de la tabla queda inalcanzable (nada recortado por `overflow-x: clip` del body)
- [ ] Hover sobre una celda muestra los handles de fila y columna en el sitio correcto, también con la tabla scrolleada
- [ ] El botón «añadir fila» se ve completo
- [ ] Una tabla de 2 columnas sigue ocupando el ancho de la página (`min-width: 100%`)
- [ ] Una celda con una URL de 200 caracteres no ensancha la tabla más allá de `40ch`
- [ ] Mismo resultado en la extensión de VS Code
- [ ] `npm run test` y `npm run lint` en verde
