import type { BarKind, HostToWebview, PageKind, RepoMode, Workflow } from "@slash-md/core/protocol";
import type { VsCodeApi } from "../vscode";
import { applyHeroTitle } from "./heroTitle";

export type BarHandle = {
  applyStatus(kind: BarKind, label: string, publishEnabled: boolean, prUrl?: string | null): void;
  onSaved(at: string, title?: string): void;
  persist(text: string): void;
  onHostMessage(msg: HostToWebview): void;
};

export function mountBar(
  vscode: VsCodeApi,
  init: Extract<HostToWebview, { type: "init" }>,
  flushMarkdown: () => string | undefined,
): BarHandle {
  const statusEl = document.getElementById("status")!;
  const pathEl = document.getElementById("path")!;
  const heroEl = document.getElementById("hero-title");
  const reviewBtn = document.getElementById("review") as HTMLButtonElement;
  const publishBtn = document.getElementById("publish") as HTMLButtonElement;
  const actionsEl = document.querySelector(".actions") as HTMLElement | null;

  let savedAt = init.savedAt;
  let lastText = "";
  let workflow: Workflow = init.workflow ?? "workspace";
  let repoMode: RepoMode = init.repoMode ?? "workspace";
  let pageKind: PageKind = init.pageKind ?? "editor";

  applyChrome();
  pathEl.textContent = init.path;
  applyStatus(init.kind, init.label, init.publishEnabled, init.prUrl);
  renderStatusTime();

  reviewBtn.addEventListener("click", () => {
    if (workflow === "editor" || repoMode === "personal") {
      return;
    }
    const text = flushMarkdown();
    vscode.postMessage(text !== undefined ? { type: "review", text } : { type: "review" });
  });
  publishBtn.addEventListener("click", () => {
    if (workflow === "editor" || publishBtn.disabled) {
      return;
    }
    const text = flushMarkdown();
    vscode.postMessage(text !== undefined ? { type: "publish", text } : { type: "publish" });
  });
  statusEl.addEventListener("click", () => {
    if (workflow === "editor") {
      return;
    }
    const url = statusEl.dataset.prUrl;
    if (url) {
      vscode.postMessage({ type: "openUrl", url });
    }
  });

  setInterval(renderStatusTime, 30_000);

  function onHostMessage(msg: HostToWebview): void {
    if (!msg?.type) {
      return;
    }
    if (msg.type === "saved" && typeof msg.at === "string") {
      onSaved(msg.at, msg.title);
      return;
    }
    if (msg.type === "status") {
      if (msg.workflow) {
        workflow = msg.workflow;
      }
      if (msg.repoMode) {
        repoMode = msg.repoMode;
      }
      if (msg.pageKind) {
        pageKind = msg.pageKind;
      }
      applyChrome();
      if (msg.path) {
        pathEl.textContent = msg.path;
      }
      applyStatus(msg.kind, msg.label, msg.publishEnabled, msg.prUrl);
      return;
    }
    if (msg.type === "init") {
      workflow = msg.workflow;
      repoMode = msg.repoMode ?? "workspace";
      pageKind = msg.pageKind ?? "editor";
      applyChrome();
      pathEl.textContent = msg.path;
      if (heroEl && msg.title !== undefined) {
        applyHeroTitle(heroEl, msg.title);
      }
      savedAt = msg.savedAt;
      applyStatus(msg.kind, msg.label, msg.publishEnabled, msg.prUrl);
    }
  }

  setInterval(renderStatusTime, 30_000);

  function applyChrome(): void {
    document.body.classList.toggle("workflow-editor", workflow === "editor");
    document.body.classList.toggle("workflow-workspace", workflow === "workspace");
    document.body.classList.toggle("repo-personal", workflow === "workspace" && repoMode === "personal");
    document.body.classList.toggle("repo-workspace", workflow === "workspace" && repoMode === "workspace");
    document.body.classList.toggle("page-wiki", pageKind === "wiki");
    document.body.classList.toggle("page-sidecar", pageKind === "sidecar");
    const wikiWorkspace = pageKind === "wiki" && workflow === "workspace" && repoMode === "workspace";
    reviewBtn.textContent = wikiWorkspace ? "Revisión en Home" : "Review";
    reviewBtn.hidden = workflow === "editor" || repoMode === "personal";
    publishBtn.hidden = workflow === "editor" || wikiWorkspace;
    if (actionsEl) {
      actionsEl.hidden = workflow === "editor";
    }
  }

  function applyStatus(kind: BarKind, label: string, publishEnabled: boolean, prUrl?: string | null): void {
    statusEl.dataset.kind = kind;
    statusEl.dataset.label = label || "";
    statusEl.dataset.prUrl = prUrl || "";
    statusEl.classList.toggle("error", kind === "error");
    statusEl.classList.toggle(
      "is-link",
      workflow === "workspace" && Boolean(prUrl) && (kind === "in_review" || kind === "published"),
    );
    publishBtn.disabled = workflow === "editor" || !publishEnabled;
    renderStatusTime();
    persist(lastText);
  }

  function onSaved(at: string, title?: string): void {
    savedAt = at;
    if (title !== undefined && heroEl) {
      applyHeroTitle(heroEl, title);
    }
    renderStatusTime();
    persist(lastText);
  }

  function persist(text: string): void {
    lastText = text;
    vscode.setState?.({
      kind: statusEl.dataset.kind,
      label: statusEl.dataset.label,
      savedAt,
      publishEnabled: !publishBtn.disabled,
      prUrl: statusEl.dataset.prUrl || null,
      workflow,
      repoMode,
      text,
    });
  }

  function renderStatusTime(): void {
    const kind = statusEl.dataset.kind || "draft";
    const label = statusEl.dataset.label || "";
    if (kind === "error" && label) {
      statusEl.textContent = label;
      return;
    }
    const time = formatAgo(savedAt);
    if (workflow === "editor") {
      statusEl.textContent = time ? `saved · ${time}` : "editor";
      return;
    }
    const bits: string[] = [];
    if (kind === "draft") {
      bits.push(time ? `saved · ${time}` : "draft");
    } else if (label) {
      bits.push(label);
    } else {
      bits.push(kind);
    }
    if (kind !== "draft" && time) {
      bits.push(`saved · ${time}`);
    }
    statusEl.textContent = bits.join(" · ");
  }

  return { applyStatus, onSaved, persist, onHostMessage };
}

function formatAgo(iso: string | null): string {
  if (!iso) {
    return "";
  }
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 0) {
    return "";
  }
  const m = Math.floor(ms / 60_000);
  if (m < 1) {
    return "just now";
  }
  if (m < 60) {
    return `${m}m`;
  }
  const h = Math.floor(m / 60);
  if (h < 24) {
    return `${h}h`;
  }
  return `${Math.floor(h / 24)}d`;
}
