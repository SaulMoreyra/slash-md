import type { FrontmatterFields, HostToWebview, WebviewToHost } from "../src/protocol";

/** Hero title edits frontmatter.title; owner/status/updated are host-stamped. */
export function mountFrontmatter(
  vscode: { postMessage(message: WebviewToHost): void },
  initial: FrontmatterFields,
): { apply(fields: FrontmatterFields): void } {
  const hero = document.getElementById("hero-title")!;

  apply(initial);

  hero.addEventListener("input", () => {
    syncEmpty();
    const value = hero.textContent?.replace(/\u00a0/g, " ").trim() ?? "";
    document.title = value || "Untitled";
    vscode.postMessage({ type: "frontmatter", field: "title", value });
  });

  hero.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      hero.blur();
      const canvas = document.querySelector(".milkdown .ProseMirror") as HTMLElement | null;
      canvas?.focus();
    }
  });

  hero.addEventListener("paste", (ev) => {
    ev.preventDefault();
    const text = ev.clipboardData?.getData("text/plain") ?? "";
    document.execCommand("insertText", false, text.replace(/\s+/g, " ").trim());
  });

  window.addEventListener("message", (event: MessageEvent<HostToWebview>) => {
    if (event.data?.type === "frontmatter") {
      apply(event.data.fields);
    }
  });

  function apply(fields: FrontmatterFields): void {
    const next = fields.title ?? "";
    if ((hero.textContent ?? "") !== next) {
      hero.textContent = next;
    }
    document.title = next || "Untitled";
    syncEmpty();
  }

  function syncEmpty(): void {
    const empty = !(hero.textContent ?? "").trim();
    hero.classList.toggle("is-empty", empty);
  }

  return { apply };
}
