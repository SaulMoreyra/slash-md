import type { HomeTreePayload, LoteReviewSummary } from "@slash-md/core/homeTypes";
import type { HomeContext } from "../context";
import { chip } from "../dom/chip";

export function renderLoteReviewCard(
  ctx: HomeContext,
  review: LoteReviewSummary,
  payload: HomeTreePayload,
): HTMLElement {
  const section = document.createElement("section");
  section.className = "lote-review";
  section.setAttribute("aria-label", "En revisión");

  const head = document.createElement("header");
  head.className = "lote-review-head";

  const title = document.createElement("h2");
  title.textContent = "En revisión";
  head.appendChild(title);

  const badge = document.createElement("span");
  badge.className = `lote-review-state lote-review-state--${review.state}`;
  badge.textContent =
    review.state === "open"
      ? `#${review.prNumber}`
      : review.state === "merged"
        ? `#${review.prNumber} · merged`
        : `#${review.prNumber} · closed`;
  head.appendChild(badge);
  section.appendChild(head);

  const info = document.createElement("div");
  info.className = "lote-review-info";

  const statusLine = document.createElement("p");
  statusLine.className = "lote-review-status";
  const parts: string[] = [];
  if (review.approvals > 0) {
    parts.push(`${review.approvals} aprobación${review.approvals === 1 ? "" : "es"}`);
  } else {
    parts.push("esperando aprobación");
  }
  if (review.checksOk === true) {
    parts.push("checks OK");
  } else if (review.checksOk === false) {
    parts.push("checks failing");
  } else {
    parts.push("checks pending");
  }
  statusLine.textContent = parts.join(" · ");
  info.appendChild(statusLine);

  if (review.reviewers.length > 0) {
    const reviewers = document.createElement("p");
    reviewers.className = "lote-review-reviewers";
    reviewers.textContent = `Reviewers: ${review.reviewers.map((r) => `@${r}`).join(", ")}`;
    info.appendChild(reviewers);
  }

  if (review.branch) {
    const branchEl = document.createElement("p");
    branchEl.className = "lote-review-branch";
    branchEl.textContent = review.branch;
    info.appendChild(branchEl);
  }

  section.appendChild(info);

  const actions = document.createElement("div");
  actions.className = "lote-review-actions hang-actions";

  const openPr = chip("Abrir en GitHub", "outline", () => {
    ctx.post({ type: "openInbox", path: "", prNumber: review.prNumber, threadId: "" });
  });
  actions.appendChild(openPr);

  if (review.state === "open" && payload.canPublishBatch) {
    const pub = chip("Aprobar y Publicar", "fill", () => {
      ctx.post({ type: "publishBatch" });
    });
    actions.appendChild(pub);
  }

  section.appendChild(actions);
  return section;
}
