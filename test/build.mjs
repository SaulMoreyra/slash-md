import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["test/roundtrip.ts"],
  outfile: "dist/test-roundtrip.mjs",
  bundle: true,
  format: "esm",
  platform: "node",
  target: "es2022",
  sourcemap: "inline",
  packages: "bundle",
});
