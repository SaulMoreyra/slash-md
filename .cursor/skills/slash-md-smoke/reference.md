# Slash MD smoke — reference

## Commands

```bash
npm run desktop:dev                          # keep running while iterating
npm run desktop:smoke -- --surface=welcome
npm run desktop:smoke -- --surface=home
npm run desktop:smoke -- --label=foo --wait=4000 --surface=home
npm run desktop:smoke -- --eval "document.querySelector('button')?.click()" --surface=welcome
```

Stdout on success:

```
SMOKE_PNG=/abs/path/.tmp/smoke/<label>.png
```

Read that file as an image. Do not cat it.

Env (set by the script; rarely needed by hand):

| Var | Role |
| --- | --- |
| `SLASHMD_SMOKE_DIR` | PNG output folder |
| `SLASHMD_SMOKE_PROFILE` | Isolated Electron `userData` |
| `SLASHMD_SMOKE_LABEL` | Filename stem |
| `SLASHMD_SMOKE_QUIT` | `1` → quit after capture |
| `SLASHMD_SMOKE_WAIT_MS` | Delay after `ready-to-show` (default 2000) |
| `SLASHMD_SMOKE_EVAL` | `executeJavaScript` before capture |
| `SLASHMD_SMOKE_SHOW` | `1` → show the smoke window |

Script: `apps/desktop/scripts/smoke-shot.mjs`. Hook: `apps/desktop/electron/smoke.ts`.

Prefers the Vite server on `:5173`; falls back to `apps/desktop/dist` if built.

## What “good” looks like

### Welcome (`--surface=welcome`)

- Centered card on `bg-background`, not a full-bleed form
- Brand **SlashMD**, title + lede from `welcome.*` i18n
- Dashed drop zone + primary **Abrir carpeta** (es)
- Theme + language controls on the card header
- No native title bar clutter; traffic lights inset

### Home (`--surface=home`)

- Flat left rail + rounded-3xl work/canvas columns
- Fixture shows `producto` / **Hola** in the tree
- Personal mode (no lote PR strip required)
- No GitHub error modal unless the change is about auth
- Empty canvas/stage is ok; a JS exception overlay is not

## Checklist (every shot)

1. **Intended screen** — welcome vs home vs overlay you meant to open
2. **Copy** — Spanish keys, no raw `welcome.title` / missing `t()`
3. **Layout** — no clipped buttons, overlapping columns, huge empty gaps, horizontal scroll
4. **Theme** — tokens (`bg-background`, `text-foreground`, `text-muted`, accent) not random hex rainbow
5. **Density** — mail-style workbench, not a marketing landing page
6. **States** — if you shipped hover/empty/error, eval or wait until that state is visible
7. **Regression** — chrome you did not touch still looks like SlashMD

Fail the smoke if any item is off. Fix, recapture, re-read.

## Failures vs recapture

| You see | Do |
| --- | --- |
| Blank / default Electron white | `--wait=4000` or confirm Vite is up |
| Previous screen (stale PNG) | Confirm `SMOKE_PNG` mtime; do not reuse an old file |
| User’s real wiki instead of fixture | Script must use isolated profile; re-run, do not pass extra folders |
| Dialog / “path does not exist” | Pass an absolute folder; fixture is `fixtures/smoke-workspace` |
| Second window stole focus | Normal if `SLASHMD_SMOKE_SHOW=1`; default is hidden capture |

## Out of scope

- Playwright / RTL / `*.spec.tsx` — different skill (`react-testing`)
- VS Code extension webview
- Crepe/Milkdown canvas internals
- Packaging, notarization, `desktop:pack`
