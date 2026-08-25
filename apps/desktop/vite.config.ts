import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron";
import renderer from "vite-plugin-electron-renderer";

const root = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(root, "../..");

const aliases = {
  "@slash-md/core": path.join(repo, "packages/core/src"),
  "@slash-md/github": path.join(repo, "packages/github/src"),
  "@slash-md/ui": path.join(repo, "packages/ui/src"),
};

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: path.join(root, "electron/main.ts"),
        vite: {
          resolve: { alias: aliases },
          build: {
            outDir: path.join(root, "dist-electron"),
            emptyOutDir: false,
            lib: {
              entry: path.join(root, "electron/main.ts"),
              formats: ["cjs"],
              fileName: () => "main.js",
            },
            rollupOptions: {
              external: ["electron"],
            },
          },
        },
      },
      {
        entry: path.join(root, "electron/preload.ts"),
        onstart({ reload }) {
          reload();
        },
        vite: {
          resolve: { alias: aliases },
          build: {
            outDir: path.join(root, "dist-electron"),
            emptyOutDir: false,
            lib: {
              entry: path.join(root, "electron/preload.ts"),
              formats: ["cjs"],
              fileName: () => "preload.js",
            },
            rollupOptions: {
              external: ["electron"],
            },
          },
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: aliases,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  optimizeDeps: {
    include: ["@milkdown/crepe", "mermaid", "react", "react-dom"],
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
