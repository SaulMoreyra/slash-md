# Slash MD — Usage guide (PO)

Notion-like Markdown editor for Cursor / VS Code. Pages live in your docs repo; GitHub handles review and publishing.

## Install

### From the Marketplace

Search **Slash MD** in the Extensions view (VS Code or Cursor) and install.

### From a `.vsix`

1. Get the `.vsix` (from your team, or `npm run package` in the extension repo).
2. **Extensions** → `⋯` → **Install from VSIX…** → pick the file.
3. Reload the window if prompted.

## First time (once)

1. Open the **docs repo** as a folder in Cursor.
2. Command Palette → `Slash MD: Init` (or Init in **Home**).
3. Confirm the GitHub repo if asked.
4. Choose **publish mode**:
   - **Workspace** — shared docs: Review opens a PR; Publish merges after approval.
   - **Personal** — solo docs: Publish commits and pushes straight to the default branch (no PR).
5. Sign in to GitHub when Cursor prompts (`repo` scope).

Init writes **`.slashmd.json`** at the repo root. After a successful Init, **Home** opens automatically so you can start writing right away. Example config:

```json
{
  "repo": "SaulMoreyra/docs-sandbox",
  "contentPath": ".",
  "defaultBranch": "main",
  "mode": "workspace",
  "sections": ["producto", "specs", "decisions"]
}
```

Missing `mode` defaults to **workspace**. Missing `contentPath` defaults to **`.`** (repo root). Use `"contentPath": "docs"` if pages live under a `docs/` folder.

**Subfolder:** set `"contentPath": "docs"` (or any folder) when Markdown should not sit at the repo root. Team templates default to `_templates/` under that path (or `_templates/` at root when `contentPath` is `.`).

## The cycle: local-first wiki

Diagrams, surfaces (Home vs editor), and “how it should be used”: [FLOWS.md](FLOWS.md).

The recommended workflow for documentation:

### 1. New page (Borrador Local)

- **Home** → **New page** → pick a template → enter a title.
- Built-in templates: Blank, PRD, Spec, Decision, **Gallery** (every slash block, a Mermaid flowchart, and one code fence per language). **Team templates** from `docs/_templates/` (or `templatesPath` in `.slashmd.json`) appear first, marked **(team)**.
- Type `/diagram` (or `/mermaid` / `/flowchart`) to insert a flowchart. It is a ` ```mermaid ` fence: Slash MD draws it in the page, and GitHub does the same after publish. Click **Hide** on the block to see only the diagram.
- Copy the example from [docs/team-templates/](team-templates/) into your repo. Optional `_manifest.json` sets picker labels.
- A `.md` file is created under `contentPath` (e.g. `docs/producto/mi-nota.md`) with `status: draft` in its frontmatter.
- The editor opens immediately. Hover above the title for **Add icon** and **Add cover**. The icon is a single emoji in frontmatter (`icon: 🚀`); it is not part of the title text.
- Paste or insert an image (`/image`, cover, or drag): the file is saved under `{contentPath}/images/` (e.g. `docs/images/foto.png`). The Markdown keeps a relative path (`images/…` or `../images/…`). Covers use the same folder via YAML `cover:`. Images show up in Explorer and in `git status` like any other file, and Mandar a Revisión includes them when you send the page.
- Under the title, **Edited … ago** lists everyone who committed the page (git history) plus you while it is dirty. Click for avatars, edit counts, and dates.
- No GitHub call, no login needed — just start writing.
- Autosave writes to disk every 300 ms. Your file is a normal `.md` in the workspace.

### 2. Borradores Locales (staging)

- **Home** shows a **Borradores Locales** section listing every page that is `draft` or locally modified.
- Use the checkboxes to select the pages you want to send for review.
- Pages with `status: published` and no local changes do not appear.

### 3. Mandar a Revisión

- With pages selected, click **Mandar a Revisión**.
- Home shows a **preview** of the batch: each page’s title, status badge, and a short `git diff` summary. Confirm with **Enviar a Revisión** or cancel.
- Slash MD creates (or reuses) a branch `review/docs-YYYY-MM`, commits only the selected files, pushes, and opens a PR.
- Each file's frontmatter is updated to `status: in_review` with `pr: <number>`.
- Re-sending the same or updated pages pushes to the **same PR** — one review cycle per batch.
- While a lote PR is open, **Home** shows an **En revisión** card: PR number, reviewers, checks, branch, **Abrir en GitHub**, and **Aprobar y Publicar** when ready.

### 4. Feedback

- The Activity Bar badge shows unresolved review threads.
- **Home** → **Feedback recibido** lists every pending comment across your PRs.
- Click a comment to open the page and scroll to the matching block.
- Slash MD **does not switch git branches** when you open Feedback. If your local branch or PR does not match the comment’s PR, a banner appears with **Open on GitHub**. Your unsaved local work is left alone. If the file is not on disk, you get a toast with the same GitHub action.

### 5. Comments on the canvas (Workspace + open PR)

While a page is **in review**, PR review threads appear inline:

- Highlight + bubble on matching text; unmatched threads in the **Unanchored** rail (with **Abrir en GitHub** if the anchor moved).
- Click a bubble to read the thread, **Reply**, **Resolve**, or **Abrir en GitHub** from the popover.
- Select text → **Comment** (may push the page to the review branch first if you are ahead).

Personal mode has no PRs, so comments stay off.

### 6. Aprobar y Publicar

- A teammate approves the PR on GitHub.
- In **Home**, click **Aprobar y Publicar**. Slash MD merges the PR and pulls the changes locally.
- Each file's frontmatter becomes `status: published`.

If Publish is blocked, the UI says why (`needs approval`, `checks failing`, `conflict`, `no GitHub session`).

## Personal mode (`"mode": "personal"`)

Bar shows **Publish** only (no Review).

1. Edit the page.
2. **Publish** → commit + push to the default branch (`main` by default).

Use this for solo docs repos without required PR reviews. If the default branch is protected against direct pushes, Publish fails with a clear message — switch to **Workspace** mode or relax branch protection.

## Editor mode (local Markdown, no GitHub)

Useful outside the docs repo, or when you only want WYSIWYG:

1. Right-click a `.md` → **Open with Slash MD** (or Command Palette → `Slash MD: Open with Slash MD`).
2. You edit the **real file** (autosave in place). No Review / Publish.
3. Optional: `Slash MD: Use as default Markdown editor` (or setting `slash-md.useAsDefaultMarkdown`) so all `*.md` open this way. Turn off with **Stop using as default Markdown editor**.

### Wiki pages in the docs repo

When the file lives under your configured `contentPath` (Init / `.slashmd.json`):

- **Write in the editor** — WYSIWYG, images, comments on open PRs.
- **Review and Publish** — use **Home** only. The editor bar shows **Revisión en Home** (stages the page and opens Home). **Publish** is hidden; merge via **Aprobar y Publicar** in Home after GitHub approval.

Legacy `.slash.md` sidecar drafts still use **Review** / **Publish** in the editor bar.

## Activity Bar

The **Slash MD** icon in the Activity Bar shows two panels:

- **Pages** — the docs tree from the workspace (or GitHub).
- **Drafts** — legacy sidecar drafts (`.slash.md`). When the workspace is a docs wiki, this panel points you to **Home** instead, since pages live in the workspace directly.

Use **Home** for the full library UI: tree, staging, inbox, and batch actions.

## Deep links

Open a page from Slack, a PR comment, or another tool:

```
vscode://saulmoreyra.slash-md/open?path=docs/producto/mi-nota.md
```

| Param | Required | Effect |
|---|---|---|
| `path` | yes | Repo-relative path to the `.md` (resolves under the docs workspace) |
| `snippet` | no | Scroll / highlight that text (PR thread reveal) |
| `threadId` | no | Prefer that thread when revealing |

Example with reveal:

```
vscode://saulmoreyra.slash-md/open?path=docs/producto/mi-nota.md&snippet=Hello%20world
```

Readers who do not use the extension: see [READING.md](READING.md). Publishing the extension: [PUBLISH.md](PUBLISH.md).

## What it does not do

- It does not replace GitHub's PR UI for approvals (Workspace mode).
- Code-repo `README.md` files are not claimed by default (only `*.slash.md` drafts and what you open via Slash MD).
