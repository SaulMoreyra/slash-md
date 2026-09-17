# Changelog

All notable changes to Slash MD are documented in this file.

## [Unreleased]

### Added

- Desktop: resize the editor page width by dragging the left/right edge of the page (Google Docs style), with double-click to restore the default width. The width is capped to the visible container and persisted per user in `localStorage`.
- Desktop: refresh the workspace tree and re-read the open page when the window regains focus, so edits made externally (agents, editors) show up without switching files; re-opening the current file now reloads its content into the editor (guarded against clobbering unsaved edits).

### Changed

- VS Code / Cursor extension is a **Markdown editor only**: Open with Slash MD, autosave, images beside the file, optional default editor.
- Home, GitHub review/publish, drafts tree, Init, and sidecar drafts moved out of the extension (use the Desktop app).

## [0.1.0] — 2026-08-24

### Added

- Local-first wiki: pages are real `.md` files under `contentPath` (Init writes `.slashmd.json`)
- Home library with staging (**Borradores locales**), lote review, feedback inbox, and publish
- Workspace mode (PR review) and Personal mode (direct publish to default branch)
- Inline images and covers saved to `{contentPath}/images/` with relative Markdown paths
- Canvas review threads (reply / resolve) when a page is `in_review`
- Feedback context banner when local branch/PR does not match the comment’s PR (opens GitHub; no git switch)
- Slash blocks, Mermaid diagrams, Gallery template, team `_templates/`
- **Edit with Slash MD** opens the workspace file in place (no sidecar copy)

### Notes

- Legacy `.slash.md` sidecar drafts remain openable; new pages use the workspace model
- Activity Bar **Drafts** points to Home when the folder is a docs wiki

## [0.0.1] — 2026-08

- Initial private / development builds
