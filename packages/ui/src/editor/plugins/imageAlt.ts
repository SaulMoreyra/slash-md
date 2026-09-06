import { IMAGE_DATA_TYPE, imageBlockSchema } from "@milkdown/kit/component/image-block";
import type { Editor } from "@milkdown/kit/core";

/**
 * El schema `image-block` de Milkdown no tiene atributo `alt`: usa la ranura
 * `alt` del markdown para persistir el `ratio` de la imagen, así que
 * `![Slash MD icon](x.png)` se guarda como `![1.00](x.png)` y el texto que
 * escribió una persona se pierde en el primer guardado.
 *
 * Markdown solo da tres ranuras y Milkdown ya gasta dos (`url` = src,
 * `title` = caption), así que preservar el `alt` implica dejar de persistir el
 * `ratio`. Decisión D-2 en docs/plans/14-imagen-alt.md: el `alt` lo escribe una
 * persona, GitHub lo respeta y es accesibilidad; el `ratio` sale de arrastrar,
 * GitHub lo ignora y se vuelve a arrastrar. Redimensionar sigue funcionando
 * dentro de la sesión; lo que no sobrevive es recargar el archivo.
 */
export const imageBlockWithAlt = imageBlockSchema.extendSchema((prev) => (ctx) => {
  const base = prev(ctx);

  return {
    ...base,
    attrs: {
      ...base.attrs,
      alt: { default: "", validate: "string" },
    },
    parseDOM: [
      {
        tag: `img[data-type="${IMAGE_DATA_TYPE}"]`,
        getAttrs: (dom) => {
          if (!(dom instanceof HTMLElement)) {
            return false;
          }
          return {
            src: dom.getAttribute("src") || "",
            alt: dom.getAttribute("alt") || "",
            caption: dom.getAttribute("caption") || "",
            ratio: Number(dom.getAttribute("ratio") ?? 1),
          };
        },
      },
    ],
    parseMarkdown: {
      match: ({ type }) => type === "image-block",
      runner: (state, node, type) => {
        state.addNode(type, {
          src: (node.url as string) ?? "",
          alt: (node.alt as string) ?? "",
          caption: (node.title as string) ?? "",
          ratio: 1,
        });
      },
    },
    toMarkdown: {
      match: (node) => node.type.name === "image-block",
      runner: (state, node) => {
        state.openNode("paragraph");
        state.addNode("image", undefined, undefined, {
          url: node.attrs.src as string,
          alt: (node.attrs.alt as string) ?? "",
          title: node.attrs.caption as string,
        });
        state.closeNode();
      },
    },
  };
});

export function registerImageAlt(editor: Editor): void {
  editor.use(imageBlockWithAlt);
}
