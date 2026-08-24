import { FrontmatterFields, HostToWebview, WebviewBoot } from "../domain/protocol";

export function editorHtml(opts: {
  nonce: string;
  cspSource: string;
  title: string;
  path: string;
  text: string;
  frontmatter: FrontmatterFields;
  imageMap: Record<string, string>;
  init: Extract<HostToWebview, { type: "init" }>;
  jsUri: string;
  cssUri: string;
}): string {
  const { nonce, cspSource, title, path, init, jsUri, cssUri } = opts;
  const boot: WebviewBoot = {
    init,
    text: opts.text,
    frontmatter: opts.frontmatter,
    imageMap: opts.imageMap,
  };
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${cspSource} https: data: blob:; font-src ${cspSource};" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="${cssUri}" />
</head>
<body class="workflow-${init.workflow}${init.workflow === "workspace" && init.repoMode === "personal" ? " repo-personal" : init.workflow === "workspace" ? " repo-workspace" : ""}${init.pageKind ? ` page-${init.pageKind}` : ""}">
  <header class="bar">
    <div class="path" id="path">${escapeHtml(path)}</div>
    <div class="status" id="status"></div>
    <div class="actions">
      <button type="button" class="review" id="review">Review</button>
      <button type="button" class="publish" id="publish" disabled>Publish</button>
    </div>
  </header>
  <div id="review-context" class="review-context" hidden role="status">
    <p id="review-context-text" class="review-context-text"></p>
    <div class="review-context-actions">
      <button type="button" id="review-context-open" class="review-context-btn">Open on GitHub</button>
      <button type="button" id="review-context-dismiss" class="review-context-dismiss" aria-label="Dismiss">×</button>
    </div>
  </div>
  <div class="page" id="page">
    <div id="cover" class="cover" hidden>
      <img id="cover-img" class="cover-img" alt="" draggable="false" />
      <div class="cover-toolbar">
        <button type="button" id="cover-change" class="cover-btn">Change</button>
        <button type="button" id="cover-reposition" class="cover-btn">Reposition</button>
        <button type="button" id="cover-remove" class="cover-btn">Remove</button>
      </div>
    </div>
    <div class="page-inner">
      <div class="page-chrome">
        <button type="button" id="icon-add" class="cover-add" aria-haspopup="dialog" aria-expanded="false">Add icon</button>
        <div class="cover-add-wrap">
          <button type="button" id="cover-add" class="cover-add" aria-haspopup="dialog" aria-expanded="false">Add cover</button>
          <div id="cover-menu" class="cover-menu" hidden role="dialog" aria-label="Cover">
            <button type="button" id="cover-upload" class="cover-menu-upload">Upload image</button>
            <p class="cover-menu-label">Color</p>
            <div class="cover-swatches" id="cover-swatches"></div>
          </div>
        </div>
      </div>
      <div id="hero-icon-wrap" class="hero-icon-wrap" hidden>
        <button type="button" id="hero-icon" class="hero-icon" hidden aria-haspopup="dialog" aria-expanded="false" aria-label="Page icon"></button>
      </div>
      <div class="hero">
        <div
          id="hero-title"
          class="hero-title"
          contenteditable="true"
          role="textbox"
          aria-label="Title"
          data-placeholder="Untitled"
          spellcheck="true"
        ></div>
        <button type="button" id="edited-btn" class="edited-btn" hidden aria-haspopup="dialog" aria-expanded="false">
          <span id="edited-avatars" class="edited-avatars" hidden></span>
          <span id="edited-label" class="edited-label">Edited</span>
        </button>
      </div>
      <div id="canvas"></div>
    </div>
    <div
      id="edited-popover"
      class="edited-popover"
      hidden
      role="dialog"
      aria-label="Page editors"
    ></div>
    <div
      id="icon-picker"
      class="icon-picker"
      hidden
      role="dialog"
      aria-label="Choose an icon"
    >
      <div class="icon-picker-head">
        <input id="icon-search" class="icon-search" type="search" placeholder="Filter…" aria-label="Search emoji" autocomplete="off" />
        <button type="button" id="icon-random" class="icon-picker-btn">Random</button>
        <button type="button" id="icon-remove" class="icon-picker-btn">Remove</button>
      </div>
      <div id="icon-cats" class="icon-cats" role="tablist" aria-label="Emoji categories"></div>
      <div id="icon-grid" class="icon-grid"></div>
    </div>
  </div>
  <input id="cover-file" type="file" accept="image/*" hidden />
  <aside id="thread-rail" class="thread-rail" hidden aria-label="Off-canvas review comments"></aside>
  <div id="thread-popover" class="thread-popover" hidden role="dialog" aria-label="Review thread"></div>
  <script nonce="${nonce}">window.__SLASH_MD__=${embedJson(boot)};</script>
  <script nonce="${nonce}" src="${jsUri}"></script>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function embedJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
