# Slash MD — Usage guide (PO)

Notion-like Markdown editor for Cursor / VS Code. Drafts live on your machine; GitHub is version control.

## Install

1. Get the `.vsix` (from your team, or `npm run package` in the extension repo).
2. In Cursor: **Extensions** → `⋯` → **Install from VSIX…** → pick the file.
3. Reload the window if prompted.

## First time (once)

1. Open the **docs repo** (not the code repo).
2. Command Palette → `Slash MD: Init` (or Init in **Home**).
3. Confirm the GitHub repo if asked.
4. Choose **publish mode**:
   - **Workspace** — shared docs: Review opens a PR; Publish merges after approval.
   - **Personal** — solo docs: Publish commits and pushes straight to the default branch (no PR).
5. Sign in to GitHub when Cursor prompts (`repo` scope).

Init writes **`.slashmd.json`** at the repo root (not `.vscode/settings.json`). If it already exists, it updates it. Example: [slashmd.example.json](slashmd.example.json).

```json
{
  "repo": "SaulMoreyra/docs-sandbox",
  "contentPath": "docs",
  "defaultBranch": "main",
  "mode": "workspace",
  "sections": ["producto", "specs", "decisions"]
}
```

Missing `mode` defaults to **workspace**.

## Day to day (docs repo)

1. Command Palette → **`Slash MD: Home`** (or the home icon on the Slash MD bar). **Home** is the main library (workspace-style layout).
2. In **Home**: tree on the left, stage on the right. Click a page for preview (Open / Rename / Delete). Double-click or **Open** opens the editor. **New page** creates a doc; **New folder** adds a folder (stored in `.slashmd.json` → `sections`, shown even when empty).
3. **Rename** changes the draft path. **Delete** marks removal on GitHub; confirm with **Review** → **Publish** (Workspace) or **Publish** alone (Personal). To undo: Delete → *Cancel delete*.
4. In the Activity Bar, **Drafts** / **Pages** are native shortcuts. Use **Home** for the full UI.
5. In the draft editor, the **title** is the large text at the top. Hover near the title to **Add cover** — pick a color or **Upload image**. On the banner: Change / Reposition (images only) / Remove. Type `/` for blocks. Saves to the draft.

### If you already have the repo cloned

Right-click a `.md` in Explorer → **Edit with Slash MD**.  
That opens a **copy** (draft). The Explorer file does **not** change as you type. After **Publish**, update the clone with `git pull`.

## Workspace mode (`"mode": "workspace"`)

Bar shows **Review** + **Publish**.

1. **Review** → creates or updates a Pull Request.
2. A teammate **approves** the PR on GitHub (you usually cannot approve your own if required reviewers are on).
3. When the PR is approved and checks are green → **Publish** merges the PR into `main`.

If Publish is blocked, the bar says why (`needs approval`, `checks failing`, `conflict`, `no GitHub session`).

### Comments on the canvas (Workspace + open PR)

While a draft is **in review**, PR review threads appear on the page:

- Highlight + bubble on matching text; unmatched threads in the **Unanchored** rail.
- Click a bubble to read the thread, **Reply**, **Resolve**, or open on GitHub.
- Select text → **Comment** (may push the draft to the review branch first if you are ahead).

Personal mode has no PRs, so comments stay off.

## Personal mode (`"mode": "personal"`)

Bar shows **Publish** only (no Review).

1. Edit the draft.
2. **Publish** → commit + push to the default branch (`main` by default).

Use this for solo docs repos without required PR reviews. If the default branch is protected against direct pushes, Publish fails with a clear message — switch to **Workspace** mode or relax branch protection.

## Editor mode (local Markdown, no GitHub)

Useful outside the docs repo, or when you only want WYSIWYG:

1. Right-click a `.md` → **Open with Slash MD** (or Command Palette → `Slash MD: Open with Slash MD`).
2. You edit the **real file** (autosave in place). No Review / Publish.
3. Optional: `Slash MD: Use as default Markdown editor` (or setting `slash-md.useAsDefaultMarkdown`) so all `*.md` open this way. Turn off with **Stop using as default Markdown editor**.

In the **docs repo**, keep using **Edit with Slash MD** (claim → draft + Publish path), not in-place Editor mode.

## What it does not do

- It does not replace GitHub’s PR UI for approvals (Workspace mode).
- Code-repo `README.md` files are not claimed by default (only `*.slash.md` drafts and what you open via Slash MD).
