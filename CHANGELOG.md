# Changelog

All notable changes to Slash MD are documented in this file.

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
