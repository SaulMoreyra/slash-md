---
name: react-list-screen-pattern
description: >-
  Scaffolds React features with thin views and composed custom hooks. Two patterns:
  (A) list screens — filter, query, sort, pagination; (B) workflow sections —
  local state, file upload, mutations, namespaced sub-hooks.
  Stack-agnostic for Vite, Next.js, Expo, React Native. Use when creating list pages,
  import/upload flows, multi-step sections, filterable tables, FlatLists, or when the
  user asks for controller/hook architecture or feature screen structure.
---

# React Feature Hook Architecture

Two complementary patterns sharing the same principles: **thin view**, **one orchestrator per screen/section**, **focused hooks**, **pure utils**.

## Pick a pattern

| Use | When | Pattern label |
|-----|------|----------------|
| **A — List screen** | Server-backed list, filters in URL/state, pagination, sort | `ListPage` |
| **B — Workflow section** | Upload/import, wizard step, local draft state, submit mutation | `ImportSection` |
| **Page + sections** | Route with independent blocks that can be hidden/feature-flagged | `CreateItemPage` |

Both patterns: section/view calls **one** controller; controller **composes** hooks; components stay presentational.

---

# Pattern A — List screen

Architecture for **filterable list screens**: orchestrator hook, filter/query/sort hooks, thin screen.

## Before coding

1. Read the target project's conventions (`AGENTS.md`, existing screens, test folder naming).
2. Identify stack adapters:

| Concern            | Detect in project                                     |
| ------------------ | ----------------------------------------------------- |
| Data               | Apollo, TanStack Query, fetch, tRPC                   |
| Navigation         | React Router, Expo Router, React Navigation           |
| List UI            | Table, FlatList, SectionList, virtualized list        |
| Filter persistence | URL search params, local state, AsyncStorage, Zustand |
| Styling            | CSS modules, StyleSheet, Tamagui, Mantine, etc.       |
| i18n               | react-i18next, expo-localization                      |

3. Read [examples.md](examples.md) in this skill for concrete file maps.
4. **Mobile:** use the same hook split; swap Table for FlatList and URL filters for local state when needed.

## Folder layout

```
FeatureScreen/
├── FeatureScreen.tsx          # thin view — only composition
├── FeatureScreen.module.css   # or .styles.ts / StyleSheet
├── index.ts
├── hooks/
│   ├── useFeatureController.ts   # REQUIRED — single public API for the screen
│   ├── useFeatureFilter.ts       # if filters/search
│   ├── useFeatureQuery.ts        # or useFeatureData — owns gql/query/fetch
│   ├── useFeatureSort.ts         # if sortable columns
│   ├── useFeaturePagination.ts   # if paginated (cursor or offset)
│   ├── types.ts                  # shared hook types
│   └── __tests__/                # or __specs__ per project convention
├── components/
│   ├── FilterBar/
│   ├── EmptyState/               # global empty (no data at all)
│   ├── NoResultsState/           # empty with active filters
│   ├── ListItem/                 # row / card (FlatList renderItem)
│   └── index.ts
├── utils/                        # pure: filter state → query variables (no React)
└── __tests__/
    └── FeatureScreen.test.tsx    # mock useFeatureController
```

**Page vs screen naming:** use `*.page.tsx` or `*Screen.tsx` per project; the pattern is the same.

## Controller contract

`useFeatureController` composes sub-hooks and returns everything the view needs:

```typescript
return {
  items, // list nodes
  loading, // initial load (no stale data yet)
  refetching, // background refresh with previous data visible
  error,
  filter, // { values, isFiltering, onSearchChange, onClearFilters, … }
  pagination, // if applicable
  sorting, // if applicable
  actions, // mutations, navigation handlers, modals
  shouldShowList, // show list shell vs global empty
  isEmptyWithFilters, // filters active but zero results
};
```

### Loading flags

- `loading = true` when auth/deps not ready OR first fetch with no cached data.
- `refetching = true` when fetching but `previousData` / stale items exist.
- `shouldShowList = items.length > 0 || loading || refetching || filter.isFiltering` — avoids flashing global empty while filters are active.

## Hook rules

| Rule                 | Detail                                                                                |
| -------------------- | ------------------------------------------------------------------------------------- |
| One orchestrator     | Screen calls **only** `useFeatureController`.                                         |
| One concern per hook | Filter, query, sort, pagination, actions stay separate.                               |
| `on*` handlers       | Expose `onSearchChange`, `onPageChange`, etc. — **never** raw `setState` to the view. |
| Query owns GraphQL   | `gql` + `useQuery` live in `useFeatureQuery.ts`, not in components.                   |
| Pure utils           | URL ↔ filter ↔ GraphQL variables in `utils/` without React imports.                   |
| Nested hooks         | Modals or independent sections get `components/X/hooks/useXController.ts`.            |
| Reset pagination     | When filter/search/sort changes, reset cursor/page.                                   |

## View rules

The screen file:

1. Calls `useFeatureController()`.
2. Defines columns (web table) or passes `renderItem` (FlatList) — **presentation only**.
3. Branches: global empty → `EmptyState`; filtered empty → `NoResultsState`; else list + filter bar + pagination.
4. Contains **no** fetch logic, debounce, or URL serialization.

```tsx
const { items, loading, filter, shouldShowList, isEmptyWithFilters, pagination } =
  useFeatureController();

if (!shouldShowList) return <EmptyState onCreate={…} />;
// inside list area:
if (isEmptyWithFilters) return <NoResultsState onClear={filter.onClearFilters} />;
```

## Stack adapters

### Web (Vite / Next / CRA)

| Pattern piece  | Typical choice                           |
| -------------- | ---------------------------------------- |
| Filters in URL | `useSearchParams`, custom `useUrlParams` |
| List           | `<Table />`, data grid                   |
| Empty switch   | conditional render or `<Matcher />`      |
| Pagination     | cursor (`after`/`first`) or offset       |

### Expo / React Native

| Pattern piece | Typical choice                                                              |
| ------------- | --------------------------------------------------------------------------- |
| Filters       | `useState` + optional AsyncStorage; deep links only if shareable URL needed |
| List          | `FlatList` + `ListItem` component                                           |
| Empty switch  | same `shouldShowList` / `isEmptyWithFilters` flags                          |
| Pagination    | "Load more" `onEndReached` or infinite query                                |
| Modal actions | `Modal` / bottom sheet + nested `useEditController`                         |

**Do not drop** the controller/hook split on mobile — only swap UI and filter persistence.

## Creation checklist

Copy and track progress:

```
- [ ] utils: serialize filter → query variables (+ URL adapter if web)
- [ ] useFeatureFilter (debounced search, isFiltering, on* handlers)
- [ ] useFeatureQuery (owns data fetching)
- [ ] useFeatureSort / useFeaturePagination (if needed)
- [ ] useFeatureController (compose + loading flags)
- [ ] components: FilterBar, EmptyState, NoResultsState, ListItem
- [ ] FeatureScreen.tsx (thin)
- [ ] Screen test: mock controller
- [ ] Hook tests: renderHook for filter debounce, pagination reset
```

## Shared vs page-local components

Extract to shared `components/` when **two routes** share the same UI + need a `perspective` or config prop (e.g. admin vs user). Keep page-local when only one feature uses it.

## Anti-patterns

- Apollo/`useQuery` inside `FilterBar` or list row components.
- 300+ line screen with inline `useEffect` fetch + filter state.
- Exposing `setSearch` / `setPage` from hooks to JSX.
- God hook that merges filter + query + modal + CSV export without composition.
- Skipping `isEmptyWithFilters` (user clears filters thinking data is gone).

## Tests

| Layer   | Approach                                                                |
| ------- | ----------------------------------------------------------------------- |
| Screen  | Mock `useFeatureController`; assert branches (empty, no results, list). |
| Hooks   | `renderHook` + `act`; fake timers for debounce.                         |
| Utils   | Pure unit tests, no RTL.                                                |
| GraphQL | Mock at provider level in integration tests.                            |

---

# Pattern B — Workflow section

Architecture for **self-contained workflow sections** (import CSV, create form, upload + preview + submit): section controller composes **domain hooks** and returns **namespaced groups** (`csv`, `upsert`, `edit`), not only a flat bag of fields.

## Folder layout

```
PageRoute/
├── PageRoute.tsx                    # minimal — only cross-section wiring
├── hooks/
│   └── usePageController.ts         # tiny: shared flags between sections
└── components/
    ├── WorkflowSection/
    │   ├── WorkflowSection.tsx      # thin — destructures namespaced controller
    │   ├── hooks/
    │   │   ├── useWorkflowController.ts   # composes domain hooks
    │   │   ├── useSourceData.ts           # e.g. file upload + parse (state owner)
    │   │   ├── useSubmitAction.ts         # e.g. mutation + navigation + toasts
    │   │   ├── useItemEdit.ts             # e.g. which row is being edited
    │   │   ├── useParseMutation.ts        # thin gql wrapper
    │   │   └── index.ts
    │   ├── utils/                   # pure transforms, reconcile, payload builders
    │   ├── types/
    │   └── constants/
    ├── RelatedModal/
    │   ├── RelatedModal.tsx
    │   └── hooks/
    │       └── useRelatedModalController.ts   # form bridge — only if modal is complex
    └── PreviewWidget/
        └── hooks/
            └── useConfirmReset.ts           # micro-hook for one UI concern OK here
```

## Section controller — namespaced composition

Compose domain hooks; return **grouped** APIs so the view reads by domain:

```typescript
export function useWorkflowController({ onActiveChange }: Props) {
  const source = useSourceData({ onActiveChange });

  const onGetItems = useCallback(() => source.items, [source.items]);

  const submit = useSubmitAction({
    onGetItems,
    onSetItems: source.onSetItems,
    onReset: source.reset,
  });

  const edit = useItemEdit({
    items: source.items,
    onUpdateItem: source.onUpdateItem,
  });

  return { source, submit, edit };
}
```

View wires groups to components:

```tsx
const { source, submit, edit } = useWorkflowController({ onActiveChange });

<EditModal draft={edit.item} onSave={edit.onSave} onClose={edit.onClose} />
<UploadCard onFileSelect={source.onFileSelect} loading={source.isProcessing} />
<Preview
  items={source.items}
  onImport={submit.onSubmit}
  importing={submit.isSubmitting}
  onEdit={edit.onEdit}
/>
```

Prefer **namespaced return** when sub-hooks are independently meaningful (`csv` / `upsert` / `edit`). Use **flat return** (Pattern A) when the screen is one cohesive list query.

## Domain hook responsibilities

| Hook | Owns | Typical return |
|------|------|----------------|
| **Source / data hook** | Local state (drafts), file pick/upload, parse/load, derived counts, reset | `items`, `hasData`, `onFileSelect`, `reset`, `onUpdateItem`, `onSetItems` |
| **Submit hook** | Mutation, success/error toasts, navigation, reconcile server response with local state | `isSubmitting`, `onSubmit` |
| **Edit hook** | Which item index is open, save delegates to source `onUpdateItem` | `item`, `onEdit`, `onClose`, `onSave` |
| **Mutation files** | `gql` + `useMutation` only — one file per mutation | `useXxxMutation` |

**Source hook is state owner.** Other hooks receive **callbacks/getters**, not duplicated state:

- `onGetItems: () => Item[]` — fresh snapshot at submit time (avoids stale closure).
- `onSetItems`, `onReset` — submit hook updates or clears after partial success.
- `onActiveChange(boolean)` — lifted to **page** when another section must hide (e.g. hide manual form while importing).

## Pure utils (required for workflows)

Keep imperative logic testable without React:

- **Normalize API → client model** (e.g. `spreadsheetRowsToDraftRows`).
- **Merge partial updates + recompute derived status** (e.g. `mergeDraftPartial` → re-run validation).
- **Build mutation payload** from ready items only.
- **Reconcile after submit** — which items succeeded, which remain in table, partial failure counts.

Hooks call utils; utils never import React.

## Page-level controller (minimal)

When the route has **parallel independent sections**, page controller holds **only cross-section state**:

```typescript
// useCreateItemPageController — only bridges sections
const [importing, setImporting] = useState(false);
return { importing, onImportActive: setImporting };
```

Each section owns its workflow; page passes props down and conditionally renders sibling sections.

## Modal / form bridge hook

Complex modals that reuse a shared form get a **nested** controller under the modal folder:

- Maps domain model → form defaults (`draftToFormValues`).
- Maps form submit → domain partial (`formValuesToDraftPartial`).
- Wraps shared `useFormController({ item })`.

Keep **edit index state** in section hook (`useItemEdit`); keep **form wiring** in modal hook (`useEditModalController`).

## Micro-hooks in child components

A child may own a tiny hook for **one UI concern** (confirm dialog before reset). OK when it does not own business state — still receives `onReset` from parent controller.

## Workflow checklist

```
- [ ] types + constants (enums for status/error)
- [ ] utils: normalize, merge, payload, reconcile (unit tested)
- [ ] useXxxMutation.ts per GraphQL mutation
- [ ] useSourceData (state owner + load/parse)
- [ ] useSubmitAction (mutation orchestration)
- [ ] useItemEdit (selection index only)
- [ ] useWorkflowController (compose + wire callbacks)
- [ ] WorkflowSection.tsx (thin, namespaced destructure)
- [ ] Page controller minimal if multiple sections
- [ ] Modal controller if form bridge needed
```

## Workflow anti-patterns

- Submit hook owns `useState` for drafts **and** source hook also owns drafts (double source of truth).
- Passing `drafts` array into submit at hook init instead of `onGetDrafts()` at action time.
- Parse + upsert + edit + file upload in one 400-line hook.
- Business reconcile logic inside JSX or inside mutation `.then` inline — extract to `utils/`.
- Inflating page controller with import logic when only one workflow section needs it.

---

## Additional resources

- [reference.md](reference.md) — diagrams, hook wiring, file responsibilities (Patterns A & B).
- [examples.md](examples.md) — ListPage, ImportSection, Expo sketches.
