import { createHash } from "node:crypto";
import { normalizeMarkdown } from "./markdown";

export function markdownHash(text: string): string {
  return createHash("sha256").update(normalizeMarkdown(text), "utf8").digest("hex");
}
