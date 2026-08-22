# slash-md

VS Code / Cursor extension: Notion-like Markdown WYSIWYG (`/h1`, `/code`, …), local autosave drafts, GitHub as version control.

Goal: a **Product Owner** writes docs on GitHub, developers consume them easily, without paying for another docs platform.

- **Workspace mode** (`.slashmd.json` `"mode": "workspace"`) — **Review** opens a PR; **Publish** merges after approval
- **Personal mode** (`"mode": "personal"`) — **Publish** commits and pushes straight to the default branch (no PR)
- **Library** — **Home** (Notion-style sidebar) + Activity Bar shortcuts: Drafts + Pages
- **Editor** — page with hero title; dark/light automatic

Test docs repo: [SaulMoreyra/docs-sandbox](https://github.com/SaulMoreyra/docs-sandbox) (private).

## For the PO

Read **[docs/USAGE.md](docs/USAGE.md)** (install `.vsix`, Init, Workspace vs Personal).

Package the extension:

```bash
npm install
npm run package
```

Install the generated `.vsix` from Cursor → Extensions → Install from VSIX.

Docs repo config example: [docs/slashmd.example.json](docs/slashmd.example.json) (Init writes `.slashmd.json`; it does not write `.vscode/settings.json`).

## Development

F5 with **Run Slash MD**. Commands: `Slash MD: New`, `Slash MD: Open Draft`, `Slash MD: Open from GitHub`, `Slash MD: Edit with Slash MD`. Drafts are `*.slash.md` under `globalStorage/drafts/` (they do not hijack `README.md`).

## Docs

| Document | Content |
|---|---|
| [docs/USAGE.md](docs/USAGE.md) | One-page guide for the PO |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Closed decisions (product, stack, git, comments) |
| [docs/RESEARCH.md](docs/RESEARCH.md) | Architecture, Milkdown, comments mapping, competitive landscape |
| [docs/PLAN.md](docs/PLAN.md) | Phases, dependencies, v1 scope |
| [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md) | Per-phase checklist: what to do and how to validate |
| [docs/AUDIT.md](docs/AUDIT.md) | Plan audit against the purpose |
