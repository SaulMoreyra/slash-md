import type { FileEditor, FileEditorsPayload, HostToWebview } from "@slash-md/core/protocol";
import {
  formatEditedAgo,
  mergeLocalEditor,
} from "@slash-md/core/fileEditors";
import { fillAuthorAvatar } from "../../shared/avatar";

const STACK = 3;

export function mountEdited(): { apply(payload: FileEditorsPayload): void; onHostMessage(msg: HostToWebview): void } {
  const btn = document.getElementById("edited-btn") as HTMLButtonElement;
  const avatarsEl = document.getElementById("edited-avatars")!;
  const labelEl = document.getElementById("edited-label")!;
  const popover = document.getElementById("edited-popover")!;
  const pageEl = document.getElementById("page")!;
  if (!btn || !avatarsEl || !labelEl || !popover || !pageEl) {
    return { apply() {} };
  }

  let payload: FileEditorsPayload = {
    editors: [],
    lastEditedAt: null,
    createdAt: null,
    createdBy: null,
    you: null,
  };
  let open = false;

  render();

  btn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    if (!payload.editors.length && !payload.lastEditedAt) {
      return;
    }
    toggle(!open);
  });

  document.addEventListener("pointerdown", (ev) => {
    if (!open) {
      return;
    }
    const target = ev.target as Node | null;
    if (popover.contains(target) || btn.contains(target)) {
      return;
    }
    close();
  });

  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && open) {
      close();
      btn.focus();
    }
  });

  function onHostMessage(msg: HostToWebview): void {
    if (!msg?.type) {
      return;
    }
    if (msg.type === "editors") {
      payload = {
        editors: msg.editors ?? [],
        lastEditedAt: msg.lastEditedAt ?? null,
        createdAt: msg.createdAt ?? null,
        createdBy: msg.createdBy ?? null,
        you: msg.you ?? null,
      };
      render();
      if (open) {
        renderPopover();
      }
      return;
    }
    if (msg.type === "saved" && typeof msg.at === "string" && payload.you) {
      payload = {
        ...payload,
        editors: mergeLocalEditor(payload.editors, payload.you, msg.at),
        lastEditedAt: msg.at,
      };
      render();
      if (open) {
        renderPopover();
      }
    }
  }

  function apply(next: FileEditorsPayload): void {
    payload = next;
    render();
  }

  function render(): void {
    const editors = payload.editors;
    const at = payload.lastEditedAt;
    const empty = editors.length === 0 && !at;
    btn.hidden = empty;
    if (empty) {
      close();
      return;
    }

    const ago = formatEditedAgo(at);
    const last = editors[0];
    const who = last?.name;
    labelEl.textContent = ago ? `Edited ${ago}` : "Edited";
    btn.setAttribute(
      "aria-label",
      who
        ? `Last edited by ${who}${ago ? `, ${ago}` : ""}. ${editors.length} ${editors.length === 1 ? "person" : "people"} edited this page.`
        : `Last edited${ago ? ` ${ago}` : ""}`,
    );
    btn.disabled = false;

    avatarsEl.replaceChildren();
    avatarsEl.hidden = editors.length === 0;
    const stack = editors.slice(0, STACK).reverse();
    stack.forEach((editor, i) => {
      const chip = document.createElement("span");
      chip.className = "edited-av";
      chip.style.zIndex = String(i + 1);
      fillAuthorAvatar(chip, { author: editor.name, avatarUrl: editor.avatarUrl, size: 40 });
      avatarsEl.appendChild(chip);
    });
  }

  function toggle(next: boolean): void {
    open = next;
    popover.hidden = !next;
    btn.setAttribute("aria-expanded", next ? "true" : "false");
    if (!next) {
      return;
    }
    renderPopover();
    placePopover();
  }

  function close(): void {
    if (!open) {
      return;
    }
    toggle(false);
  }

  function placePopover(): void {
    pageEl.appendChild(popover);
    const rect = btn.getBoundingClientRect();
    const pageRect = pageEl.getBoundingClientRect();
    const top = rect.bottom - pageRect.top + pageEl.scrollTop + 6;
    const width = popover.offsetWidth || 280;
    const left = Math.min(
      Math.max(8, rect.left - pageRect.left),
      Math.max(8, pageEl.clientWidth - width - 8),
    );
    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;
    const height = popover.offsetHeight || 240;
    const spaceBelow = pageEl.clientHeight - (rect.bottom - pageRect.top);
    if (spaceBelow < height + 8 && rect.top - pageRect.top > height) {
      popover.style.top = `${rect.top - pageRect.top + pageEl.scrollTop - height - 6}px`;
    }
  }

  function renderPopover(): void {
    popover.replaceChildren();
    popover.classList.add("edited-popover-floating");

    const head = document.createElement("p");
    head.className = "edited-pop-head";
    head.textContent = "Edited by";
    popover.appendChild(head);

    if (payload.editors.length === 0) {
      const empty = document.createElement("p");
      empty.className = "edited-pop-empty";
      empty.textContent = "No commit history yet. People show up after the page is committed.";
      popover.appendChild(empty);
    } else {
      const list = document.createElement("ul");
      list.className = "edited-pop-list";
      for (const editor of payload.editors) {
        list.appendChild(renderRow(editor));
      }
      popover.appendChild(list);
    }

    if (payload.createdAt) {
      const created = document.createElement("p");
      created.className = "edited-pop-created";
      const when = formatEditedAgo(payload.createdAt);
      const by = payload.createdBy ? ` by ${payload.createdBy}` : "";
      created.textContent = `Created${by} · ${when}`;
      popover.appendChild(created);
    }
  }

  function renderRow(editor: FileEditor): HTMLLIElement {
    const li = document.createElement("li");
    li.className = "edited-pop-row";

    const av = document.createElement("span");
    av.className = "edited-pop-av";
    fillAuthorAvatar(av, { author: editor.name, avatarUrl: editor.avatarUrl, size: 48 });

    const body = document.createElement("div");
    body.className = "edited-pop-body";
    const name = document.createElement("span");
    name.className = "edited-pop-name";
    name.textContent = editor.login ? `${editor.name}` : editor.name;
    const sub = document.createElement("span");
    sub.className = "edited-pop-sub";
    const edits =
      editor.commits > 0 ? (editor.commits === 1 ? "1 edit" : `${editor.commits} edits`) : "editing now";
    sub.textContent = editor.login ? `@${editor.login} · ${edits}` : edits;
    body.append(name, sub);

    const time = document.createElement("time");
    time.className = "edited-pop-time";
    time.dateTime = editor.lastEditedAt;
    time.textContent = formatEditedAgo(editor.lastEditedAt);

    li.append(av, body, time);
    return li;
  }

  return { apply, onHostMessage };
}
