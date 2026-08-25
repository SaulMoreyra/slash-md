import type { HomeTreePayload } from "@slash-md/core/homeTypes";
import type { HomeContext } from "../context";
import { relativeTime, shortDraftPath } from "../utils/format";

type InboxRow = HomeTreePayload["inbox"][number];

export function renderInbox(ctx: HomeContext, payload: HomeTreePayload): HTMLElement {
  const { searchQuery } = ctx.state;
  const allItems = payload.inbox ?? [];
  const items = searchQuery
    ? allItems.filter(
        (i) =>
          i.path.toLowerCase().includes(searchQuery) ||
          (i.excerpt || "").toLowerCase().includes(searchQuery) ||
          i.author.toLowerCase().includes(searchQuery),
      )
    : allItems;
  const section = document.createElement("section");
  section.className = "inbox";
  section.setAttribute("aria-label", "Feedback recibido");

  const head = document.createElement("header");
  head.className = "inbox-head";

  const title = document.createElement("h2");
  title.textContent = "Feedback recibido";

  const counter = document.createElement("p");
  counter.className = "inbox-count";
  counter.textContent = items.length === 1 ? "1 comentario" : `${items.length} comentarios`;
  head.append(title, counter);
  section.appendChild(head);

  if (payload.inboxError) {
    const err = document.createElement("p");
    err.className = "inbox-empty";
    err.textContent = payload.inboxError;
    section.appendChild(err);
    return section;
  }

  if (items.length === 0) {
    const empty = document.createElement("p");
    empty.className = "inbox-empty inbox-empty-ok";
    empty.textContent = "Todo limpio — no hay comentarios pendientes.";
    section.appendChild(empty);
    return section;
  }

  const list = document.createElement("ul");
  list.className = "inbox-list";
  for (const item of items) {
    list.appendChild(renderInboxRow(ctx, item, payload.contentPath));
  }
  section.appendChild(list);
  return section;
}

function renderInboxRow(ctx: HomeContext, item: InboxRow, contentPath: string): HTMLLIElement {
  const li = document.createElement("li");
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "inbox-row";
  btn.addEventListener("click", () => {
    ctx.post({
      type: "openInbox",
      path: item.path,
      prNumber: item.prNumber,
      threadId: item.threadId,
      prUrl: item.prUrl,
      snippet: item.snippet,
      line: item.line,
      startLine: item.startLine,
    });
  });

  const pr = document.createElement("span");
  pr.className = "inbox-pr";
  pr.textContent = `#${item.prNumber}`;

  const path = document.createElement("span");
  path.className = "inbox-path";
  path.textContent = shortDraftPath(item.path, contentPath);

  const excerpt = document.createElement("span");
  excerpt.className = "inbox-excerpt";
  excerpt.textContent = item.excerpt || "Comentario";

  const meta = document.createElement("span");
  meta.className = "inbox-meta";
  const author = item.author.startsWith("@") ? item.author : `@${item.author}`;
  const age = relativeTime(item.createdAt);
  meta.textContent = age ? `${author} · ${age}` : author;

  btn.append(pr, path, excerpt, meta);
  li.appendChild(btn);
  return li;
}
