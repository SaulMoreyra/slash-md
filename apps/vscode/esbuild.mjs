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

const webviewShared = {
  ...shared,
  format: "iife",
  platform: "browser",
  target: "es2022",
  absWorkingDir: repoRoot,
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
};

const webviewCtx = await esbuild.context({
  ...webviewShared,
  minify: true,
  entryPoints: [path.join(repoRoot, "packages/ui/src/editor/main.ts")],
  outfile: path.join(__dirname, "dist/webview.js"),
});

const homeCtx = await esbuild.context({
  ...webviewShared,
  entryPoints: [path.join(repoRoot, "packages/ui/src/home/home.ts")],
  outfile: path.join(__dirname, "dist/home.js"),
});

if (watch) {
  await Promise.all([extensionCtx.watch(), webviewCtx.watch(), homeCtx.watch()]);
  console.log("watching…");
} else {
  await Promise.all([extensionCtx.rebuild(), webviewCtx.rebuild(), homeCtx.rebuild()]);
  await Promise.all([extensionCtx.dispose(), webviewCtx.dispose(), homeCtx.dispose()]);
}
