import type { ReviewThread, WebviewToHost } from "../src/protocol";
import { fillAuthorAvatar } from "./avatar";
import type { VsCodeApi } from "./bar";

export function mountThreadChrome(
  vscode: VsCodeApi,
): {
  showThread(thread: ReviewThread): void;
  setOrphans(orphans: ReviewThread[]): void;
  setCanWrite(canWrite: boolean): void;
  close(): void;
  destroy(): void;
} {
  const rail = document.getElementById("thread-rail");
  const popover = document.getElementById("thread-popover");
  if (!rail || !popover) {
    return {
      showThread() {},
      setOrphans() {},
      setCanWrite() {},
      close() {},
      destroy() {},
    };
  }

  let canWrite = false;
  let current: ReviewThread | undefined;

  const close = (): void => {
    current = undefined;
    popover.hidden = true;
  };

  const onDocPointerDown = (ev: PointerEvent) => {
    if (popover.hidden) {
      return;
    }
    const path = ev.composedPath();
    if (path.includes(popover) || path.includes(rail)) {
      return;
    }
    // Keep open when activating an inline thread mark (it will open/replace).
    if ((ev.target as Element | null)?.closest?.(".slash-thread-mark")) {
      return;
    }
    close();
  };
  document.addEventListener("pointerdown", onDocPointerDown, true);

  const render = (thread: ReviewThread) => {
    current = thread;
    renderPopover(popover, thread, vscode, canWrite, close);
    popover.hidden = false;
  };

  return {
    showThread: render,
    close,
    setOrphans(orphans) {
      rail.replaceChildren();
      if (orphans.length === 0) {
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
      count.textContent = String(orphans.length);
      head.append(title, count);
      rail.appendChild(head);

      const hint = document.createElement("p");
      hint.className = "thread-rail-hint";
      hint.textContent = "Text moved or rewritten — still on the PR.";
      rail.appendChild(hint);

      for (const thread of orphans) {
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
        btn.addEventListener("click", () => render(thread));
        rail.appendChild(btn);
      }
    },
    setCanWrite(next) {
      canWrite = next;
      if (current && !popover.hidden) {
        render(current);
      }
    },
    destroy() {
      document.removeEventListener("pointerdown", onDocPointerDown, true);
      close();
      rail.hidden = true;
      rail.replaceChildren();
    },
  };
}

function renderPopover(
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

  const link = document.createElement("button");
  link.type = "button";
  link.className = "thread-btn thread-btn-ghost";
  link.textContent = "View on GitHub";
  link.addEventListener("click", () => {
    const url = thread.comments[0]?.url || thread.url;
    if (url) {
      vscode.postMessage({ type: "openUrl", url });
    }
  });
  foot.appendChild(link);
  popover.appendChild(foot);
}
