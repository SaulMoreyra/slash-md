# Slash MD — Usage guide (PO)

Two surfaces:

- **Desktop** — wiki: Home, drafts, GitHub review, and publish. This guide is mostly that cycle.
- **VS Code / Cursor extension** — Markdown editor only. Open a `.md` with Slash MD; no Init, Home, or GitHub.

## Install the editor (VS Code / Cursor)

### From the Marketplace

Search **Slash MD** in the Extensions view (VS Code or Cursor) and install.

### From a `.vsix`

1. Get the `.vsix` (from your team, or `npm run package` in the extension repo).
2. **Extensions** → `⋯` → **Install from VSIX…** → pick the file.
3. Reload the window if prompted.
4. Right-click a `.md` → **Open with Slash MD**. Optional: **Use as default Markdown editor**.

## First time (Desktop wiki)

1. Open the **docs repo** as a folder in the Desktop app — **Abrir carpeta**, or from a terminal (`slash .` / `slash ~/Repositorios/Personal`). See [README](../README.md#desktop-electron).
2. **Iniciar** (Init) if the folder has no `.slashmd.json`.
3. Confirm the GitHub repo if asked.
4. Choose **publish mode**:
   - **Workspace** — shared docs: Review opens a PR; Publish merges after approval.
   - **Personal** — solo docs: Publish commits and pushes straight to the default branch (no PR).
5. Sign in to GitHub (see [Sign in to GitHub](#sign-in-to-github-desktop)). `gh auth login` alone is not enough.

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

## Sign in to GitHub (Desktop)

SlashMD talks to GitHub with a **token stored in the app**. Signing in to GitHub CLI in Terminal does **not** log you into SlashMD until you connect that session (or paste a token) in the app.

**Why `gh auth login` looks like it did nothing**

1. `gh auth login` only authenticates the `gh` CLI. SlashMD does not watch the terminal; you still have to open **Iniciar sesión** and connect.
2. The installed `.app` (opened from Applications / Dock) often **cannot see `gh`**. GUI apps on macOS do not inherit your shell `PATH`, so Homebrew’s `/opt/homebrew/bin/gh` is missing unless the app looks there itself.
3. Review, publish, inbox, and comments stay local-only until SlashMD has a token with **`repo`** scope.

### In the app

Account menu (avatar) → **Iniciar sesión**.

**GitHub CLI**

1. In Terminal: `gh auth login` → GitHub.com, HTTPS, and repo access.
2. Back in SlashMD, if it shows **Conectar como @tu-usuario**, click it.
3. If you already ran the command, click **Ya lo hice — comprobar**. That re-reads `gh` (including Homebrew paths) and connects when it finds a session.

**Personal access token** (most reliable for the installed `.app`)

1. In the modal, **Crear token en GitHub** (classic token, **`repo`** scope).
2. Paste `ghp_…` → **Conectar con token**.

You are signed in when the account menu shows your GitHub login. **Cerrar sesión** drops the stored token; it does not run `gh auth logout`.

## The cycle: publication = branch (Workspace)

Diagrams, surfaces (Home vs editor), and “how it should be used”: [FLOWS.md](FLOWS.md).

In **Workspace** mode the published wiki (`defaultBranch`) is **read-only**. To write, create a **publication** (a `pub/…` branch), send it for review (PR), then **Publish** (merge and return to `defaultBranch`).

### 1. Nueva publicación

- On Home (or the read-only editor banner), click **Nueva publicación** and enter a title.
- Slash MD checks out a branch `pub/YYYY-MM-DD-<slug>` (adds `-2` if the name already exists). The **branch name is always shown** in Home and editor banners.
- You can leave several publications as branches and **Retomar** one later; only one is mounted at a time.
- **Volver a la wiki** checks out `defaultBranch` again (read-only).

### 2. New page (inside a publication)

- **Home** → **New page** → pick a template → enter a title. Without a publication mounted, this CTA opens **Nueva publicación** instead.
- Built-in templates: Blank, Meeting, Tasks, Project, Notes, Decision. **Team templates** from `templates/` or `_templates/` at the repo root (or under `contentPath`) appear first, marked **Repo**. Those folders show in the library like any other folder — open `templates/` and use **New template** to add a `.md` (placeholders such as `{{title}}` stay unfilled). Override the folder with `templatesPath` in `.slashmd.json`.
- Type `/diagram` (or `/mermaid` / `/flowchart`) to insert a flowchart. It is a ` ```mermaid ` fence: Slash MD draws it in the page, and GitHub does the same after publish. Click **Hide** on the block to see only the diagram.
- Copy the example from [docs/team-templates/](team-templates/) into your repo. Team templates use a `description:` line in the file’s frontmatter for the picker (not app translations). Optional `_manifest.json` can still override labels.
- A `.md` file is created under `contentPath` (e.g. `docs/producto/mi-nota.md`).
- The editor opens immediately. Hover above the title for **Add icon** and **Add cover**. The icon is a single emoji in frontmatter (`icon: 🚀`); it is not part of the title text.
- Under the title: **Etiquetados** (`people` — GitHub logins) and **Tags** (`tags`). People become PR reviewers when you send for review; tags stay document metadata.
- Paste or insert an image (`/image`, cover, or drag): the file is saved under `{contentPath}/images/`. Images are included when you send the publication for review.
- Under the title, **Edited … ago** lists everyone who committed the page (git history) plus you while it is dirty.
- Autosave writes to disk every 300 ms while you can write. Your file is a normal `.md` in the workspace.

### 3. Cambios de la publicación

- **Home** lists dirty / untracked pages on the mounted publication (no staging checkboxes).
- Lifecycle is **derived**: draft = dirty on the publication branch; in review = open PR for that branch; published = clean on `defaultBranch`.

### 4. Enviar a revisión

- With a publication mounted, click **Enviar a revisión**.
- Preview shows each changed page, a short diff summary, **people** to tag, and optional **file exclusion**.
- Confirm with **Enviar a revisión**. Slash MD commits the included paths (+ referenced images), pushes the current `pub/…` branch, and opens (or updates) a PR for that head.
- Reviewers = union of document `people` + anyone you type, minus yourself. If GitHub rejects a login, the send still succeeds and those people are **mentioned in the PR body** (UI reports them).
- Re-sending pushes to the **same PR** and only requests the reviewer delta.

### 5. Feedback

- The Activity Bar badge shows unresolved review threads.
- **Home** → **Feedback recibido** lists every pending comment across your PRs.
- Click a comment to open the page and scroll to the matching block.
- Slash MD **does not switch git branches** when you open Feedback. If your local branch or PR does not match the comment’s PR, a banner appears with **Open on GitHub**. Your unsaved local work is left alone. If the file is not on disk, you get a toast with the same GitHub action.

### 6. Comments on the canvas (Workspace + open PR)

While the publication has an **open PR**, review threads appear inline:

- Highlight + bubble on matching text; unmatched threads in the **Unanchored** rail (with **Abrir en GitHub** if the anchor moved).
- Click a bubble to read the thread, **Reply**, **Resolve**, or **Abrir en GitHub** from the popover.
- Select text → **Comment** (may push the page to the publication branch first if you are ahead).

Personal mode has no PRs, so comments stay off.

### 7. Publicar

- A teammate approves the PR on GitHub.
- In **Home** (publication banner), click **Publicar**. Slash MD merges the PR, checks out `defaultBranch`, pulls `--ff-only`, and deletes the local `pub/…` branch.
- There is no pre-merge “published” stamp commit; status comes from being clean on `defaultBranch`.

If Publish is blocked, the UI says why (`needs approval`, `checks failing`, `conflict`, `no GitHub session`).

## Personal mode (`"mode": "personal"`)

Bar shows **Publish** only (no Review / publications).

1. Edit the page.
2. **Publish** → commit + push to the default branch (`main` by default).

Use this for solo docs repos without required PR reviews. If the default branch is protected against direct pushes, Publish fails with a clear message — switch to **Workspace** mode or relax branch protection.

## Public reading site (GitHub Pages)

Optional. Same for **Workspace** and **Personal**: when `main` (your `defaultBranch`) updates, a GitHub Action can publish a Slash MD reader (tree, search, read-only preview).

1. In Init / Settings, turn on **Publish reading site** (hidden in Local mode). That writes `"site": { "enabled": true }` in `.slashmd.json`.
2. Add `.github/workflows/docs.yml` as in [READING.md](READING.md).
3. Repo **Settings → Pages → GitHub Actions**.

The Action is a no-op until `site.enabled` is true. Details and plan limits: [READING.md](READING.md).

## VS Code / Cursor editor (no GitHub)

The extension is WYSIWYG only:

1. Right-click a `.md` → **Open with Slash MD** (or Command Palette → `Slash MD: Open with Slash MD`).
2. You edit the **real file** (autosave in place). Images go to `{folder}/images/`.
3. Optional: `Slash MD: Use as default Markdown editor` (or setting `slash-md.useAsDefaultMarkdown`) so all `*.md` open this way. Turn off with **Stop using as default Markdown editor**.

Review, publish, Home, and inbox are **Desktop** only.

### Wiki pages in the docs repo (Desktop)

When the file lives under your configured `contentPath` (Init / `.slashmd.json`):

- **Write in the editor** — only inside a publication (Workspace) or always (Personal).
- **Review and Publish** — Desktop Home: **Enviar a revisión** → **Publicar**.

Readers who do not use the app: see [READING.md](READING.md). Publishing the extension: [PUBLISH.md](PUBLISH.md).

## What it does not do

- The VS Code extension does not replace GitHub or Desktop for review/publish.
- Desktop does not replace GitHub's PR UI for approvals (Workspace mode).
- Code-repo `README.md` files are not claimed by default in VS Code (only what you open via Slash MD, or if you enable the default-editor setting).
