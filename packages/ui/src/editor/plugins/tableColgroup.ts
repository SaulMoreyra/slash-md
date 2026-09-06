import { Plugin } from "@milkdown/kit/prose/state";
import { $prose } from "@milkdown/kit/utils";
import type { Editor } from "@milkdown/kit/core";
import type { Node } from "@milkdown/kit/prose/model";
import type { EditorView } from "@milkdown/kit/prose/view";

type CellAttrs = { colspan: number; colwidth: number[] | null };

/**
 * Crepe monta su propio node view de tabla y desplaza al `TableView` de
 * prosemirror-tables, que era quien creaba el `<colgroup>`. Sin él:
 *
 * - `colwidth` nunca se pinta, así que redimensionar una columna no se ve.
 * - `displayColumnWidth` (prosemirror-tables) sube desde la celda hasta el
 *   `<table>` y usa `dom.firstChild` como si fuera el colgroup. Sin colgroup eso
 *   es el `<tbody>`: en cada `mousemove` del arrastre escribe anchos sobre los
 *   `<tr>` y **borra los sobrantes**. Una tabla de 2 columnas y 6 filas se queda
 *   en 2 hasta el siguiente repintado.
 *
 * Reponemos el `<colgroup>` sobre el DOM que Crepe ya montó. Va como primer hijo
 * del `<table>` porque es justo ahí donde lo busca `displayColumnWidth`.
 */
function syncColgroup(table: HTMLTableElement, node: Node): void {
  const first = table.firstElementChild;
  const colgroup =
    first instanceof HTMLTableColElement && first.tagName === "COLGROUP"
      ? first
      : table.insertBefore(document.createElement("colgroup"), table.firstChild);

  const row = node.firstChild;
  if (!row) {
    return;
  }

  let index = 0;
  for (let i = 0; i < row.childCount; i += 1) {
    const { colspan, colwidth } = row.child(i).attrs as CellAttrs;
    for (let span = 0; span < colspan; span += 1, index += 1) {
      const width = colwidth?.[span];
      const col = colgroup.children[index] ?? colgroup.appendChild(document.createElement("col"));
      const css = width ? `${width}px` : "";
      if (col instanceof HTMLElement && col.style.width !== css) {
        col.style.width = css;
      }
    }
  }

  while (colgroup.children.length > index) {
    colgroup.lastElementChild?.remove();
  }
}

function syncAllTables(view: EditorView): void {
  view.state.doc.descendants((node, pos) => {
    if (node.type.name !== "table") {
      return true;
    }
    const dom = view.nodeDOM(pos);
    if (dom instanceof HTMLElement) {
      // `table.children` es la tabla de contenido; la de `.drag-preview` no lleva esa clase.
      const table = dom.querySelector("table.children");
      if (table instanceof HTMLTableElement) {
        syncColgroup(table, node);
      }
    }
    return false; // las tablas no anidan
  });
}

export const tableColgroup = $prose(
  () =>
    new Plugin({
      view: (view) => {
        // Crepe monta el `<table>` desde Vue, que puede no haber pintado todavía.
        syncAllTables(view);
        const raf = requestAnimationFrame(() => syncAllTables(view));
        return {
          update: () => syncAllTables(view),
          destroy: () => cancelAnimationFrame(raf),
        };
      },
    })
);

export function registerTableColgroup(editor: Editor): void {
  editor.use(tableColgroup);
}
