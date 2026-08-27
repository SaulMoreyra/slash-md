# Reading path — how others read your docs

Slash MD is a writer's tool. Readers don't need the app — they browse published Markdown. Writer flows (review → publish): [FLOWS.md](FLOWS.md).

## Option 1 — GitHub (always works)

GitHub renders `.md` files natively. Readers navigate the repo tree or open direct links. This works for **all** repo visibility levels (public, private, internal).

**Recommended for private free-tier repos** where GitHub Pages is unavailable.

## Option 2 — GitHub Pages (Slash MD reader)

Opt in with `site.enabled` in `.slashmd.json`. A reusable workflow builds a static site: folder tree, search, and the same Crepe preview as the desktop wiki (read-only).

### In Slash MD (Desktop)

Init / Settings → **Publish reading site (GitHub Pages)** when the mode is Team or Personal (not Local). That only writes `site.enabled`. It does **not** add the workflow or flip GitHub Settings.

### Workflow (once per docs repo)

```yaml
# .github/workflows/docs.yml
name: Docs site
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  site:
    uses: SaulMoreyra/slash-md/.github/workflows/publish-reader.yml@main
```

Until a `v1` tag exists, pin `@main`. After a release, pin the same ref as `reader_ref`.

Then in the docs repo: **Settings → Pages → Source: GitHub Actions** (not “Deploy from a branch” + `/docs` — that fights this reader).

The job no-ops (green, no deploy) unless `site.enabled` is `true`. Personal and Team wikis use the same YAML; the trigger is a push to the default branch.

Project sites live at `https://<owner>.github.io/<repo>/`. Private Pages still follow GitHub’s plan rules (public site on Pro/Team; private site only on Enterprise).

Implementation: [plan 11](plans/11-reader-site.md).

### Legacy — Docsify

`docs-site/index.html` is a zero-build Docsify shell. **Not recommended** for new wikis: it does not use the Slash MD parser (no Crepe callouts/hero). Prefer the reader above.

## Option 3 — Read in Slash MD

Share a deep link so another VS Code / Cursor user opens the doc directly:

```
vscode://saulmoreyra.slash-md/open?path=docs/getting-started.md
```

The recipient must have the extension installed and the content repo cloned. See [USAGE.md § Deep links](USAGE.md#deep-links).

## Decision guide

| Repo visibility | Recommended reading path |
|----------------|--------------------------|
| Public | GitHub Pages (Slash MD reader) + GitHub rendered `.md` |
| Private (Pro / Team / Enterprise) | GitHub Pages if you accept the plan’s visibility rules |
| Private (free tier) | GitHub rendered `.md` + Slash MD deep links |
| Internal (GHES / EMU) | GitHub Pages or rendered `.md` (depends on org policy) |

For teams already on the content repo, Slash MD deep links are the fastest way to jump to a specific section. For external audiences, Pages gives a polished reading experience with search.
