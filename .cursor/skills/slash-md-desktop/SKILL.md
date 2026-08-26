---
name: slash-md-desktop
description: >-
  Conventions for the Slash MD Electron desktop React app in apps/desktop.
  Use when editing desktop screens, Home/Editor feature folders, or desktop UI
  components. Prefer thin screens + controller hooks; do not touch Milkdown or
  packages/ui vanilla DOM.
---

# Slash MD Desktop React

## Scope

- Desktop React lives in **`apps/desktop` only** (`src/screens`, `src/components`, Electron IPC).
- Do **not** edit Milkdown **`CrepeCanvas`** internals or **`packages/ui`** vanilla DOM home renderers unless the task explicitly requires it.

## Feature layout

```
screens/<feature>/
  <Feature>Screen.tsx     # thin view — composition only
  index.ts                # public exports
  hooks/
    use<Feature>Controller.ts   # orchestrator; screen calls this only
    useDismiss.ts               # shared micro-hooks OK
  utils.ts                # pure helpers (no React)
  components/             # presentational pieces for this feature
    ComponentName/
      ComponentName.tsx
      index.ts
      __specs__/…
      hooks/useComponentNameController.ts  # if piece owns local orchestration
      components/                          # list/item/empty subparts
```

Shared chrome under `src/components/` uses the same **folder-per-component** layout.

- One orchestrator hook per screen; components stay presentational.
- Nested controllers OK for modals/panes/forms — do not inflate the feature controller for piece-local UI state.
- **Multi-domain screens** (e.g. Editor, Home): split into domain subhooks; orchestrator returns **namespaced** groups — Editor `{ editor, threads, comments, chrome }`, Home `{ search, modals, nav, library }`. Never export raw `setState` — only read-only values + `on*` handlers. Domain hooks own IPC side-effects. Extract cross-domain keyboard into `useKeyboardShortcuts` (orchestrator must not own large keydown effects). Further-split a domain when concerns diverge (formatter vs comment draft; search vs nav vs modals). Use feature `enums.ts` for save status, lifecycle, modal/nav kinds, menu action ids, body CSS classes, and mode checks — not scattered string literals. When open/close has two intents (preserve vs clear query), expose distinct handlers (`onOpen` / `onOpenCleared`).

## Antipatterns (do not repeat)

Documented in `.cursor/rules/desktop-react-antipatterns.mdc` (also components/screens rules):

1. **Heavy conditionals in JSX** — use early returns, controller flags, or branch helper components.
2. **Inline `.map()` in large JSX** — extract list/item components under `components/`.
3. **Oversized single-file components** — segment + optional `useXController`.
4. **God controller / flat bag / raw setters** — domain subhooks + namespaced groups (`{ editor, threads, comments, chrome }` or `{ search, modals, nav, library }`) + `on*` only; no IPC in screen JSX.
5. **Inline cross-cutting shortcuts** — extract `useKeyboardShortcuts`; orchestrator only composes.
6. **Magic status/mode strings** — use feature enums (`SaveStatus`, `ModalKind`, `NavKind`, `AccountMenuAction`, …).
7. **Ambiguous open handlers** — prefer `onOpen` vs `onOpenCleared` when preserve vs clear matter.

## UI (HeroUI-first)

- Prefer **pure HeroUI** compounds (`Card`, `ListBox`, `Button`, `Modal.*`, `Alert`, `Chip`, `Avatar`, `ScrollShadow`, …) plus **Tailwind utilities**.
- Avoid new custom CSS for chrome (rail / pane / welcome). Keep CSS mainly for Milkdown editor (`page`, cover, threads, finder if needed).
- Visual base: HeroUI dark mail-style workbench — black `bg-background`, rounded-3xl `Card` surfaces for list + canvas columns, flat left rail.
- Button: `onPress` (not `onClick`).
- **i18n**: all user-facing copy via `t("…")` and `src/i18n/locales/` (`es` / `en`). `LocaleProvider` wraps HeroUI `I18nProvider`. Use desktop `relativeTime`.

## Related skills

- `react-list-screen-pattern` — thin view + controller hooks
- `react-compound-components` — HeroUI-style compounds
- `vercel-react-best-practices` / `vercel-composition-patterns` — performance & composition
