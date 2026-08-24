import fs from "node:fs";
import path from "node:path";
import type { SuiteCtx } from "../harness";

const ALLOWED = new Set([
  "webview/home/homeController.ts",
  "webview/editor/editorController.ts",
]);

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full, acc);
    } else if (name.endsWith(".ts")) {
      acc.push(full);
    }
  }
  return acc;
}

/** Ensures only controllers register host message listeners in active webview bundles. */
export function runMessageListenerSuite(ctx: SuiteCtx): void {
  const webviewRoot = path.join(ctx.root, "webview");
  const files = walk(webviewRoot).filter(
    (file) =>
      file.includes(`${path.sep}home${path.sep}`) || file.includes(`${path.sep}editor${path.sep}`),
  );

  for (const file of files) {
    const rel = path.relative(ctx.root, file).split(path.sep).join("/");
    const text = fs.readFileSync(file, "utf8");
    if (!text.includes('addEventListener("message"') && !text.includes("addEventListener('message'")) {
      continue;
    }
    ctx.assert(ALLOWED.has(rel), `message listener only in controllers: ${rel}`);
  }
}
