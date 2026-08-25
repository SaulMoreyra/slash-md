import type { SlashmdFile } from "../../src/config/slashmdConfig";
import type { HomeContext } from "../context";
import { chip } from "../dom/chip";

export function renderConfigPanel(ctx: HomeContext, config: SlashmdFile, ok?: boolean, error?: string): void {
  const { stageInner } = ctx.dom;
  stageInner.replaceChildren();

  const head = document.createElement("header");
  head.className = "head-hang";
  const title = document.createElement("h1");
  title.textContent = "Configuración";
  head.appendChild(title);
  const lede = document.createElement("p");
  lede.className = "lede";
  lede.textContent =
    'Edit .slashmd.json. Default content path is "." (repo root). Team templates: Templates folder (default _templates).';
  head.appendChild(lede);

  if (ok === true) {
    const toast = document.createElement("p");
    toast.className = "config-toast config-toast-ok";
    toast.textContent = "Saved.";
    head.appendChild(toast);
  }
  if (error) {
    const toast = document.createElement("p");
    toast.className = "config-toast config-toast-err";
    toast.textContent = error;
    head.appendChild(toast);
  }

  stageInner.appendChild(head);

  const form = document.createElement("form");
  form.className = "config-form";
  form.addEventListener("submit", (ev) => ev.preventDefault());

  const addField = (label: string, id: string, value: string, placeholder: string) => {
    const row = document.createElement("div");
    row.className = "config-field";
    const lbl = document.createElement("label");
    lbl.htmlFor = id;
    lbl.textContent = label;
    const input = document.createElement("input");
    input.type = "text";
    input.id = id;
    input.className = "config-input";
    input.value = value;
    input.placeholder = placeholder;
    row.append(lbl, input);
    form.appendChild(row);
    return input;
  };

  const contentPathInput = addField(
    "Content path",
    "cfg-contentPath",
    config.contentPath === "" || config.contentPath === undefined ? "." : (config.contentPath ?? ""),
    ".  (repo root, or e.g. docs)",
  );
  const templatesPathInput = addField(
    "Templates folder",
    "cfg-templatesPath",
    config.templatesPath ?? "",
    "docs/_templates",
  );
  const defaultBranchInput = addField("Default branch", "cfg-defaultBranch", config.defaultBranch ?? "", "main");

  const modeRow = document.createElement("div");
  modeRow.className = "config-field";
  const modeLbl = document.createElement("label");
  modeLbl.htmlFor = "cfg-mode";
  modeLbl.textContent = "Mode";
  const modeSelect = document.createElement("select");
  modeSelect.id = "cfg-mode";
  modeSelect.className = "config-input";
  for (const opt of ["workspace", "personal"]) {
    const option = document.createElement("option");
    option.value = opt;
    option.textContent = opt;
    if ((config.mode ?? "workspace") === opt) {
      option.selected = true;
    }
    modeSelect.appendChild(option);
  }
  modeRow.append(modeLbl, modeSelect);
  form.appendChild(modeRow);

  const sectionsRow = document.createElement("div");
  sectionsRow.className = "config-field";
  const sectionsLbl = document.createElement("label");
  sectionsLbl.htmlFor = "cfg-sections";
  sectionsLbl.textContent = "Sections (comma-separated)";
  const sectionsInput = document.createElement("input");
  sectionsInput.type = "text";
  sectionsInput.id = "cfg-sections";
  sectionsInput.className = "config-input";
  sectionsInput.value = (config.sections ?? []).join(", ");
  sectionsInput.placeholder = "guides, tutorials";
  sectionsRow.append(sectionsLbl, sectionsInput);
  form.appendChild(sectionsRow);

  const actions = document.createElement("div");
  actions.className = "hang-actions";
  actions.append(
    chip("Save", "fill", () => {
      const sections = sectionsInput.value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const patch: SlashmdFile = {
        contentPath: contentPathInput.value.trim() || undefined,
        templatesPath: templatesPathInput.value.trim() || undefined,
        defaultBranch: defaultBranchInput.value.trim() || undefined,
        mode: modeSelect.value as "workspace" | "personal",
        sections,
      };
      ctx.post({ type: "saveConfig", config: patch });
    }),
    chip("Back", "ghost", () => {
      ctx.state.selection = { kind: "none" };
      ctx.refresh();
    }),
  );
  form.appendChild(actions);

  stageInner.appendChild(form);
}
