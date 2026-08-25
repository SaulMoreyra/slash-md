import type { ReviewThread } from "@slash-md/core/protocol";
import { fillAuthorAvatar } from "../../shared/avatar";
import type { VsCodeApi } from "../vscode";

export function renderThreadRail(
  rail: HTMLElement,
  orphans: ReviewThread[],
  vscode: VsCodeApi,
  onOpen: (thread: ReviewThread) => void,
): void {
  const open = orphans.filter((thread) => !thread.isResolved);
  rail.replaceChildren();
  if (open.length === 0) {
    rail.hidden = true;
    return;
  }
  rail.hidden = false;

  const head = document.createElement("div");
  head.className = "thread-rail-head";
  const title = document.createElement("div");
  title.className = "thread-rail-title";
  title.textContent = "Off canvas";
  const count = document.createElement("div");
  count.className = "thread-rail-count";
  count.textContent = String(open.length);
  head.append(title, count);
  rail.appendChild(head);

  const hint = document.createElement("p");
  hint.className = "thread-rail-hint";
  hint.textContent =
    "Este comentario ya no coincide con el texto actual. Puedes abrirlo en GitHub para ver el contexto original.";
  rail.appendChild(hint);

  for (const thread of open) {
    const row = document.createElement("div");
    row.className = "thread-rail-row";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = thread.isResolved ? "thread-rail-item is-resolved" : "thread-rail-item";
    const first = thread.comments[0];
    const av = document.createElement("span");
    av.className = "thread-rail-av";
    fillAuthorAvatar(av, {
      author: first?.author ?? "?",
      avatarUrl: first?.avatarUrl,
      size: 48,
    });
    const col = document.createElement("span");
    col.className = "thread-rail-copy";
    const who = document.createElement("span");
    who.className = "thread-rail-who";
    who.textContent = first?.author ?? "review";
    const preview = document.createElement("span");
    preview.className = "thread-rail-preview";
    preview.textContent = (first?.body ?? "").replace(/\s+/g, " ").trim();
    col.append(who, preview);
    btn.append(av, col);
    btn.title = thread.snippet || thread.url;
    btn.addEventListener("click", () => onOpen(thread));
    row.appendChild(btn);

    const ghUrl = first?.url || thread.url;
    if (ghUrl) {
      const ghLink = document.createElement("button");
      ghLink.type = "button";
      ghLink.className = "thread-rail-gh";
      ghLink.textContent = "Abrir en GitHub";
      ghLink.addEventListener("click", (ev) => {
        ev.stopPropagation();
        vscode.postMessage({ type: "openUrl", url: ghUrl });
      });
      row.appendChild(ghLink);
    }

    rail.appendChild(row);
  }
}
