import type { ReviewPreviewItem } from "../../src/domain/homeProtocol";
import type { HomeContext } from "../context";
import { chip } from "../dom/chip";

export function showReviewPreviewModal(ctx: HomeContext, items: ReviewPreviewItem[]): void {
  const existing = document.getElementById("review-preview-modal");
  if (existing) {
    existing.remove();
  }

  const overlay = document.createElement("div");
  overlay.id = "review-preview-modal";
  overlay.className = "review-modal-overlay";
  overlay.addEventListener("click", (ev) => {
    if (ev.target === overlay) {
      overlay.remove();
    }
  });

  const modal = document.createElement("div");
  modal.className = "review-modal";

  const head = document.createElement("header");
  head.className = "review-modal-head";
  const title = document.createElement("h2");
  title.textContent = "Confirmar revisión";
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "review-modal-close";
  closeBtn.textContent = "Cerrar";
  closeBtn.addEventListener("click", () => overlay.remove());
  head.append(title, closeBtn);
  modal.appendChild(head);

  if (items.length === 0) {
    const empty = document.createElement("p");
    empty.className = "review-modal-empty";
    empty.textContent = "No hay páginas seleccionadas para enviar.";
    modal.appendChild(empty);
  } else {
    const list = document.createElement("ul");
    list.className = "review-modal-list";
    for (const item of items) {
      const li = document.createElement("li");
      li.className = "review-modal-item";

      const itemTitle = document.createElement("span");
      itemTitle.className = "review-modal-title";
      itemTitle.textContent = item.title;

      const itemBadge = document.createElement("span");
      itemBadge.className = "review-modal-badge";
      itemBadge.textContent = item.badge;

      const itemSummary = document.createElement("span");
      itemSummary.className = "review-modal-summary";
      itemSummary.textContent = item.summary;

      li.append(itemTitle, itemBadge, itemSummary);
      list.appendChild(li);
    }
    modal.appendChild(list);
  }

  const foot = document.createElement("footer");
  foot.className = "review-modal-foot";
  const cancel = chip("Cancelar", "ghost", () => overlay.remove());
  const send = chip("Enviar a Revisión", "fill", () => {
    overlay.remove();
    ctx.post({ type: "reviewBatch" });
  });
  send.disabled = items.length === 0;
  foot.append(cancel, send);
  modal.appendChild(foot);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}
