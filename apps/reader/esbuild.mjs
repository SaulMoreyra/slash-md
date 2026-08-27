import * as esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const watch = process.argv.includes("--watch");

const shared = {
  bundle: true,
  sourcemap: true,
  absWorkingDir: repoRoot,
};

const browser = await esbuild.context({
  ...shared,
  minify: true,
  format: "iife",
  platform: "browser",
  target: "es2022",
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  entryPoints: [path.join(__dirname, "src/main.ts")],
  outfile: path.join(__dirname, "dist/reader.js"),
  loader: { ".css": "css" },
});

const cli = await esbuild.context({
  ...shared,
  format: "esm",
  platform: "node",
  target: "es2022",
  packages: "bundle",
  entryPoints: [path.join(__dirname, "src/cli.ts")],
  outfile: path.join(__dirname, "dist/build-site.mjs"),
});

if (watch) {
  await Promise.all([browser.watch(), cli.watch()]);
} else {
  await Promise.all([browser.rebuild(), cli.rebuild()]);
  await browser.dispose();
  await cli.dispose();
}
