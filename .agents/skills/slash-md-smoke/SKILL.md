---
name: slash-md-smoke
description: >-
  Look at the running Slash MD desktop UI after building or changing it.
  Capture an Electron screenshot and inspect the PNG before claiming done.
  Use after any apps/desktop visual change, and when the user says smoke,
  look at it, see how it looks, screenshot, or "does it look right".
---

# Slash MD visual smoke

After desktop UI work, **see the window**. Unit tests do not count as looking.

Do not touch Milkdown `CrepeCanvas` or `packages/ui` vanilla DOM unless the task requires it.

## When

- You changed anything under `apps/desktop/src` that the user can see
- The user says *smoke*, *look at it*, *screenshot*, *see how it looks*
- You are about to say the UI is done

Skip for pure logic/IPC/tests with no visible change.

## Loop (mandatory)

1. Build the UI change (follow `slash-md-desktop`).
2. Make sure Vite is up: `http://127.0.0.1:5173`. If not, start `npm run desktop:dev` in the background and wait until the port answers.
3. Capture the surface you touched:

```bash
# Welcome (no folder)
npm run desktop:smoke -- --surface=welcome

# Home wiki
npm run desktop:smoke -- --surface=home

# Custom label / folder / click before shot
npm run desktop:smoke -- --label=editor --surface=home --eval "/* js in the page */"
```

4. Read the PNG path printed as `SMOKE_PNG=...` **with the Read tool** (it is an image).
5. Judge against [reference.md](reference.md). If it fails, fix and recapture. Repeat until it matches.
6. Only then say you are done — name what you saw (screen, locale, obvious layout).

**Never** claim a visual pass without reading the screenshot.

## Surfaces

| Change lives in | Command |
| --- | --- |
| Welcome / Gate / theme-on-welcome | `--surface=welcome` |
| Home, rail, panes, modals, FAB | `--surface=home` |
| Editor chrome (not Crepe canvas) | `--surface=home` then `--eval` to open a page if needed |

Fixture workspace: `fixtures/smoke-workspace` (personal mode, `docs/producto/hola.md`).

## Hard rules

- Isolated profile — smoke does not touch the user’s real workspace.
- Default UI copy is **Spanish** (`t("…")`). English-only chrome is a bug unless the shot was switched to `en`.
- Visual base: HeroUI dark mail-style — `bg-background`, rounded-3xl cards, flat rail. See `slash-md-desktop`.
- Blank, cropped, or error-overlay PNGs are failures. Recapture with `--wait=4000` if React was still loading.
- If capture errors because `dist-electron` is missing, start `desktop:dev` first — do not invent a screenshot.

## Related

- `slash-md-desktop` — how to build the UI
- `react-testing` — RTL specs; they do **not** replace this look
