# Slash MD

Notion-like Markdown editor for **VS Code** and **Cursor**. Write product docs as real `.md` files in your repo; GitHub handles review and publishing.

![Slash MD icon](media/slash.png)

## Install

1. Open the Extensions view in VS Code or Cursor.
2. Search for **Slash MD** (publisher `saulmoreyra`), or install from a `.vsix` via **⋯ → Install from VSIX…**.
3. Open your **docs repository** as a folder.
4. Command Palette → **Slash MD: Init** (or **Init** in Home).
5. Sign in to GitHub when prompted (`repo` scope).

Full walkthrough: [docs/USAGE.md](docs/USAGE.md). Product flows (with diagrams): [docs/FLOWS.md](docs/FLOWS.md).

## What you get

- **WYSIWYG Markdown** — slash menu (`/h1`, `/code`, `/callout`, `/diagram`, …), covers, page icons, Mermaid flowcharts
- **Local-first pages** — files live under `contentPath` (e.g. `docs/producto/mi-nota.md`); autosave writes the disk file
- **Images on disk** — paste or `/image` saves to `{contentPath}/images/` with relative paths in the Markdown
- **Workspace mode** — select drafts → **Mandar a Revisión** → one PR → comments on the canvas → **Aprobar y Publicar**
- **Personal mode** — **Publish** commits and pushes straight to the default branch (no PR)
- **Home** — library, staging, feedback inbox, and lote PR status
- **Team templates** — optional `_templates/` in the docs repo

## Quick start

1. Clone or open your docs repo.
2. **Slash MD: Init** → writes `.slashmd.json` at the repo root.
3. **Home → New page** → pick a template → write.
4. Check pages in **Borradores locales** → **Mandar a Revisión**.
5. After approval → **Aprobar y Publicar**.

Example `.slashmd.json`:

```json
{
  "repo": "owner/docs-repo",
  "contentPath": "docs",
  "defaultBranch": "main",
  "mode": "workspace",
  "sections": ["producto", "specs", "decisions"]
}
```

Use `"contentPath": "."` if Markdown lives at the repo root. Use `"mode": "personal"` for solo docs without PRs.

## How others read the docs

Developers open the `.md` files on GitHub or in their IDE. Optional GitHub Pages / Docsify setup: [docs/READING.md](docs/READING.md) and [docs-site/](docs-site/).

## Requirements

- VS Code / Cursor `^1.85.0`
- Git + GitHub authentication (`repo` scope) for review and publish
- Docs folder opened as the workspace (happy path)

## Development

```bash
npm install
npm run build
npm test
npm run package    # → slash-md-<version>.vsix
```

Marketplace packaging checklist: [docs/PUBLISH.md](docs/PUBLISH.md).

## License

MIT — see [LICENSE](LICENSE).
