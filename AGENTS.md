# Agent guidance

When working on this repo, read skills under **`.cursor/skills/`** before large React or desktop changes.

## Prefer these first

| Skill | When |
|-------|------|
| **`slash-md-desktop`** | Desktop app (`apps/desktop`) screens, hooks, feature folders |
| **`react-list-screen-pattern`** | Thin views + `useXController` + presentational components |
| **`react-compound-components`** | Compound APIs / future HeroUI-style primitives |

Also available: `react-testing`, `vercel-react-best-practices`, `vercel-composition-patterns` (also installed under `.agents/skills/`).

Do not touch Milkdown `CrepeCanvas` or `packages/ui` vanilla DOM unless the task requires it.

## Desktop React rules (antipatterns)

Cursor rules under **`.cursor/rules/`** (globs `apps/desktop/src/**`):

| Rule | Covers |
|------|--------|
| **`desktop-react-antipatterns`** | No heavy JSX conditionals; no inline `.map()`; no oversized files; domain subhooks + enums (not magic strings); extract `useKeyboardShortcuts` |
| **`desktop-react-components`** | Folder-per-component under `src/components/` |
| **`desktop-react-screens`** | Feature screens + nested `components/` folders; further-split domains (`useFormatter` / `useComments`) when needed |

**Layout:** each component in `Name/` with `Name.tsx`, `index.ts`, `__specs__/`, and `hooks/useNameController.ts` when it owns local state/effects.
