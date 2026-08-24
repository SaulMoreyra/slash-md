import type { HomeContext } from "../context";
import { chip } from "../dom/chip";
import { selectFile } from "../selection";
import type { IndexEntry } from "../types";

export function renderSheet(ctx: HomeContext, entries: IndexEntry[]): HTMLTableElement {
  const table = document.createElement("table");
  table.className = "spec-sheet";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  for (const label of ["Page", "Path", "Status", "Actions"]) {
    const th = document.createElement("th");
    th.textContent = label;
    if (label === "Actions") {
      th.className = "visually-hidden";
    }
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  let lastGroup = "";
  for (const entry of entries) {
    if (entry.group !== lastGroup) {
      lastGroup = entry.group;
      const groupRow = document.createElement("tr");
      groupRow.className = "spec-group";
      const th = document.createElement("th");
      th.colSpan = 4;
      th.scope = "colgroup";
      th.textContent = entry.group;
      groupRow.appendChild(th);
      tbody.appendChild(groupRow);
    }
    tbody.appendChild(renderEntry(ctx, entry));
  }
  table.appendChild(tbody);
  return table;
}

function renderEntry(ctx: HomeContext, entry: IndexEntry): HTMLTableRowElement {
  const { file } = entry;
  const { selection } = ctx.state;
  const tr = document.createElement("tr");
  tr.className = "spec-row";
  if (selection.kind === "file" && selection.path === file.path) {
    tr.classList.add("selected");
  }

  const titleCell = document.createElement("td");
  const titleBtn = document.createElement("button");
  titleBtn.type = "button";
  titleBtn.className = "spec-title";
  titleBtn.textContent = file.title;
  titleBtn.addEventListener("click", () => selectFile(ctx, file));
  titleBtn.addEventListener("dblclick", () => {
    ctx.post({ type: "open", path: file.path });
  });
  titleCell.appendChild(titleBtn);

  const pathCell = document.createElement("td");
  pathCell.className = "spec-path";
  pathCell.textContent = file.path;

  const statusCell = document.createElement("td");
  statusCell.className = "spec-status";
  statusCell.textContent = file.badge ?? "—";

  const actionCell = document.createElement("td");
  actionCell.className = "spec-actions";
  const actions = document.createElement("div");
  actions.className = "row-actions";
  actions.append(
    chip("Open", "ghost", () => ctx.post({ type: "open", path: file.path })),
    chip("Rename", "ghost", () => ctx.post({ type: "rename", path: file.path })),
    chip("Delete", "ghost danger", () => ctx.post({ type: "delete", path: file.path })),
  );
  actionCell.appendChild(actions);

  tr.append(titleCell, pathCell, statusCell, actionCell);

  queueMicrotask(() => {
    if (tr.classList.contains("selected")) {
      tr.scrollIntoView({ block: "nearest" });
    }
  });

  return tr;
}
