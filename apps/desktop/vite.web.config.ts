import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const root = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(root, "../..");

const aliases = {
  "@slash-md/core": path.join(repo, "packages/core/src"),
  "@slash-md/github": path.join(repo, "packages/github/src"),
  "@slash-md/ui": path.join(repo, "packages/ui/src"),
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "./",
  resolve: { alias: aliases },
  build: {
    outDir: "dist-web",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.join(root, "index.web.html"),
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  optimizeDeps: {
    include: ["@milkdown/crepe", "mermaid", "react", "react-dom"],
  },
});