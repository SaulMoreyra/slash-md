# Plan 12 — Resize de columnas: devolver el `<colgroup>`

> Arrastrar el borde de una columna no hace nada. El ancho sí se guarda; nadie lo pinta.

**Depende de:** [Plan 11](./11-tablas-anchas.md) (comparten el bloque CSS de tablas).
**Alcance:** `packages/ui/src/editor/plugins/tableColgroup.ts` (nuevo) + registro en `packages/ui/src/editor/core/crepe.ts`.

---

## Diagnóstico

`columnResizing()` de preset-gfm **sí corre**: pinta la decoración del handle, atiende `mousedown` y escribe el atributo `colwidth` en la celda, que llega al DOM como `data-colwidth` (`prosemirror-tables/dist/index.js:256`). Lo que falta es el último eslabón: **`colwidth` solo se convierte en ancho real dentro del `<colgroup>`**, y ese `<colgroup>` lo creaba el `TableView` que el node view de Crepe desplaza (ver el diagnóstico completo en el Plan 11).

Resultado: arrastras, el documento cambia, la pantalla no. Y como cada guardado re-serializa a Markdown —que no tiene anchos de columna— el ajuste tampoco sobrevive a recargar.

### Y hay algo peor que «no hace nada»

`displayColumnWidth` (`prosemirror-tables/dist/index.js:2546`) sube desde la celda hasta el `<table>` y **asume que el primer hijo es el `<colgroup>`**:

```js
let dom = view.domAtPos($cell.start(-1)).node;
while (dom && dom.nodeName != "TABLE") dom = dom.parentNode;
updateColumnsOnResize(table, dom.firstChild, dom, defaultCellMinWidth, col, width);
```

Sin colgroup, `dom.firstChild` es el **`<tbody>`**. `updateColumnsOnResize` entonces recorre los `<tr>` como si fueran `<col>`, les escribe `style.width`, y al terminar **borra todos los sobrantes**. Esto corre en cada `mousemove` del arrastre.

Medido con la función real de prosemirror-tables sobre el DOM de Crepe, tabla de 2 columnas y 6 filas:

```
antes:   A B fila1 x fila2 x fila3 x fila4 x fila5 x    (6 filas)
después: A B fila1 x                                     (2 filas)
```

Cuatro filas desaparecen de la pantalla hasta el siguiente repintado de ProseMirror. Es muy probable que esto sea parte de lo que se vive como «la tabla se desacomoda».

> **Declarado por adelantado:** el ancho de columna **no se persiste**. Markdown no tiene dónde guardarlo. Este plan hace que el resize funcione durante la sesión; al reabrir el archivo las columnas vuelven a medirse por contenido (Plan 11). Persistirlo exigiría metadata fuera del estándar y queda fuera.

---

## Dos caminos

**A — Registrar nuestro propio `$view` para `table`.** `nodeViewCtx` se colapsa con `Object.fromEntries`, así que el último registrado gana: podríamos desplazar a Crepe igual que Crepe desplazó a prosemirror. El costo es perder el componente Vue de Crepe entero — handles de arrastre, botones de alineación, añadir/borrar fila y columna — y tener que reimplementarlo. **Descartado:** demasiada superficie para recuperar un `<colgroup>`.

**B — Sincronizar el `<colgroup>` sobre el DOM que Crepe ya montó.** Un plugin de ProseMirror pequeño que, en cada `update`, recorre las tablas del documento y llama a `updateColumnsOnResize` — que `@milkdown/kit/prose/tables` exporta público (verificado: `updateColumnsOnResize` está en el `.d.ts` y en el bundle ESM). **Elegido.**

---

## El cambio

### 1. `packages/ui/src/editor/plugins/tableColgroup.ts` (nuevo)

Un plugin de ProseMirror que, en cada `update`, recorre las tablas del documento y repone el `<colgroup>` **como primer hijo** del `<table>` —que es justo donde lo busca `displayColumnWidth`— con un `<col>` por columna y su `style.width` cuando la celda tiene `colwidth`.

> **Desviación del plan.** El plan decía reutilizar `updateColumnsOnResize` de `@milkdown/kit/prose/tables`. No lo usamos: además del colgroup, esa función escribe `width`/`min-width` **inline sobre el `<table>`**, y ese `min-width` es la suma de anchos de columna. En una tabla angosta vale menos que el `100%` del Plan 11, así que la encogía. Escribir el colgroup nosotros (20 líneas) evita el efecto secundario. La función sigue corriendo durante el arrastre —eso no lo controlamos— y por eso hace falta el punto 2.

### 2. Registro en `packages/ui/src/editor/core/crepe.ts`

```ts
registerCallout(builder.editor);
registerToggle(builder.editor);
registerEmptyTaskList(builder.editor);
registerTableColgroup(builder.editor);   // ← nuevo
```

### 3. `theme.css`: neutralizar el ancho inline del arrastre

```css
.milkdown .milkdown-table-block table.children {
  table-layout: auto;
  width: max-content !important;
  min-width: 100% !important;
}
```

> **Tampoco estaba en el plan.** `!important` a propósito, y medido: durante el arrastre `displayColumnWidth` escribe `min-width` inline en el `<table>`. Sin `!important`, una tabla de 2 columnas se encogía de **702 px a 200 px** y dejaba de llenar la página en cuanto tocabas una columna. Los `<col>` del colgroup siguen mandando sobre cada columna; lo único que neutralizamos es el ancho de la tabla entera.

### CSS: qué **no** cambia

`table-layout` se queda en `auto`. Con `auto`, el ancho de un `<col>` es una sugerencia fuerte que el navegador respeta salvo que el contenido mínimo no quepa. Medido: un `<col style="width: 300px">` da exactamente **300 px**, y las demás columnas siguen midiéndose por contenido (`88 / 113 / 403 / …`). Es la combinación que queremos:

- columna sin tocar → ancho por contenido (Plan 11)
- columna arrastrada → el ancho que pediste

El precio, declarado: una columna no baja de su ancho min-content. Con `overflow-wrap: anywhere` (Plan 11) ese piso es pequeño, así que en la práctica se encoge.

---

## Qué puede salir mal

| Fallo | Riesgo | Qué hacer |
|---|---|---|
| `sync` en cada `update` es caro | Se traba al escribir en documentos con muchas tablas | `updateColumnsOnResize` ya es idempotente y solo escribe si el valor cambió. Si aun así pesa, cortar por `node === prev` antes de tocar el DOM |
| Crepe re-renderiza y borra nuestro `<colgroup>` | El resize deja de verse a mitad de sesión | El `update` del plugin corre después de cada transacción y lo repone. Verificar con el caso «arrastrar y luego escribir en otra celda» |
| El `<colgroup>` confunde al `contentDOM` de Crepe | ProseMirror pierde el mapeo de posiciones | El `contentDOM` es el `<tbody>`; el `<colgroup>` va como primer hijo del `<table>`, hermano del `tbody`. Es la misma estructura que monta `TableView`. Si aparece ruido, `ignoreMutation` ya cubre mutaciones sobre el colgroup en el view de Crepe (`view.ts`) |
| Tocamos también la tabla del `.drag-preview` | Fantasma deformado al arrastrar | Buscar el `table.children` dentro del `.milkdown-table-block`, no el primer `table` que aparezca |
| El ancho no sobrevive a recargar | El usuario cree que se rompió otra vez | Ya declarado arriba. Si molesta, es una decisión de producto aparte, no un bug de este plan |
| `view.nodeDOM(pos)` devuelve `null` durante el montaje | Excepción en el primer render | Salir sin hacer nada si es `null`; el siguiente `update` lo repone |

---

## Cómo verificarlo

Además de lo del Plan 11, una aserción en `test/integration/crepeRoundtrip.ts` (junto a la de checkboxes, mismo patrón):

```ts
// tabla montada → el <colgroup> existe y tiene una <col> por columna
assert(host.querySelectorAll("colgroup > col").length === 8, "table renders a colgroup");
```

Y a mano en `npm run desktop:dev`:

1. Arrastrar el borde entre dos columnas → la columna cambia de ancho **mientras** arrastras
2. Escribir en otra celda → el ancho no se pierde
3. Añadir una columna → la nueva aparece con ancho por contenido, las demás conservan el suyo
4. Borrar una columna → no queda una `<col>` huérfana

---

## Criterios de aceptación

Medido con la función real de prosemirror-tables (`updateColumnsOnResize`) sobre el DOM que monta Crepe, en Chromium (Electron), simulando lo que hace `displayColumnWidth` en un arrastre.

| | Sin colgroup (antes) | Con colgroup (ahora) |
|---|---|---|
| Filas tras arrastrar (tabla 2×6) | 6 → **2** | 6 → **6** |
| Contenido | `AB fila1 x` — 4 filas perdidas | íntegro |
| Ancho pedido de 300 px | 200 px (ignorado) | **300 px** |
| Tabla angosta tras arrastrar | 702 → 200 px | **702 px** |

- [x] Arrastrar una columna ya no borra filas del DOM — el fallo que el plan no había visto
- [x] El ancho pedido se aplica: `<col style="width: 300px">` da 300 px exactos
- [x] Las columnas sin tocar siguen midiéndose por contenido — `88 / 113 / 403 / …`
- [x] Una tabla angosta sigue llenando la página después de arrastrar (gracias al `!important`)
- [x] El `<colgroup>` es el primer hijo del `<table>`, con un `<col>` por columna — aserción en `test/integration/crepeRoundtrip.ts`
- [x] El colgroup no altera las filas ni se serializa a Markdown — aserciones en la misma suite
- [x] Los 8 criterios del Plan 11 siguen en verde tras añadir el `!important`
- [x] `npm test` exit 0 · `npm run typecheck` exit 0 · `npm run lint` sin errores nuevos (los 3 de `brand-electron.mjs` son previos)
- [ ] **Pendiente en la app real:** arrastrar el borde con el ratón y ver la columna moverse en vivo
- [ ] **Pendiente en la app real:** añadir y borrar columnas mantiene el `<colgroup>` cuadrado
- [ ] **Pendiente en la app real:** la tabla fantasma del arrastre se ve igual que antes

Los tres pendientes necesitan el ratón: `displayColumnWidth` solo corre desde un `mousedown` real sobre el handle de resize.

### Declarado: el ancho no se persiste

Markdown no tiene dónde guardar anchos de columna. Al reabrir el archivo, las columnas vuelven a medirse por contenido (Plan 11). No es un bug de este plan.
