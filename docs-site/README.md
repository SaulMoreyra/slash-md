# docs-site — zero-build reading site

Copy `index.html` into the root of your content folder (e.g. `docs/`) in the documentation repo, then enable **GitHub Pages** on that folder.

## Setup

1. Copy `index.html` to `<content-repo>/docs/index.html`.
2. Optionally add a `README.md` in the same folder — Docsify uses it as the landing page.
3. In the content repo on GitHub: **Settings → Pages → Source: Deploy from a branch → Branch: main → Folder: /docs → Save**.
4. The site is live at `https://<owner>.github.io/<repo>/`.

## How it works

Docsify loads Markdown files via `fetch()` at runtime — no build step, no Node, no CI pipeline. Navigation follows the folder structure. The `search` plugin provides full-text search across all pages.

## Customization

Edit the `window.$docsify` block in `index.html`:

- `name` — appears in the sidebar header.
- `repo` — set to `"owner/repo"` for a GitHub corner link.
- `loadSidebar` — set to `true` and create `_sidebar.md` for custom navigation.
- `themeColor` — accent color.

See <https://docsify.js.org/#/configuration> for all options.

## Alternatives

- **GitHub rendered Markdown** — no setup needed; readers browse the repo directly.
- **Other static site generators** (MkDocs, VitePress, Docusaurus) — more features but require a build step.
