import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const root = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(root, "../..");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@slash-md/core": path.join(repo, "packages/core/src"),
      "@slash-md/github": path.join(repo, "packages/github/src"),
      "@slash-md/ui": path.join(repo, "packages/ui/src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: [path.join(root, "src/test/setup.ts")],
    include: ["src/**/*.spec.{ts,tsx}"],
  },
});
