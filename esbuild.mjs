import * as esbuild from "esbuild";

const watch = process.argv.includes("--watch");

const shared = {
  bundle: true,
  sourcemap: true,
  minify: false,
};

const extensionCtx = await esbuild.context({
  ...shared,
  entryPoints: ["src/extension.ts"],
  outfile: "dist/extension.js",
  external: ["vscode"],
  format: "cjs",
  platform: "node",
});

const webviewShared = {
  ...shared,
  format: "iife",
  platform: "browser",
  target: "es2022",
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
};

const webviewCtx = await esbuild.context({
  ...webviewShared,
  minify: true,
  entryPoints: ["webview/editor/main.ts"],
  outfile: "dist/webview.js",
});

const homeCtx = await esbuild.context({
  ...webviewShared,
  entryPoints: ["webview/home/home.ts"],
  outfile: "dist/home.js",
});

if (watch) {
  await Promise.all([extensionCtx.watch(), webviewCtx.watch(), homeCtx.watch()]);
  console.log("watching…");
} else {
  await Promise.all([extensionCtx.rebuild(), webviewCtx.rebuild(), homeCtx.rebuild()]);
  await Promise.all([extensionCtx.dispose(), webviewCtx.dispose(), homeCtx.dispose()]);
}
