import type { HomeTreePayload } from "../../src/home/homeTree";
import type { HomeContext } from "../context";
import { chip } from "../dom/chip";
import { setDraftSelectionLocal, toggleDraftLocal } from "../selection";
import { shortDraftPath } from "../utils/format";

type StagingDraft = HomeTreePayload["drafts"][number];

export function renderStaging(ctx: HomeContext, payload: HomeTreePayload): HTMLElement | undefined {
  const { searchQuery } = ctx.state;
  const allDrafts = payload.drafts ?? [];
  const drafts = searchQuery
    ? allDrafts.filter((d) => d.title.toLowerCase().includes(searchQuery) || d.path.toLowerCase().includes(searchQuery))
    : allDrafts;
  if (allDrafts.length === 0) {
    return undefined;
  }
  const selected = new Set(payload.selected ?? []);
  const count = drafts.reduce((sum, draft) => sum + (selected.has(draft.path) ? 1 : 0), 0);

  const section = document.createElement("section");
  section.className = "staging";
  section.setAttribute("aria-label", "Borradores Locales");

  const head = document.createElement("header");
  head.className = "staging-head";

  const title = document.createElement("h2");
  title.textContent = "Borradores locales";

  const counter = document.createElement("p");
  counter.className = "staging-count";
  counter.textContent =
    count === 0
      ? "Elige páginas para el lote"
      : count === 1
        ? "1 lista para revisar"
        : `${count} listas para revisar`;

  head.append(title, counter);
  section.appendChild(head);

  const list = document.createElement("ul");
  list.className = "staging-list";
  for (const draft of drafts) {
    list.appendChild(renderStagingRow(ctx, draft, selected.has(draft.path), payload.contentPath));
  }
  section.appendChild(list);

  const actions = document.createElement("div");
  actions.className = "staging-actions hang-actions";

  const selectAll = chip("Seleccionar todas", "ghost", () => {
    setDraftSelectionLocal(ctx, drafts.map((draft) => draft.path));
    ctx.post({ type: "selectAllDrafts" });
  });

  const clear = chip("Quitar selección", "ghost", () => {
    setDraftSelectionLocal(ctx, []);
    ctx.post({ type: "setDraftSelection", paths: [] });
  });
  clear.disabled = count === 0;

  const review = chip("Mandar a Revisión", "fill", () => {
    ctx.post({ type: "previewReview" });
  });
  review.disabled = count === 0;

  const publish = chip("Aprobar y Publicar", "fill", () => {
    ctx.post({ type: "publishBatch" });
  });
  publish.disabled = !payload.canPublishBatch;

  actions.append(selectAll, clear, review, publish);
  section.appendChild(actions);
  return section;
}

export function renderPublishLote(ctx: HomeContext, payload: HomeTreePayload): HTMLElement {
  const section = document.createElement("section");
  section.className = "staging";
  section.setAttribute("aria-label", "Aprobar y Publicar");

  const head = document.createElement("header");
  head.className = "staging-head";
  const title = document.createElement("h2");
  title.textContent = "Aprobar y Publicar";
  head.appendChild(title);
  section.appendChild(head);

  const actions = document.createElement("div");
  actions.className = "staging-actions hang-actions";
  const publish = chip("Aprobar y Publicar", "fill", () => {
    ctx.post({ type: "publishBatch" });
  });
  publish.disabled = !payload.canPublishBatch;
  actions.appendChild(publish);
  section.appendChild(actions);
  return section;
}

function renderStagingRow(
  ctx: HomeContext,
  draft: StagingDraft,
  checked: boolean,
  contentPath: string,
): HTMLLIElement {
  const li = document.createElement("li");
  li.className = "staging-row";

  const box = document.createElement("input");
  box.type = "checkbox";
  box.className = "staging-check";
  box.checked = checked;
  box.setAttribute("aria-label", draft.title);
  box.addEventListener("change", () => {
    toggleDraftLocal(ctx, draft.path);
    ctx.post({ type: "toggleDraft", path: draft.path });
  });

  const body = document.createElement("div");
  body.className = "staging-body";

  const title = document.createElement("button");
  title.type = "button";
  title.className = "staging-title";
  title.textContent = draft.title;
  title.addEventListener("click", () => {
    ctx.post({ type: "open", path: draft.path });
  });

  const path = document.createElement("span");
  path.className = "staging-path";
  path.textContent = shortDraftPath(draft.path, contentPath);

  body.append(title, path);

  const badge = document.createElement("span");
  badge.className = "staging-badge";
  badge.textContent = draft.badge;

  li.append(box, body, badge);
  return li;
}
