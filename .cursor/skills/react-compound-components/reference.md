# Reference — React Compound Components

## SearchBar vs DataGrid

| Aspect | SearchBar | DataGrid |
|--------|-----------|----------|
| Assembly | `Object.assign(Root, { Input, … })` | `{ Root, Grid, Cell, … }` |
| Usage | `<SearchBar>` | `<DataGrid.Root>` |
| Context value | Minimal: `{ search, onSearchChange }` | Rich: TanStack table API + `loading`, `filters`, … |
| Controller in root | No — state from props | Yes — `useDataGridController` |
| Generics | No | `<D>` row type + `DataGrid.Column<D>` |
| Subpart state | Mixed: Input uses context; MultiSelect uses own props | Subparts use `useDataGrid()` only |
| Companion hooks | Exported (`useSearchBarSearch`, …) | `useDataGrid` internal + exported from hooks/ |
| Utils exported | `toSearchBarPillItems`, option types | Column types via namespace |

## Context design

### Minimal shared state (SearchBar)

Only what **multiple subparts** need:

```typescript
type SearchBarContextValue = {
  search: string;
  onSearchChange: (value: string) => void;
};
```

`MultiSelect` keeps `selected` / `onSelectedChange` as props — parent or domain wrapper owns them.

### Controller context (DataGrid)

```typescript
type DataGridContext<D> = TanStackTable<D> & {
  filters: ColumnFiltersState;
  loading: boolean;
  refetching?: boolean;
  noOfLines: number;
  pageSize?: number;
};
```

Spread TanStack instance into context so subparts call `table.getRowModel()`, `getHeaderGroups()`, etc.

## Subpart implementation patterns

### Context consumer (SearchBar.Input)

```typescript
export const Input = (props: InputProps) => {
  const { search, onSearchChange } = useSearchBarContext();
  return <TextInput value={search} onChange={(e) => onSearchChange(e.target.value)} … />;
};
Input.displayName = 'SearchBar.Input';
```

### Props-only subpart (SearchBar.MultiSelect)

Controlled fields that vary per screen stay on props; compound still styles consistently.

### Context + layout (DataGrid.Filters)

Reads column defs from table; renders `meta.filterRender` per header:

```typescript
header.column.columnDef.meta?.filterRender?.(header.getContext())
```

Enables declarative filters in column definition at page level.

### Orchestrator subpart (DataGrid.Grid)

Renders responsive split without consumer choosing:

```typescript
export const Grid = ({ collapse, rowFooter }) => (
  <>
    <GridDesktop rowFooter={rowFooter} />
    <GridMobile collapse={collapse} />
  </>
);
```

## Object.assign vs namespace — decision tree

```
Need <Name> as root JSX tag?
  yes → Object.assign(Root, { SubA, SubB })
  no  → { Root, SubA, SubB } namespace

Subpart name equals root name (Grid)?
  yes → namespace (DataGrid.Root + DataGrid.Grid)

Heavy generic row type?
  yes → namespace + export namespace Type { Column<D> }
```

## File map — SearchBar

```
SearchBar/
├── SearchBar.tsx          # Object.assign assembly
├── context.tsx            # Provider + useSearchBarContext
├── SearchBar.module.css   # shared styles for select inputs (subparts import)
├── utils.ts               # SearchBarOption, toSearchBarPillItems
├── hooks/
│   ├── useSearchBarSearch.ts
│   ├── useSearchBarSelect.ts
│   └── useSearchBarMultiSelect.ts
└── components/
    ├── Input/             # uses context
    ├── Select/            # SelectField exported as Select
    ├── MultiSelect/
    └── Pills/
```

## File map — DataGrid

```
DataGrid/
├── DataGrid.tsx              # Root + namespace types + object export
├── context/DataGridContext.ts
├── hooks/
│   ├── useDataGridController.ts
│   └── useDataGrid.ts
└── components/
    ├── Grid/                 # Desktop + Mobile orchestrator
    ├── GridDesktop/
    ├── GridMobile/
    ├── Cell/
    ├── Filters/
    └── Pagination/
```

## Controlled vs uncontrolled in root controller

DataGrid sorting example inside `useDataGridController`:

- If `sorting` + `onSortingChange` passed → controlled (server-side sort).
- Else internal `useState` for client sort.

Apply same pattern for pagination when compound supports both modes.

## CSS modules

| File | Scope |
|------|-------|
| `SearchBar.module.css` | Root layout + shared input/select tokens used by multiple subparts |
| `components/Cell/Cell.module.css` | Cell-only |
| `components/GridDesktop/GridDesktop.module.css` | Desktop grid |

Prefer subpart module; shared root module only for repeated classNames across siblings.

## Public barrel (`index.ts`)

SearchBar exports **four layers**:

1. Compound + prop type aliases
2. Utils + data types
3. Companion hooks + return types
4. (implicit) subparts only via `SearchBar.*` — not always re-exported individually

DataGrid exports hooks + everything from `DataGrid.tsx` via `export *`.

## Domain wrapper pattern

TeamFilter:

1. Same compound assembly (`Object.assign(Root)`).
2. Root composes generic `SearchBar` with product i18n + layout.
3. Uses `useSearchBarMultiSelect` internally for pills.
4. Exposes domain props: `options`, `selectedIds`, `onSelectedIdsChange`.

**Rule:** generic compound stays reusable; domain wrapper adds defaults and opinionated layout.

## React Native / Expo

Same structure; swap Mantine for RN primitives. Context + Object.assign unchanged. StyleSheet per subpart instead of CSS modules.

## Testing compounds

1. **Harness component** in spec file composes subparts like real consumers.
2. Test context guard: subpart outside provider throws (optional).
3. Test slot flexibility: children order, optional subparts omitted.
4. Mock heavy engines (TanStack) at integration boundary — unit-test subparts with fake provider value.

## Link to other skills

- Page uses compound: `@react-list-screen-pattern` — columns in page, `<DataGrid.Root>` in view.
- Compound tests: `@react-testing` — harness + `defaultProps` + i18n assertions.
