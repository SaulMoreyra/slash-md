import { setFrontmatterField } from "./frontmatter";
import { todayDate } from "./templates";

export type DocLifecycle = "draft" | "review" | "published";

/** Stamp automatic YAML fields. Does not touch `title`. */
export function stampDocMeta(
  markdown: string,
  opts: { status?: DocLifecycle; owner?: string; touchUpdated?: boolean },
): string {
  let next = markdown;
  if (opts.owner?.trim()) {
    next = setFrontmatterField(next, "owner", opts.owner.trim());
  }
  if (opts.status) {
    next = setFrontmatterField(next, "status", opts.status);
  }
  if (opts.touchUpdated !== false) {
    next = setFrontmatterField(next, "updated", todayDate());
  }
  return next;
}
