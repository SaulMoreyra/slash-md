import type { HomeContext } from "../context";
import { emptyPanel } from "../dom/emptyPanel";
import { chip } from "../dom/chip";
import { selectFolder } from "../selection";
import { collectIndex, filterTreeNodes, findFolder } from "../utils/tree";
import { renderInbox } from "./inbox";
import { renderLoteReviewCard } from "./loteReview";
import { renderSheet } from "./sheet";
import { renderPublishLote, renderStaging } from "./staging";

export function renderStage(ctx: HomeContext): void {
  const { dom, state } = ctx;
  dom.stageInner.replaceChildren();
  const payload = state.lastPayload;
  const { selection, searchQuery } = state;

  if (selection.kind === "config") {
    return;
  }

  if (!payload || payload.needsInit) {
    dom.stageInner.appendChild(
      emptyPanel({
        title: "Conecta tu biblioteca",
        body: "Un Init escribe .slashmd.json y deja este folder listo para escribir. Sin commits todavía.",
        action: { label: "Iniciar", onClick: () => ctx.post({ type: "init" }) },
      }),
    );
    return;
  }

  if (payload.needsAuth) {
    dom.stageInner.appendChild(
      emptyPanel({
        title: "Una sesión de GitHub y listo",
        body: "Sirve para listar páginas remotas y el feedback. Si ya abriste el repo de docs como folder, puedes escribir igual.",
        action: { label: "Iniciar sesión", onClick: () => ctx.post({ type: "signIn" }) },
      }),
    );
    return;
  }

  const filteredRoots = filterTreeNodes(payload.roots, searchQuery);
  const all = collectIndex(filteredRoots);
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
        : "Biblioteca";
  head.appendChild(title);

  const lede = document.createElement("p");
  lede.className = "lede";
  const source = payload.fromWorkspace ? "este workspace" : "GitHub";
  if (selection.kind === "file") {
    lede.classList.add("lede-path");
    lede.textContent = selection.path;
  } else if (selection.kind === "folder") {
    lede.textContent =
      entries.length === 0
        ? "Carpeta vacía — Nueva página crea la primera nota aquí."
        : `${entries.length} página${entries.length === 1 ? "" : "s"} en esta carpeta.`;
  } else {
    lede.textContent =
      entries.length === 0
        ? searchQuery
          ? "Nada coincide con esa búsqueda."
          : "Todavía no hay páginas. Empieza con Nueva página — queda como un .md normal en el disco."
        : `${payload.repo} · ${source} · ${entries.length} página${entries.length === 1 ? "" : "s"}.`;
  }
  head.appendChild(lede);

  if (!payload.indexPath && !payload.needsInit && selection.kind === "none" && !searchQuery) {
    const createIdx = document.createElement("p");
    createIdx.className = "folder-links";
    const link = document.createElement("button");
    link.type = "button";
    link.className = "cta-text";
    link.textContent = "Crear índice";
    link.addEventListener("click", () => ctx.post({ type: "createIndex" }));
    createIdx.appendChild(link);
    head.appendChild(createIdx);
  }

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
          selectFolder(ctx, full);
        });
        folders.appendChild(link);
        if (i < nested.length - 1) {
          folders.append(" · ");
        }
      });
      head.appendChild(folders);
    }

    const folderActions = document.createElement("div");
    folderActions.className = "row-actions hang-actions";
    folderActions.append(
      chip("Rename folder", "outline", () =>
        ctx.post({ type: "renameFolder", path: selection.kind === "folder" ? selection.path : "" }),
      ),
    );
    head.appendChild(folderActions);
  }

  if (selection.kind === "file") {
    const path = selection.path;
    const actions = document.createElement("div");
    actions.className = "row-actions hang-actions";
    actions.append(
      chip("Open", "fill", () => ctx.post({ type: "open", path })),
      chip("Rename", "outline", () => ctx.post({ type: "rename", path })),
      chip("Delete", "danger", () => ctx.post({ type: "delete", path })),
    );
    head.appendChild(actions);
  }

  dom.stageInner.appendChild(head);

  const staging = renderStaging(ctx, payload);
  if (staging) {
    dom.stageInner.appendChild(staging);
  } else if (payload.canPublishBatch) {
    dom.stageInner.appendChild(renderPublishLote(ctx, payload));
  }

  if (payload.loteReview) {
    dom.stageInner.appendChild(renderLoteReviewCard(ctx, payload.loteReview, payload));
  }

  dom.stageInner.appendChild(renderInbox(ctx, payload));

  if (entries.length === 0) {
    return;
  }

  dom.stageInner.appendChild(renderSheet(ctx, entries));
}
