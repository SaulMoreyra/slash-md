# Reading path — how others read your docs

Slash MD is a writer's tool. Readers don't need the extension — they just need a way to browse the published Markdown. Writer flows (review → publish): [FLOWS.md](FLOWS.md).

## Option 1 — GitHub (always works)

GitHub renders `.md` files natively. Readers navigate the repo tree or open direct links. This works for **all** repo visibility levels (public, private, internal).

**Recommended for private free-tier repos** where GitHub Pages is unavailable.

## Option 2 — GitHub Pages (public / Pro / Team / Enterprise)

Turn the content repo into a static site with zero build steps using [Docsify](https://docsify.js.org/).

### Quick setup

1. In the content repo, create `docs/index.html` (or copy `docs-site/index.html` from the extension repo — it works as-is).

2. Go to **Settings → Pages** in the content repo:
   - Source: **Deploy from a branch**
   - Branch: `main` (or your `defaultBranch`)
   - Folder: `/docs` (must match your `contentPath`)

3. Save. GitHub builds the site at `https://<owner>.github.io/<repo>/`.

The included `docs-site/index.html` is a single-file Docsify setup that reads `.md` files via fetch — no build, no Node, no CI.

### Customizing

Edit the `<script>` block in `index.html` to change:
- `name` — site title
- `repo` — GitHub corner link
- `loadSidebar` — set to `true` and add `_sidebar.md` for custom nav
- `search` — full-text search plugin (included)

See [Docsify configuration](https://docsify.js.org/#/configuration) for all options.

## Option 3 — Read in Slash MD

Share a deep link so another VS Code / Cursor user opens the doc directly:

```
vscode://saulmoreyra.slash-md/open?path=docs/getting-started.md
```

The recipient must have the extension installed and the content repo cloned. See [USAGE.md § Deep links](USAGE.md#deep-links).

## Decision guide

| Repo visibility | Recommended reading path |
|----------------|--------------------------|
| Public | GitHub Pages (Docsify) + GitHub rendered `.md` |
| Private (Pro / Team / Enterprise) | GitHub Pages (private Pages available) |
| Private (free tier) | GitHub rendered `.md` + Slash MD deep links |
| Internal (GHES / EMU) | GitHub Pages or rendered `.md` (depends on org policy) |

For teams already on the content repo, Slash MD deep links are the fastest way to jump to a specific section. For external audiences, Pages gives a polished reading experience with search.
