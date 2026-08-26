# Publishing to VS Code Marketplace

The extension lives in **`apps/vscode/`**. Root `npm run package` delegates to that workspace.

## Prerequisites

1. A **Visual Studio Marketplace publisher** — create one at <https://marketplace.visualstudio.com/manage/createpublisher> (this repo uses `saulmoreyra`).
2. A **Personal Access Token** (PAT) with `Marketplace → Manage` scope — <https://dev.azure.com> → User Settings → PATs.
3. Node ≥ 18 and `npm` available.

## Pre-publish checklist

- [x] `apps/vscode/package.json` has `publisher`, `license`, `icon`, `repository`, `homepage`, `categories`, `keywords`, and a clear `description`
- [x] `apps/vscode/media/slash.png` exists (128×128)
- [x] `README.md` has install instructions and feature summary (add a product GIF/screenshot after smoke test if desired)
- [x] `CHANGELOG.md` exists
- [x] `LICENSE` (MIT) exists
- [x] `Open with Slash MD` opens workspace `.md` files in place
- [ ] Run `npm run build` — no errors
- [ ] Run `npm test` — all pass
- [ ] Smoke test: open a `.md` with Slash MD, edit, paste an image, confirm autosave
- [x] Version set for release (`0.1.0`)

## Build the VSIX

From the **repo root**:

```bash
npm install
npm run package          # → apps/vscode/slash-md-0.1.0.vsix
# or:
npm run package:vsix
```

Or from the extension package:

```bash
cd apps/vscode
npm run package          # runs vsce package --no-dependencies after build
```

`vscode:prepublish` builds `dist/extension.js` and `dist/webview.js` (editor UI from `packages/ui`).

## Test the VSIX locally

1. In Cursor / VS Code: **Extensions** → `⋯` → **Install from VSIX…** → pick the `.vsix` under `apps/vscode/`.
2. Reload. Open a `.md` → **Open with Slash MD** → edit and autosave.

## Debug from source

F5 uses `--extensionDevelopmentPath=${workspaceFolder}/apps/vscode` (see `.vscode/launch.json`).

## Publish

```bash
cd apps/vscode
npx @vscode/vsce login saulmoreyra   # paste the PAT once
npx @vscode/vsce publish             # uploads the current version
```

Or bump + publish in one step (only after the checklist is fully checked):

```bash
cd apps/vscode
npx @vscode/vsce publish patch
```

## After publishing

- Verify: `https://marketplace.visualstudio.com/items?itemName=saulmoreyra.slash-md`
- Optional badge for README:

```markdown
[![VS Marketplace](https://img.shields.io/visual-studio-marketplace/v/saulmoreyra.slash-md)](https://marketplace.visualstudio.com/items?itemName=saulmoreyra.slash-md)
```

## Updating

```bash
cd apps/vscode
npm version patch
npm run package
npx @vscode/vsce publish
```

## Unpublishing

```bash
npx @vscode/vsce unpublish saulmoreyra.slash-md
```

Use with care — users lose the extension.

## Desktop (not Marketplace)

`npm run desktop:dev` opens the Electron skeleton with the shared editor UI. It is not published with the VSIX.
