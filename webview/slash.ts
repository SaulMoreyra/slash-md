import type { BlockEditFeatureConfig } from "@milkdown/crepe/feature/block-edit";
import { runInsertCallout } from "./callout";
import { runInsertToggle } from "./toggle";

const calloutIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm1 13h-2v-2h2v2zm0-4h-2V7h2v5z"/></svg>`;
const warningIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>`;
const toggleIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>`;

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
    group.addItem("warning", {
      label: "Warning /warning",
      icon: warningIcon,
      onRun: (ctx) => runInsertCallout(ctx, "WARNING"),
    });
    group.addItem("toggle", {
      label: "Toggle /toggle",
      icon: toggleIcon,
      onRun: (ctx) => runInsertToggle(ctx),
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
  warning: "Warning /warning",
  toggle: "Toggle /toggle",
};

/** Same rule Crepe uses: `label.toLowerCase().includes(filter)` after stripping `/`. */
export function slashItemsMatching(filter: string): string[] {
  const query = filter.replace(/^\//, "").toLowerCase();
  return Object.entries(slashItemLabels)
    .filter(([, label]) => label.toLowerCase().includes(query))
    .map(([key]) => key);
}
