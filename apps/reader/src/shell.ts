import { joinSitePath } from "@slash-md/core/sitePages";
import type { SiteBoot } from "./types";

const THEME_KEY = "slash-md-theme";

export type SiteAssets = {
  css: string[];
  js: string[];
};

export function shellHtml(boot: SiteBoot, title: string, assets: SiteAssets): string {
  const cssLinks = assets.css
    .map((href) => `  <link rel="stylesheet" href="${href}" />`)
    .join("\n");
  const jsScripts = assets.js
    .map((href) => `  <script type="module" src="${href}"></script>`)
    .join("\n");
  const payload = JSON.stringify(boot).replace(/</g, "\\u003c");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light dark" />
  <title>${escapeHtml(title)}</title>
  <script>
    (function () {
      var theme = "light";
      try {
        var saved = window.localStorage.getItem("${THEME_KEY}");
        if (saved === "light" || saved === "dark") {
          theme = saved;
        } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
          theme = "dark";
        }
      } catch (error) {}
      window.__SLASHMD_INITIAL_THEME__ = theme;
      var root = document.documentElement;
      root.classList.add(theme);
      root.dataset.theme = theme;
    })();
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    rel="stylesheet"
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400&display=swap"
  />
${cssLinks}
</head>
<body>
  <div id="root"></div>
  <script>window.__SLASH_MD__ = ${payload};</script>
${jsScripts}
</body>
</html>
`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}