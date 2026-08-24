import { normalizeMarkdown } from "../../../src/domain/markdown";
import type { EditorContext } from "../context";

export const SAVE_DEBOUNCE_MS = 300;

export function scheduleSave(ctx: EditorContext, markdown: string): void {
  if (ctx.timers.save) {
    clearTimeout(ctx.timers.save);
  }
  ctx.timers.save = setTimeout(() => {
    ctx.state.lastSent = normalizeMarkdown(markdown);
    ctx.handles.bar.persist(markdown);
    ctx.post({ type: "edit", text: markdown });
  }, SAVE_DEBOUNCE_MS);
}

export function flushPendingSave(ctx: EditorContext): void {
  if (ctx.timers.save) {
    clearTimeout(ctx.timers.save);
    ctx.timers.save = undefined;
  }
}

export function flushMarkdown(ctx: EditorContext): string | undefined {
  flushPendingSave(ctx);
  const { crepe } = ctx.state;
  if (!crepe) {
    return undefined;
  }
  const markdown = crepe.getMarkdown();
  ctx.state.lastSent = normalizeMarkdown(markdown);
  ctx.handles.bar.persist(markdown);
  return markdown;
}
