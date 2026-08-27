# Slash MD

Notion-like Markdown editor for product docs. Pages are real `.md` files in your repo; GitHub handles review and publishing.

Two apps share the same engine (`packages/core`, `packages/ui`, `packages/github`):

| App | Where | Who it’s for |
| --- | --- | --- |
| **Desktop (SlashMD)** | Electron (`apps/desktop`) | Wiki: nav, drafts, review, publish, and editor in one window |
| **VS Code / Cursor** | Extension (`apps/vscode`) | WYSIWYG Markdown editor inside the IDE |

![Slash MD icon](media/slash.png)

## What you get

### Desktop (wiki)

- **Local-first pages** — files live under `contentPath` (e.g. `docs/producto/mi-nota.md`); autosave writes the disk file
- **Workspace mode** — select drafts → **Mandar a Revisión** → one PR → comments on the canvas → **Aprobar y Publicar**
- **Personal mode** — **Publish** commits and pushes straight to the default branch (no PR)
- **Home** — library, staging, feedback inbox, and lote PR status
- **Team templates** — optional `_templates/` in the docs repo

### VS Code / Cursor (editor)

- **WYSIWYG Markdown** — slash menu (`/h1`, `/code`, `/callout`, `/diagram`, …), covers, page icons, Mermaid flowcharts
- **Open with Slash MD** — edit the real `.md` in place (autosave)
- **Images on disk** — paste or `/image` saves to `{folder}/images/` with relative paths in the Markdown
- Optional **default Markdown editor** (`slash-md.useAsDefaultMarkdown`)

Product flows (with diagrams): [docs/FLOWS.md](docs/FLOWS.md). Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Desktop (SlashMD)

From the repo root:

```bash
npm install
npm run desktop:dev
```

Open a folder from the terminal (like `code .` / `cursor .`):

```bash
# with the app already running
slash .
slash ~/Repositorios/Personal
```

Put `slash` on your PATH once:

```bash
mkdir -p ~/.local/bin
ln -sf "$(pwd)/apps/desktop/bin/slash" ~/.local/bin/slash
# add ~/.local/bin to PATH if needed, then: hash -r
```

Or from the repo without installing: `npm run slash -- .`

1. **Abrir carpeta** and pick your docs repo.
2. **Iniciar** writes `.slashmd.json` if the folder does not have one.
3. Write in the editor; stage drafts in the middle pane → **Mandar a revisión**.

Production bundle: `npm run desktop:build`, then `npm run start -w @slash-md/desktop`.

macOS installers (arm64 `.dmg` + `.zip`): `npm run desktop:pack` → `apps/desktop/release/`.

If macOS says the download is damaged, it is Gatekeeper (the file is fine). After copying SlashMD to Applications:

```bash
xattr -cr /Applications/SlashMD.app
open /Applications/SlashMD.app
```

Or System Settings → Privacy & Security → Open Anyway. A Developer ID + notarized build is the long-term fix.

**GitHub sign-in:** `gh auth login` only authenticates the CLI. You still have to connect inside SlashMD (account menu → **Iniciar sesión**). The installed `.app` often cannot see Homebrew `gh`; if **Conectar como @…** does not appear, paste a classic token with `repo` scope. Details: [docs/USAGE.md](docs/USAGE.md#sign-in-to-github-desktop).

## VS Code / Cursor extension

1. Open the Extensions view in VS Code or Cursor.
2. Search for **Slash MD** (publisher `saulmoreyra`), or install a `.vsix` via **⋯ → Install from VSIX…**.
3. Right-click a `.md` file → **Open with Slash MD**.

Optional: Command Palette → **Slash MD: Use as default Markdown editor**.

Marketplace packaging: [docs/PUBLISH.md](docs/PUBLISH.md). Wiki walkthrough (Desktop): [docs/USAGE.md](docs/USAGE.md).

## Quick start (Desktop wiki)

1. Clone or open your docs repo.
2. **Init** → writes `.slashmd.json` at the repo root.
3. **Nueva página** → pick a template → write.
4. Check pages in **Borradores** → **Mandar a Revisión**.
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

- **Desktop:** Node 18+; Git + GitHub (`repo` scope) for review and publish. Connecting GitHub CLI is a second step in the app — see [sign-in](docs/USAGE.md#sign-in-to-github-desktop).
- **Extension:** VS Code / Cursor `^1.85.0`
- Docs folder opened as the workspace (Desktop happy path)

## Development

```
apps/
  desktop/    Electron wiki app
  vscode/     VS Code / Cursor Markdown editor (VSIX)
packages/
  core/       Domain, paths, protocols
  ui/         Editor + Home UI
  github/     GitHub API + inbox / lote models
```

```bash
npm install
npm run desktop:dev    # Electron
npm run build          # extension bundles → apps/vscode/dist
npm test
npm run package        # → apps/vscode/slash-md-<version>.vsix
```

F5 / debug uses `--extensionDevelopmentPath=apps/vscode`.

## License

MIT — see [LICENSE](LICENSE).
