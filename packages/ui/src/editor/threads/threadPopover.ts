import type { ReviewThread, WebviewToHost } from "@slash-md/core/protocol";
import { fillAuthorAvatar } from "../../shared/avatar";
import type { VsCodeApi } from "../vscode";

export function renderThreadPopover(
  popover: HTMLElement,
  thread: ReviewThread,
  vscode: VsCodeApi,
  canWrite: boolean,
  onClose: () => void,
): void {
  popover.replaceChildren();
  popover.className = thread.isResolved ? "thread-popover is-resolved" : "thread-popover";

  const head = document.createElement("header");
  head.className = "thread-popover-head";
  const status = document.createElement("span");
  status.className = thread.isResolved ? "thread-popover-status is-resolved" : "thread-popover-status";
  status.textContent = thread.isResolved ? "Resolved" : "Open thread";
  const close = document.createElement("button");
  close.type = "button";
  close.className = "thread-popover-close";
  close.setAttribute("aria-label", "Close");
  close.textContent = "Close";
  const dismiss = (ev: Event) => {
    ev.preventDefault();
    ev.stopPropagation();
    onClose();
  };
  close.addEventListener("pointerdown", dismiss);
  close.addEventListener("click", dismiss);
  head.append(status, close);
  popover.appendChild(head);

  if (thread.snippet) {
    const snip = document.createElement("blockquote");
    snip.className = "thread-popover-snippet";
    snip.textContent = thread.snippet;
    popover.appendChild(snip);
  }

  const list = document.createElement("div");
  list.className = "thread-popover-comments";
  for (const c of thread.comments) {
    const item = document.createElement("article");
    item.className = "thread-popover-comment";
    const av = document.createElement("div");
    av.className = "thread-popover-av";
    fillAuthorAvatar(av, { author: c.author, avatarUrl: c.avatarUrl, size: 64 });
    const col = document.createElement("div");
    col.className = "thread-popover-col";
    const meta = document.createElement("div");
    meta.className = "thread-popover-meta";
    meta.textContent = c.author;
    const body = document.createElement("div");
    body.className = "thread-popover-body";
    body.textContent = c.body;
    col.append(meta, body);
    item.append(av, col);
    list.appendChild(item);
  }
  popover.appendChild(list);

  const foot = document.createElement("footer");
  foot.className = "thread-popover-foot";

  if (canWrite) {
    const reply = document.createElement("textarea");
    reply.className = "thread-popover-reply";
    reply.rows = 2;
    reply.placeholder = "Write a reply";
    reply.setAttribute("aria-label", "Reply");
    foot.appendChild(reply);

    const writeActions = document.createElement("div");
    writeActions.className = "thread-popover-actions";
    const send = document.createElement("button");
    send.type = "button";
    send.className = "thread-btn thread-btn-primary";
    send.textContent = "Reply";
    send.addEventListener("click", () => {
      const body = reply.value.trim();
      if (!body) {
        reply.focus();
        return;
      }
      send.disabled = true;
      send.dataset.state = "loading";
      send.textContent = "Sending…";
      vscode.postMessage({ type: "threadReply", threadId: thread.id, body } satisfies WebviewToHost);
      reply.value = "";
      window.setTimeout(() => {
        send.disabled = false;
        delete send.dataset.state;
        send.textContent = "Reply";
      }, 800);
    });
    const resolve = document.createElement("button");
    resolve.type = "button";
    resolve.className = "thread-btn";
    resolve.textContent = thread.isResolved ? "Unresolve" : "Resolve";
    resolve.addEventListener("click", () => {
      vscode.postMessage({
        type: "threadResolve",
        threadId: thread.id,
        resolved: !thread.isResolved,
      } satisfies WebviewToHost);
    });
    writeActions.append(send, resolve);
    foot.appendChild(writeActions);
  } else {
    const note = document.createElement("p");
    note.className = "thread-popover-readonly";
    note.textContent = "Read-only — no write access on this repo.";
    foot.appendChild(note);
  }

  const ghUrl = thread.comments[0]?.url || thread.url;
  if (ghUrl) {
    const link = document.createElement("button");
    link.type = "button";
    link.className = "thread-btn thread-btn-gh";
    link.textContent = "Abrir en GitHub";
    link.addEventListener("click", () => {
      vscode.postMessage({ type: "openUrl", url: ghUrl });
    });
    foot.appendChild(link);
  }
  popover.appendChild(foot);
}
