import type { HomeTreeNode, HomeTreePayload } from "../../src/home/homeTree";
import type { HomeContext } from "./context";
import { clearSelection, selectFile, selectFolder } from "./selection";
import { filterTreeNodes } from "./utils/tree";

export function renderTree(ctx: HomeContext, payload: HomeTreePayload): void {
  const { dom, state } = ctx;
  dom.repoEl.textContent = payload.repo || "No repo";
  dom.initBtn.hidden = !payload.needsInit;
  dom.signInBtn.hidden = !payload.needsAuth;
  dom.newBtn.disabled = payload.needsInit;
  dom.newFolderBtn.disabled = payload.needsInit;
  dom.treeEl.replaceChildren();

  if (payload.indexPath) {
    const portadaBtn = document.createElement("button");
    portadaBtn.type = "button";
    portadaBtn.className = "tree-all tree-portada";
    portadaBtn.textContent = "Portada";
    portadaBtn.addEventListener("click", () => {
      ctx.post({ type: "openIndex" });
    });
    dom.treeEl.appendChild(portadaBtn);
  }

  const allBtn = document.createElement("button");
  allBtn.type = "button";
  allBtn.className = "tree-all";
  allBtn.textContent = "Todas las páginas";
  if (state.selection.kind === "none") {
    allBtn.classList.add("selected");
  }
  allBtn.addEventListener("click", () => clearSelection(ctx));
  dom.treeEl.appendChild(allBtn);

  const roots = filterTreeNodes(payload.roots, state.searchQuery);

  if (roots.length === 0 && !state.searchQuery) {
    const empty = document.createElement("p");
    empty.className = "tree-empty";
    empty.textContent = payload.needsInit
      ? "Haz Init para vincular el repo."
      : payload.needsAuth
        ? "Inicia sesión, o abre el folder de docs."
        : "Aún no hay páginas.";
    dom.treeEl.appendChild(empty);
    return;
  }

  if (roots.length === 0 && state.searchQuery) {
    const empty = document.createElement("p");
    empty.className = "tree-empty";
    empty.textContent = "Sin resultados.";
    dom.treeEl.appendChild(empty);
    return;
  }

  const list = document.createElement("ul");
  list.className = "tree-root";
  for (const node of roots) {
    list.appendChild(renderNode(ctx, node));
  }
  dom.treeEl.appendChild(list);
}

function renderNode(ctx: HomeContext, node: HomeTreeNode): HTMLLIElement {
  const { state } = ctx;
  const li = document.createElement("li");
  li.className = `tree-node kind-${node.kind}`;

  if (node.kind === "folder") {
    const details = document.createElement("details");
    details.open = true;
    const summary = document.createElement("summary");
    summary.className = "tree-folder";
    summary.dataset.path = node.path;
    summary.textContent = node.title;
    if (state.selection.kind === "folder" && state.selection.path === node.path) {
      summary.classList.add("selected");
    }
    summary.addEventListener("click", (ev) => {
      ev.preventDefault();
      selectFolder(ctx, node);
    });
    details.appendChild(summary);
    const childList = document.createElement("ul");
    for (const child of node.children ?? []) {
      childList.appendChild(renderNode(ctx, child));
    }
    details.appendChild(childList);
    li.appendChild(details);
    return li;
  }

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "tree-file";
  btn.dataset.path = node.path;
  if (state.selection.kind === "file" && state.selection.path === node.path) {
    btn.classList.add("selected");
  }
  const title = document.createElement("span");
  title.className = "tree-title";
  title.textContent = node.title;
  btn.appendChild(title);
  if (node.badge) {
    const badge = document.createElement("span");
    badge.className = "tree-badge";
    badge.textContent = node.badge;
    btn.appendChild(badge);
  }
  btn.addEventListener("click", () => selectFile(ctx, node));
  btn.addEventListener("dblclick", () => {
    ctx.post({ type: "open", path: node.path });
  });
  li.appendChild(btn);
  return li;
}
