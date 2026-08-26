import * as esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const watch = process.argv.includes("--watch");

const shared = {
  bundle: true,
  sourcemap: true,
  minify: false,
};

const extensionCtx = await esbuild.context({
  ...shared,
  entryPoints: [path.join(__dirname, "src/extension.ts")],
  outfile: path.join(__dirname, "dist/extension.js"),
  external: ["vscode"],
  format: "cjs",
  platform: "node",
  absWorkingDir: repoRoot,
});

const webviewCtx = await esbuild.context({
  ...shared,
  minify: true,
  format: "iife",
  platform: "browser",
  target: "es2022",
  absWorkingDir: repoRoot,
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  entryPoints: [path.join(repoRoot, "packages/ui/src/editor/main.ts")],
  outfile: path.join(__dirname, "dist/webview.js"),
});

if (watch) {
  await Promise.all([extensionCtx.watch(), webviewCtx.watch()]);
  console.log("watching…");
} else {
  await Promise.all([extensionCtx.rebuild(), webviewCtx.rebuild()]);
  await Promise.all([extensionCtx.dispose(), webviewCtx.dispose()]);
}
