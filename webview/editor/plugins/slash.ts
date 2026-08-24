import type { BlockEditFeatureConfig } from "@milkdown/crepe/feature/block-edit";
import { runInsertCallout } from "./callout";
import { runInsertDiagram } from "./mermaid";
import { runInsertToggle } from "./toggle";

const calloutIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm1 13h-2v-2h2v2zm0-4h-2V7h2v5z"/></svg>`;
const tipIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M9 21h6v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17h8v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"/></svg>`;
const importantIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 2 1 21h22L12 2zm1 15h-2v-2h2v2zm0-4h-2V9h2v4z"/></svg>`;
const warningIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>`;
const cautionIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 5.99 19.53 19H4.47L12 5.99M12 2 1 21h22L12 2zm1 14h-2v2h2v-2zm0-6h-2v4h2V10z"/></svg>`;
const toggleIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>`;
const diagramIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M9 3h6v4H9V3zm0 14h6v4H9v-4zM3 10h6v4H3v-4zm12 0h6v4h-6v-4zM8 8l2 3H6l2-3zm8 5 2 3h-4l2-3zM8 13l-2 3h4l-2-3z"/></svg>`;

export const slashConfig: BlockEditFeatureConfig = {
  textGroup: {
    label: "Text",
    text: { label: "Paragraph /p /text" },
    h1: { label: "Heading 1 /h1 /title1" },
    h2: { label: "Heading 2 /h2 /title2" },
    h3: { label: "Heading 3 /h3 /title3" },
    h4: null,
    h5: null,
    h6: null,
    quote: { label: "Quote /quote" },
    divider: { label: "Divider /divider" },
  },
  listGroup: {
    label: "Lists",
    bulletList: { label: "Bullet list /list /ul" },
    orderedList: { label: "Numbered list /ol" },
    taskList: { label: "To-do /todo" },
  },
  advancedGroup: {
    label: "Insert",
    image: { label: "Image /image" },
    codeBlock: { label: "Code /code" },
    table: { label: "Table /table" },
    math: null,
  },
  buildMenu: (builder) => {
    const group = builder.addGroup("docs", "Docs");
    group.addItem("callout", {
      label: "Callout /callout /info /note",
      icon: calloutIcon,
      onRun: (ctx) => runInsertCallout(ctx, "NOTE"),
    });
    group.addItem("tip", {
      label: "Tip /tip",
      icon: tipIcon,
      onRun: (ctx) => runInsertCallout(ctx, "TIP"),
    });
    group.addItem("important", {
      label: "Important /important",
      icon: importantIcon,
      onRun: (ctx) => runInsertCallout(ctx, "IMPORTANT"),
    });
    group.addItem("warning", {
      label: "Warning /warning",
      icon: warningIcon,
      onRun: (ctx) => runInsertCallout(ctx, "WARNING"),
    });
    group.addItem("caution", {
      label: "Caution /caution",
      icon: cautionIcon,
      onRun: (ctx) => runInsertCallout(ctx, "CAUTION"),
    });
    group.addItem("toggle", {
      label: "Toggle /toggle",
      icon: toggleIcon,
      onRun: (ctx) => runInsertToggle(ctx),
    });
    group.addItem("diagram", {
      label: "Diagram /diagram /mermaid /flowchart",
      icon: diagramIcon,
      onRun: (ctx) => runInsertDiagram(ctx),
    });
  },
};

export const slashItemLabels: Record<string, string> = {
  p: slashConfig.textGroup?.text?.label ?? "",
  h1: slashConfig.textGroup?.h1?.label ?? "",
  h2: slashConfig.textGroup?.h2?.label ?? "",
  h3: slashConfig.textGroup?.h3?.label ?? "",
  quote: slashConfig.textGroup?.quote?.label ?? "",
  divider: slashConfig.textGroup?.divider?.label ?? "",
  list: slashConfig.listGroup?.bulletList?.label ?? "",
  ol: slashConfig.listGroup?.orderedList?.label ?? "",
  todo: slashConfig.listGroup?.taskList?.label ?? "",
  image: slashConfig.advancedGroup?.image?.label ?? "",
  code: slashConfig.advancedGroup?.codeBlock?.label ?? "",
  table: slashConfig.advancedGroup?.table?.label ?? "",
  callout: "Callout /callout /info /note",
  tip: "Tip /tip",
  important: "Important /important",
  warning: "Warning /warning",
  caution: "Caution /caution",
  toggle: "Toggle /toggle",
  diagram: "Diagram /diagram /mermaid /flowchart",
};

/** Same rule Crepe uses: `label.toLowerCase().includes(filter)` after stripping `/`. */
export function slashItemsMatching(filter: string): string[] {
  const query = filter.replace(/^\//, "").toLowerCase();
  return Object.entries(slashItemLabels)
    .filter(([, label]) => label.toLowerCase().includes(query))
    .map(([key]) => key);
}
