import { joinSitePath } from "@slash-md/core/sitePages";
import type { SiteBoot } from "./types";

export function shellHtml(boot: SiteBoot, title: string): string {
  const cssHref = joinSitePath(boot.basePath, "assets/reader.css");
  const jsHref = joinSitePath(boot.basePath, "assets/reader.js");
  const payload = JSON.stringify(boot).replace(/</g, "\\u003c");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="${cssHref}" />
</head>
<body>
  <div id="app">Loading…</div>
  <script>window.__SLASH_MD__ = ${payload};</script>
  <script src="${jsHref}" defer></script>
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
