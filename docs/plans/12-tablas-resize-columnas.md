# Plan 12 — Resize de columnas: devolver el `<colgroup>`

> Arrastrar el borde de una columna no hace nada. El ancho sí se guarda; nadie lo pinta.

**Depende de:** [Plan 11](./11-tablas-anchas.md) (comparten el bloque CSS de tablas).
**Alcance:** `packages/ui/src/editor/plugins/tableColgroup.ts` (nuevo) + registro en `packages/ui/src/editor/core/crepe.ts`.

---

## Diagnóstico

`columnResizing()` de preset-gfm **sí corre**: pinta la decoración del handle, atiende `mousedown` y escribe el atributo `colwidth` en la celda, que llega al DOM como `data-colwidth` (`prosemirror-tables/dist/index.js:256`). Lo que falta es el último eslabón: **`colwidth` solo se convierte en ancho real dentro del `<colgroup>`**, y ese `<colgroup>` lo creaba el `TableView` que el node view de Crepe desplaza (ver el diagnóstico completo en el Plan 11).

Resultado: arrastras, el documento cambia, la pantalla no. Y como cada guardado re-serializa a Markdown —que no tiene anchos de columna— el ajuste tampoco sobrevive a recargar.

> **Declarado por adelantado:** el ancho de columna **no se persiste**. Markdown no tiene dónde guardarlo. Este plan hace que el resize funcione durante la sesión; al reabrir el archivo las columnas vuelven a medirse por contenido (Plan 11). Persistirlo exigiría metadata fuera del estándar y queda fuera.

---

## Dos caminos

**A — Registrar nuestro propio `$view` para `table`.** `nodeViewCtx` se colapsa con `Object.fromEntries`, así que el último registrado gana: podríamos desplazar a Crepe igual que Crepe desplazó a prosemirror. El costo es perder el componente Vue de Crepe entero — handles de arrastre, botones de alineación, añadir/borrar fila y columna — y tener que reimplementarlo. **Descartado:** demasiada superficie para recuperar un `<colgroup>`.

**B — Sincronizar el `<colgroup>` sobre el DOM que Crepe ya montó.** Un plugin de ProseMirror pequeño que, en cada `update`, recorre las tablas del documento y llama a `updateColumnsOnResize` — que `@milkdown/kit/prose/tables` exporta público (verificado: `updateColumnsOnResize` está en el `.d.ts` y en el bundle ESM). **Elegido.**

---

## El cambio

### `packages/ui/src/editor/plugins/tableColgroup.ts`

```ts
import { Plugin } from "@milkdown/kit/prose/state";
import { updateColumnsOnResize } from "@milkdown/kit/prose/tables";
import { $prose } from "@milkdown/kit/utils";
import type { Editor } from "@milkdown/kit/core";

/** Ancho de reparto para columnas sin `colwidth` propio. */
const DEFAULT_CELL_MIN_WIDTH = 120;

// Crepe monta su propio node view de tabla y deja fuera al de prosemirror-tables,
// que era quien creaba el <colgroup>. Sin él `colwidth` no se pinta y el resize
// de columnas no hace nada. Aquí lo reponemos sobre el DOM que Crepe ya montó.
export const tableColgroup = $prose(() => new Plugin({
  view: (view) => {
    const sync = () => {
      view.state.doc.descendants((node, pos) => {
        if (node.type.name !== "table") {
          return true;
        }
        const dom = view.nodeDOM(pos);
        // ... localizar `table.children` dentro del .milkdown-table-block,
        //     crear el <colgroup> si falta (siempre como primer hijo),
        //     y llamar updateColumnsOnResize(node, colgroup, table, DEFAULT_CELL_MIN_WIDTH)
        return false; // las tablas no anidan
      });
    };
    sync();
    return { update: sync };
  },
}));

export function registerTableColgroup(editor: Editor): void {
  editor.use(tableColgroup);
}
```

### `packages/ui/src/editor/core/crepe.ts`

Junto a los demás `register*`, después de `await builder.create()` no — **antes**, con el resto:

```ts
registerCallout(builder.editor);
registerToggle(builder.editor);
registerEmptyTaskList(builder.editor);
registerTableColgroup(builder.editor);   // ← nuevo
```

### CSS: qué **no** cambiar

El Plan 11 deja `table-layout: auto`. **Se queda así.** Con `auto`, el ancho de un `<col>` es una sugerencia fuerte que el navegador respeta salvo que el contenido mínimo no quepa. La combinación resultante es la que queremos:

- columna sin tocar → ancho por contenido (Plan 11)
- columna arrastrada → el ancho que pediste

El precio, declarado: una columna no baja de su ancho min-content. Con `overflow-wrap: anywhere` (Plan 11) ese piso es pequeño, así que en la práctica se encoge. Volver a `table-layout: fixed` daría exactitud milimétrica pero devolvería el reparto a partes iguales en cuanto una columna quede sin `colwidth` — que es exactamente el bug del Plan 11.

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

- [ ] Arrastrar el borde de una columna la redimensiona en pantalla
- [ ] El ancho sobrevive a seguir escribiendo en la tabla
- [ ] Añadir y borrar columnas mantiene el `<colgroup>` con el número correcto de `<col>`
- [ ] Las columnas sin tocar siguen midiéndose por contenido (no vuelve el reparto a partes iguales)
- [ ] La tabla fantasma del arrastre se ve igual que antes
- [ ] El round-trip a Markdown no cambia (los anchos no se serializan)
- [ ] `npm run test` y `npm run lint` en verde
