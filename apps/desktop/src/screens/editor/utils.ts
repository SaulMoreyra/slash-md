import type { PagePayload } from "../../../shared/api";
import { FrontmatterStatus, LifecycleKind } from "./enums";

export function crumbParts(trail: string | undefined, title: string, untitled = "Untitled"): string[] {
  const parts = (trail ?? "")
    .split(" / ")
    .map((part) => part.trim())
    .filter(Boolean);
  return [...parts, title || untitled];
}

export { LifecycleKind };

export function pageLifecycle(page: PagePayload): { kind: LifecycleKind } {
  const status = page.frontmatter.status.trim().toLowerCase();
  if (status === FrontmatterStatus.InReview) {
    return { kind: LifecycleKind.InReview };
  }
  if (status === FrontmatterStatus.Published) {
    return { kind: LifecycleKind.Published };
  }
  return { kind: LifecycleKind.Draft };
}
