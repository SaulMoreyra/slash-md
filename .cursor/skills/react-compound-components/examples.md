# Examples — React Compound Components

Illustrative patterns only — adapt names and UI kit to your project.

## SearchBar — assembly

```typescript
const Root = ({ search, onSearchChange, children, className, ...boxProps }: RootProps) => {
  const value: SearchBarContextValue = { search, onSearchChange };
  return (
    <SearchBarContext.Provider value={value}>
      <Box className={[classes.root, className].filter(Boolean).join(' ')} {...boxProps}>
        <Stack gap="sm">{children}</Stack>
      </Box>
    </SearchBarContext.Provider>
  );
};
Root.displayName = 'SearchBar';

export const SearchBar = Object.assign(Root, {
  Input,
  Select,
  MultiSelect,
  Pills,
});
```

## SearchBar — consumer composition

```tsx
<SearchBar search={search} onSearchChange={onSearchChange}>
  <Flex direction={{ base: 'column', sm: 'row' }} gap="sm">
    <SearchBar.Input placeholder={t('feature.search.placeholder')} />
    <SearchBar.MultiSelect
      data={options}
      selected={selectedIds}
      onSelectedChange={setSelectedIds}
      placeholder={t('feature.search.multiSelect', { count: selectedIds.length })}
    />
  </Flex>
  <SearchBar.Pills items={pills} onRemove={onRemove} />
</SearchBar>
```

## SearchBar — companion hooks at page level

```typescript
const { search, onSearchChange } = useSearchBarSearch({
  initialSearch: params.search,
  onDebouncedChange: (value) => filter.onSearchChange(value),
});

const statusSelect = useSearchBarSelect({
  data: statusOptions,
  value: statusFilter,
  onChange: filter.onStatusChange,
});
```

## TeamFilter — domain wrapper

```tsx
export const TeamFilterRoot = ({ search, onSearchChange, selectedIds, onSelectedIdsChange, options, ...boxProps }: Props) => {
  const { t } = useTranslation();
  const { pills, onRemove } = useSearchBarMultiSelect({
    data: options,
    selected: selectedIds,
    onSelectedChange: onSelectedIdsChange,
  });

  return (
    <SearchBar search={search} onSearchChange={onSearchChange} {...boxProps}>
      <SearchBar.Input placeholder={t('feature.search.placeholder')} />
      <SearchBar.MultiSelect data={options} selected={selectedIds} onSelectedChange={onSelectedIdsChange} />
      <SearchBar.Pills items={pills} onRemove={onRemove} getRemoveAriaLabel={(item) => t('feature.search.remove', { name: item.label })} />
    </SearchBar>
  );
};
```

## DataGrid — assembly

```typescript
const Root = <D,>({ data, columns, children, loading, sorting, onSortingChange, … }: RootProps<D>) => {
  const value = useDataGridController({ data, columns, loading, sorting, onSortingChange, … });
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

## DataGrid — page consumer (ListPage)

```tsx
const columns: DataGrid.Column<Item>[] = useMemo(() => [
  { accessorKey: 'name', header: t('items.name'), cell: … },
  { accessorKey: 'status', header: t('items.status'), meta: { filterRender: … } },
], [t]);

<DataGrid.Root
  data={items}
  columns={columns}
  loading={loading}
  refetching={refetching}
  sorting={sorting.state}
  onSortingChange={sorting.onChange}
>
  <DataGrid.Grid collapse={RowCollapse} rowFooter={(row) => <RowMeta item={row.original} />} />
  <NoResultsState visible={isEmptyWithFilters} onClear={filter.onClear} />
  <Pagination … />
</DataGrid.Root>
```

Pagination and empty state are **siblings** inside `DataGrid.Root` — slot pattern.

## DataGrid — spec helper

```typescript
const renderGrid = (props?: Partial<DataGrid.RootProps<Item>>) =>
  render(
    <DataGrid.Root data={mockData} columns={mockColumns} {...props}>
      <DataGrid.Grid collapse={mockCollapse} />
    </DataGrid.Root>
  );
```

## CardWithActions — minimal Object.assign

```typescript
export const CardWithActions = Object.assign(Root, {
  Actions,
  Preview,
  ConfirmModal,
});
export type CardWithActionsProps = RootProps;
```

Optional: export context provider + mappers when the compound needs external state.

## Prompt templates

**New filter compound:**

> Using @react-compound-components, create `FilterBar` with Object.assign: context for search text, subparts Input/Select/Pills, companion hook `useFilterBarSearch`, utils for pill labels.

**New data compound:**

> Create generic `DataGrid` with namespace `{ Root, Grid, Cell, Pagination }`, `useDataGridController`, generics `<D>`, slot children for empty state + external pagination.

**Domain wrapper:**

> Add `StatusFilter` wrapping shared FilterBar with status select + i18n, same pattern as TeamFilter.
