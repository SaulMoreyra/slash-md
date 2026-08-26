---
name: react-compound-components
description: >-
  Builds reusable React compound components with subparts, context, Object.assign or
  namespace assembly, displayName, co-located CSS modules, companion hooks, and domain
  wrappers. Stack-agnostic. Use when creating Menu.Item-style APIs, design-system
  primitives, shared filter bars or data grids, or when the user asks for compound
  component structure.
---

# React Compound Components

Single public name with attached subparts (`SearchBar.Input`, `DataGrid.Root`). Consumers compose layout; root owns shared state via **context** or **controller hook**.

## Before coding

1. Read project rules (`AGENTS.md` or equivalent) for folder layout, CSS module rules, test placement.
2. Study the patterns in [examples.md](examples.md): **SearchBar** (context + `Object.assign`), **DataGrid** (namespace + controller), **TeamFilter** (domain wrapper).

## When to use a compound

| Use compound                                          | Use plain component         |
| ----------------------------------------------------- | --------------------------- |
| Optional subparts in flexible order                   | Fixed layout, few props     |
| Shared state across children (search, table instance) | All state from parent props |
| Public API like `Feature.SubPart`                     | Single export enough        |
| Design-system / cross-page reuse                      | Page-local only             |

## Folder layout

```
FeatureName/
├── FeatureName.tsx           # assembles compound + type aliases
├── FeatureName.module.css    # root layout only (optional)
├── index.ts                  # barrel: compound + hooks + utils + types
├── context.tsx               # or context/FeatureContext.ts
├── utils.ts                  # pure helpers for consumers
├── hooks/                    # companion hooks (optional, exported)
│   ├── useFeatureSearch.ts
│   └── index.ts
├── components/
│   ├── index.ts              # re-export all subparts + types
│   ├── Input/
│   │   ├── Input.tsx
│   │   ├── Input.module.css  # if styles needed
│   │   └── index.ts
│   └── SubPart/
│       └── …
└── __specs__/
    └── FeatureName.spec.tsx
```

Subpart tests: `components/SubPart/__tests__/SubPart.spec.tsx` (or `__specs__/` per project).

## Assembly patterns — pick one

### Pattern A — `Object.assign(Root, { … })`

Root **is** the default export usage: `<SearchBar>…</SearchBar>`.

```typescript
const Root = ({ search, onSearchChange, children, ...boxProps }: RootProps) => (
  <FeatureContext.Provider value={{ search, onSearchChange }}>
    <Box {...boxProps}>{children}</Box>
  </FeatureContext.Provider>
);
Root.displayName = 'SearchBar';

export const SearchBar = Object.assign(Root, {
  Input,
  Select,
  MultiSelect,
  Pills,
});

export type SearchBarProps = RootProps;
export type { InputProps as SearchBarInputProps, … } from './components';
```

**Use when:** one obvious shell; subparts are always inside the root.

### Pattern B — namespace object `{ Root, … }`

Explicit root name: `<DataGrid.Root>…</DataGrid.Root>`.

```typescript
const Root = <D,>({ data, columns, children, … }: RootProps<D>) => {
  const value = useDataGridController({ data, columns, … });
  return <DataGridContext.Provider value={value}>{children}</DataGridContext.Provider>;
};

export namespace DataGrid {
  export type Column<D> = ColumnDef<D>;
  export type RootProps<D> = …;
}

export const DataGrid = {
  Root,
  Grid: GridContent,
  Cell,
  Filters,
  Pagination,
  Desktop: GridDesktop,
  Mobile: GridMobile,
};
```

**Use when:** root name would collide with a subpart (`DataGrid` vs `DataGrid.Grid`); generics `<D>`; children slot pattern (grid + pagination + empty state as siblings).

Both patterns are valid — match the reference in the target repo.

## Root responsibilities

| Owns                                                        | Does not own                |
| ----------------------------------------------------------- | --------------------------- |
| Provider + shared context value                             | Subpart-specific UI details |
| Layout shell (Stack, Box)                                   | Business data fetching      |
| Props for cross-cutting state (`search`, `data`, `columns`) | Page-level routing          |
| Optional controller hook call (DataGrid)                    | Heavy logic in JSX          |

## Context

```typescript
export type FeatureContextValue = {
  search: string;
  onSearchChange: (v: string) => void;
};

export const FeatureContext = createContext<FeatureContextValue | null>(null);

export const useFeatureContext = () => {
  const ctx = useContext(FeatureContext);
  if (!ctx)
    throw new Error("Feature subcomponents must be used inside <Feature>.");
  return ctx;
};
```

- **Strict null + throw** (SearchBar): fails fast in dev.
- Subparts call `useFeatureContext()` — never require duplicate props for shared state.

**DataGrid variant:** context holds controller return (table engine + `loading`, `filters`, …); subparts use `useDataGrid<D>()`.

## Subpart rules

| Rule              | Detail                                                            |
| ----------------- | ----------------------------------------------------------------- |
| Arrow const       | `export const Input = (props: InputProps) => …`                   |
| `type InputProps` | Same file, exported                                               |
| `displayName`     | `'SearchBar.Input'`, `'DataGrid.Cell'`                              |
| CSS module        | One `SubName.module.css` per subpart; root module for shell only  |
| Barrel            | `components/index.ts` re-exports parts + prop types               |
| Rename on export  | OK: `export { SelectField as Select }` when internal name differs |

Subparts read context; **controlled props stay explicit** when not in context (e.g. `MultiSelect` gets `selected`, `onSelectedChange` from page — only search is in context).

## Companion hooks (exported with compound)

Reusable UI kit compounds often ship **hooks for consumers** to wire state — not used inside the compound itself:

| Hook                      | Role                                         |
| ------------------------- | -------------------------------------------- |
| `useSearchBarSearch`      | Debounced search state + `onDebouncedChange` |
| `useSearchBarSelect`      | Selected option + `onClear`                  |
| `useSearchBarMultiSelect` | Pills list + `onRemove` from grouped data    |

Export from `index.ts` alongside the compound. Page/feature hooks compose these; domain wrappers (e.g. `TeamFilter`) call them internally.

## Pure utils

Export stateless helpers next to compound: `toSearchBarPillItems`, `allSearchBarOptions`. No React imports.

## Domain wrapper compound

Wrap generic compound with fixed composition for one product area:

```
TeamFilter/
├── TeamFilter.tsx        # Object.assign(Root) — same pattern
└── components/Root/    # composes SearchBar + useFilterMultiSelect + i18n
```

Consumer uses `<TeamFilter … />` instead of assembling `SearchBar.*` manually.

## Consumer composition examples

**SearchBar** — flexible child order:

```tsx
<SearchBar search={search} onSearchChange={onSearchChange}>
  <SearchBar.Input placeholder={t("…")} />
  <SearchBar.MultiSelect
    data={teams}
    selected={ids}
    onSelectedChange={setIds}
  />
  <SearchBar.Pills items={pills} onRemove={onRemove} />
</SearchBar>
```

**DataGrid** — root slot for siblings:

```tsx
<DataGrid.Root data={rows} columns={columns} loading={loading} sorting={sorting} onSortingChange={onSort}>
  <DataGrid.Grid collapse={CollapseFace} rowFooter={(row) => <RowMeta … />} />
  <NoResultsState visible={isEmptyWithFilters} onClear={onClear} />
  <Pagination … />
</DataGrid.Root>
```

Column defs live in **page** (`useMemo`); table compound owns rendering engine.

## Generics (DataGrid-style)

- Root and subparts generic over row type `<D>`.
- Export `namespace DataGrid { export type Column<D> = … }` for ergonomic `DataGrid.Column<Row>[]` at call site.
- Controller hook generic: `useDataGridController<D>(…)`.

## Controller inside root (DataGrid)

Heavy setup stays in `hooks/useDataGridController.ts`; Root only:

```typescript
const value = useDataGridController({ data, columns, loading, sorting, onSortingChange, … });
return <DataGridContext.Provider value={value}>{children}</DataGridContext.Provider>;
```

Subparts stay dumb consumers of `useDataGrid()`.

## Type exports (public API)

Top-level `FeatureName.tsx` or `index.ts`:

```typescript
export type FeatureProps = RootProps;
export type FeatureInputProps = InputProps; // prefixed aliases avoid collisions
export type { FeatureOption } from "./utils";
export { useFeatureSearch, type UseFeatureSearchReturn } from "./hooks";
```

## Tests

| Level                            | What                                                           |
| -------------------------------- | -------------------------------------------------------------- |
| Top `__specs__/Feature.spec.tsx` | Composition harness (like SearchBarHarness), context wiring    |
| Subpart `__tests__/Sub.spec.tsx` | Render inside provider or mock context                         |
| Integration in page spec         | Often mocked as stub — real compound tested at component level |

SearchBar spec: harness component composes subparts; asserts user events + i18n strings.

DataGrid spec: `renderGrid` helper with `DataGrid.Root` + `DataGrid.Grid`; context existence test.

## Creation checklist

```
- [ ] context + useFeatureContext (with guard)
- [ ] Root shell + Provider
- [ ] Subparts under components/ with displayName + props types
- [ ] components/index.ts barrel
- [ ] FeatureName.tsx assembly (Object.assign or namespace)
- [ ] index.ts public exports (types, hooks, utils)
- [ ] __specs__/FeatureName.spec.tsx with composition harness
- [ ] Subpart tests for non-trivial parts
```

## Anti-patterns

- Prop drilling the same `search` into every subpart when context exists.
- Monolithic 500-line file with all subparts inline.
- Shared `Feature.module.css` for every subpart (split modules).
- Exporting `Feature.Root` **and** default `<Feature />` without clear convention.
- Business mutations inside compound subparts.
- God context with 20 fields — split compounds or keep page-owned state explicit on subparts.

## Additional resources

- [reference.md](reference.md) — SearchBar vs DataGrid comparison, context shapes, column meta.
- [examples.md](examples.md) — SearchBar, DataGrid, TeamFilter, CardWithActions.
