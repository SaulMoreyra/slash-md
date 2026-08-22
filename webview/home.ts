import type { HomeFromWebview, HomeToWebview } from "../src/homeHtml";
import type { HomeTreeNode, HomeTreePayload } from "../src/homeTree";
import "./home.css";

declare function acquireVsCodeApi(): {
  postMessage(message: HomeFromWebview): void;
};

const vscode = acquireVsCodeApi();

const repoEl = document.getElementById("repo")!;
const statusEl = document.getElementById("status")!;
const treeEl = document.getElementById("tree")!;
const stageInner = document.getElementById("stage-inner")!;
const newBtn = document.getElementById("new") as HTMLButtonElement;
const newFolderBtn = document.getElementById("new-folder") as HTMLButtonElement;
const refreshBtn = document.getElementById("refresh") as HTMLButtonElement;
const initBtn = document.getElementById("init") as HTMLButtonElement;
const signInBtn = document.getElementById("signin") as HTMLButtonElement;

type Selection =
  | { kind: "none" }
  | { kind: "folder"; path: string; title: string; children: HomeTreeNode[] }
  | { kind: "file"; path: string; title: string; badge?: string };

type IndexEntry = {
  file: HomeTreeNode;
  group: string;
  groupPath: string;
};

let selectedSection: string | undefined;
let selection: Selection = { kind: "none" };
let lastPayload: HomeTreePayload | undefined;

newBtn.addEventListener("click", () => {
  vscode.postMessage({ type: "new", section: selectedSection });
});
newFolderBtn.addEventListener("click", () => {
  vscode.postMessage({ type: "newFolder", parent: selectedSection });
});
refreshBtn.addEventListener("click", () => {
  setRefreshBusy(true);
  vscode.postMessage({ type: "refresh" });
});
initBtn.addEventListener("click", () => {
  vscode.postMessage({ type: "init" });
});
signInBtn.addEventListener("click", () => {
  vscode.postMessage({ type: "signIn" });
});

window.addEventListener("message", (event: MessageEvent<HomeToWebview>) => {
  const msg = event.data;
  if (!msg?.type) {
    return;
  }
  if (msg.type === "status") {
    statusEl.textContent = msg.message;
    return;
  }
  if (msg.type === "tree") {
    lastPayload = msg.payload;
    setRefreshBusy(false);
    refreshSelectionFromPayload(msg.payload);
    renderTree(msg.payload);
    renderStage();
  }
});

function setRefreshBusy(busy: boolean): void {
  refreshBtn.disabled = busy;
  refreshBtn.setAttribute("aria-busy", busy ? "true" : "false");
  if (busy) {
    refreshBtn.dataset.state = "loading";
  } else {
    delete refreshBtn.dataset.state;
  }
}

function renderTree(payload: HomeTreePayload): void {
  repoEl.textContent = payload.repo || "No repo";
  initBtn.hidden = !payload.needsInit;
  signInBtn.hidden = !payload.needsAuth;
  newBtn.disabled = payload.needsInit;
  newFolderBtn.disabled = payload.needsInit;
  treeEl.replaceChildren();

  const allBtn = document.createElement("button");
  allBtn.type = "button";
  allBtn.className = "tree-all";
  allBtn.textContent = "All pages";
  if (selection.kind === "none") {
    allBtn.classList.add("selected");
  }
  allBtn.addEventListener("click", clearSelection);
  treeEl.appendChild(allBtn);

  if (payload.roots.length === 0) {
    const empty = document.createElement("p");
    empty.className = "tree-empty";
    empty.textContent = payload.needsInit
      ? "Init to link a repo."
      : payload.needsAuth
        ? "Sign in, or open the docs folder."
        : "No pages yet.";
    treeEl.appendChild(empty);
    return;
  }

  const list = document.createElement("ul");
  list.className = "tree-root";
  for (const node of payload.roots) {
    list.appendChild(renderNode(node));
  }
  treeEl.appendChild(list);
}

function renderNode(node: HomeTreeNode): HTMLLIElement {
  const li = document.createElement("li");
  li.className = `tree-node kind-${node.kind}`;

  if (node.kind === "folder") {
    const details = document.createElement("details");
    details.open = true;
    const summary = document.createElement("summary");
    summary.className = "tree-folder";
    summary.dataset.path = node.path;
    summary.textContent = node.title;
    if (selection.kind === "folder" && selection.path === node.path) {
      summary.classList.add("selected");
    }
    summary.addEventListener("click", (ev) => {
      ev.preventDefault();
      selectFolder(node);
    });
    details.appendChild(summary);
    const childList = document.createElement("ul");
    for (const child of node.children ?? []) {
      childList.appendChild(renderNode(child));
    }
    details.appendChild(childList);
    li.appendChild(details);
    return li;
  }

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "tree-file";
  btn.dataset.path = node.path;
  if (selection.kind === "file" && selection.path === node.path) {
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
  btn.addEventListener("click", () => selectFile(node));
  btn.addEventListener("dblclick", () => {
    vscode.postMessage({ type: "open", path: node.path });
  });
  li.appendChild(btn);
  return li;
}

function clearSelection(): void {
  selectedSection = undefined;
  selection = { kind: "none" };
  if (lastPayload) {
    renderTree(lastPayload);
  }
  renderStage();
}

function selectFolder(node: HomeTreeNode): void {
  selectedSection = node.path;
  selection = {
    kind: "folder",
    path: node.path,
    title: node.title,
    children: node.children ?? [],
  };
  if (lastPayload) {
    renderTree(lastPayload);
  }
  renderStage();
}

function selectFile(node: HomeTreeNode): void {
  selection = {
    kind: "file",
    path: node.path,
    title: node.title,
    badge: node.badge,
  };
  selectedSection = parentSection(node.path);
  if (lastPayload) {
    renderTree(lastPayload);
  }
  renderStage();
}

function parentSection(remotePath: string): string | undefined {
  const parts = remotePath.split("/");
  if (parts.length <= 2) {
    return undefined;
  }
  return parts.slice(0, -1).join("/");
}

function refreshSelectionFromPayload(payload: HomeTreePayload): void {
  if (selection.kind === "file") {
    const found = findFile(payload.roots, selection.path);
    selection = found
      ? { kind: "file", path: found.path, title: found.title, badge: found.badge }
      : { kind: "none" };
    return;
  }
  if (selection.kind === "folder") {
    const found = findFolder(payload.roots, selection.path);
    selection = found
      ? {
          kind: "folder",
          path: found.path,
          title: found.title,
          children: found.children ?? [],
        }
      : { kind: "none" };
  }
}

function findFile(nodes: HomeTreeNode[], path: string): HomeTreeNode | undefined {
  for (const node of nodes) {
    if (node.kind === "file" && node.path === path) {
      return node;
    }
    if (node.kind === "folder" && node.children) {
      const hit = findFile(node.children, path);
      if (hit) {
        return hit;
      }
    }
  }
  return undefined;
}

function findFolder(nodes: HomeTreeNode[], path: string): HomeTreeNode | undefined {
  for (const node of nodes) {
    if (node.kind === "folder" && node.path === path) {
      return node;
    }
    if (node.kind === "folder" && node.children) {
      const hit = findFolder(node.children, path);
      if (hit) {
        return hit;
      }
    }
  }
  return undefined;
}

function collectIndex(nodes: HomeTreeNode[], group = "Pages", groupPath = ""): IndexEntry[] {
  const out: IndexEntry[] = [];
  for (const node of nodes) {
    if (node.kind === "file") {
      out.push({ file: node, group, groupPath });
    } else {
      out.push(...collectIndex(node.children ?? [], node.title, node.path));
    }
  }
  return out;
}

function renderStage(): void {
  stageInner.replaceChildren();
  const payload = lastPayload;

  if (!payload || payload.needsInit) {
    stageInner.appendChild(
      emptyPanel({
        title: "No repo linked",
        body: "Init writes .slashmd.json and connects the docs folder.",
        action: { label: "Init", onClick: () => vscode.postMessage({ type: "init" }) },
      }),
    );
    return;
  }

  if (payload.needsAuth) {
    stageInner.appendChild(
      emptyPanel({
        title: "GitHub session required",
        body: "Sign in to list remote pages, or open the docs folder in this window.",
        action: { label: "Sign in", onClick: () => vscode.postMessage({ type: "signIn" }) },
      }),
    );
    return;
  }

  const all = collectIndex(payload.roots);
  const folderPath = selection.kind === "folder" ? selection.path : undefined;
  const entries = folderPath
    ? all.filter((e) => e.groupPath === folderPath || e.groupPath.startsWith(`${folderPath}/`))
    : all;

  const head = document.createElement("header");
  head.className = "head-hang";

  const title = document.createElement("h1");
  title.textContent =
    selection.kind === "folder"
      ? selection.title
      : selection.kind === "file"
        ? selection.title
        : "Library";
  head.appendChild(title);

  const lede = document.createElement("p");
  lede.className = "lede";
  const source = payload.fromWorkspace ? "Workspace" : "GitHub";
  if (selection.kind === "file") {
    lede.classList.add("lede-path");
    lede.textContent = selection.path;
  } else if (selection.kind === "folder") {
    lede.textContent =
      entries.length === 0
        ? "This folder has no pages yet."
        : `${entries.length} page${entries.length === 1 ? "" : "s"} in this folder.`;
  } else {
    lede.textContent =
      entries.length === 0
        ? "No pages yet. New page creates the first Markdown file."
        : `${payload.repo} · ${source} · ${entries.length} page${entries.length === 1 ? "" : "s"}.`;
  }
  head.appendChild(lede);

  if (selection.kind === "folder") {
    const nested = selection.children.filter((c) => c.kind === "folder");
    if (nested.length > 0) {
      const folders = document.createElement("p");
      folders.className = "folder-links";
      folders.append("Folders: ");
      nested.forEach((folder, i) => {
        const link = document.createElement("button");
        link.type = "button";
        link.className = "cta-text";
        link.textContent = folder.title;
        link.addEventListener("click", () => {
          const full = findFolder(payload.roots, folder.path) ?? folder;
          selectFolder(full);
        });
        folders.appendChild(link);
        if (i < nested.length - 1) {
          folders.append(" · ");
        }
      });
      head.appendChild(folders);
    }
  }

  if (selection.kind === "file") {
    const path = selection.path;
    const actions = document.createElement("div");
    actions.className = "row-actions hang-actions";
    actions.append(
      chip("Open", "fill", () => vscode.postMessage({ type: "open", path })),
      chip("Rename", "outline", () => vscode.postMessage({ type: "rename", path })),
      chip("Delete", "danger", () => vscode.postMessage({ type: "delete", path })),
    );
    head.appendChild(actions);
  }

  stageInner.appendChild(head);

  if (entries.length === 0) {
    return;
  }

  stageInner.appendChild(renderSheet(entries));
}

function emptyPanel(opts: {
  title: string;
  body: string;
  action: { label: string; onClick: () => void };
}): HTMLElement {
  const wrap = document.createElement("header");
  wrap.className = "head-hang";
  const title = document.createElement("h1");
  title.textContent = opts.title;
  const body = document.createElement("p");
  body.className = "lede";
  body.textContent = opts.body;
  const actions = document.createElement("div");
  actions.className = "hang-actions";
  actions.appendChild(chip(opts.action.label, "fill", opts.action.onClick));
  wrap.append(title, body, actions);
  return wrap;
}

function renderSheet(entries: IndexEntry[]): HTMLTableElement {
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
    tbody.appendChild(renderEntry(entry));
  }
  table.appendChild(tbody);
  return table;
}

function renderEntry(entry: IndexEntry): HTMLTableRowElement {
  const { file } = entry;
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
  titleBtn.addEventListener("click", () => selectFile(file));
  titleBtn.addEventListener("dblclick", () => {
    vscode.postMessage({ type: "open", path: file.path });
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
    chip("Open", "ghost", () => vscode.postMessage({ type: "open", path: file.path })),
    chip("Rename", "ghost", () => vscode.postMessage({ type: "rename", path: file.path })),
    chip("Delete", "ghost danger", () => vscode.postMessage({ type: "delete", path: file.path })),
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

function chip(label: string, variant: string, onClick: () => void): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = variant.includes("fill")
    ? "cta-fill"
    : variant.includes("outline")
      ? "cta-outline"
      : variant.includes("danger") && !variant.includes("ghost")
        ? "cta-outline danger"
        : `cta-ghost${variant.includes("danger") ? " danger" : ""}`;
  btn.textContent = label;
  btn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    onClick();
  });
  return btn;
}

renderStage();
vscode.postMessage({ type: "ready" });
