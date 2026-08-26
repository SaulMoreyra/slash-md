# Examples — React Feature Hook Architecture

## Pattern A — ListPage mapping

| This pattern                    | Typical file                                |
| ------------------------------- | --------------------------------------------- |
| `FeatureScreen.tsx`             | `ListPage.tsx`                              |
| `useFeatureController`          | `hooks/useListController.ts`              |
| `useFeatureFilter`              | `hooks/useListFilter.ts`                  |
| `useFeatureQuery`               | `hooks/useListQuery.ts`                   |
| `useFeatureSort`                | `hooks/useListSort.ts`                    |
| Pagination hook                 | `useCursorPagination` or shared hook      |
| `utils/`                        | filter URL serializers next to filter hook    |
| `FilterBar`                     | `components/FilterBar/`                       |
| `EmptyState` / `NoResultsState` | `components/EmptyState/`, `NoResultsState/`   |
| Modal nested hook               | `EditItemModal/hooks/useEditController.ts` |

Controller excerpt (conceptual):

```typescript
export const useListController = () => {
  const filter = useListFilter();
  const { data, previousData, loading, error, refetch } = useListQuery({
    variables: filter.args,
  });

  const items = data?.nodes ?? previousData?.nodes ?? [];
  const isLoadingData = loading && !previousData;
  const refetching = loading && !!previousData;
  const shouldShowList =
    items.length > 0 || isLoadingData || refetching || filter.isFiltering;
  const isEmptyWithFilters = filter.isFiltering && items.length === 0;

  return { items, loading, refetching, filter, shouldShowList, isEmptyWithFilters, … };
};
```

---

## Pattern B — ImportSection mapping

### Tree

```
CreateItemPage/
├── CreateItemPage.tsx
├── hooks/useCreateItemPageController.ts     # { importing, onImportActive } only
└── components/ImportSection/
    ├── ImportSection.tsx                    # thin view
    ├── hooks/
    │   ├── useImportSectionController.ts    # composes source + submit + edit
    │   ├── useSourceImport.ts               # state owner
    │   ├── useSubmitImport.ts               # submit orchestration
    │   ├── useDraftEdit.ts                  # edit index
    │   ├── useParseFileMutation.ts
    │   └── useBatchCreateMutation.ts
    ├── utils/drafts.ts
    ├── utils/submitExecution.ts
    └── types/
```

### Hook mapping

| Role | Typical file |
|------|---------------------------|
| Page bridge | `useCreateItemPageController` — `importing` hides manual form |
| Section controller | `useImportSectionController` |
| Source / state owner | `useSourceImport` — drafts, upload, parse, reset |
| Submit action | `useSubmitImport` — batch create, toasts, navigate |
| Edit selection | `useDraftEdit` — `editingIndex`, `onEditDraft`, `onSaveDraft` |
| Parse mutation | `useParseFileMutation` |
| Batch mutation | `useBatchCreateMutation` |
| Form modal bridge | `EditDraftModal/hooks/useEditModalController` |
| Child UI micro-hook | `ImportPreview/hooks/useConfirmReset` |

### Section view (wiring)

```tsx
export const ImportSection = ({ onImportActive }) => {
  const { source, submit, edit } = useImportSectionController({ onImportActive });

  return (
    <>
      <EditDraftModal
        draft={edit.draft ?? null}
        opened={!!edit.draft}
        onClose={edit.onClose}
        onSave={edit.onSaveDraft}
      />
      {!source.hasData && (
        <UploadCard onFileSelect={source.onFileSelect} loading={source.isProcessing} />
      )}
      <ImportPreview
        drafts={source.drafts}
        onEditDraft={edit.onEditDraft}
        onUpdateDraft={source.onUpdateDraft}
        onRemoveDraft={source.onRemoveDraft}
        canSubmit={source.canSubmit}
        submitting={submit.isSubmitting}
        onSubmit={submit.onSubmit}
        onReset={source.reset}
      />
    </>
  );
};
```

### Page (cross-section only)

```tsx
export const CreateItemPage = () => {
  const { importing, onImportActive } = useCreateItemPageController();
  return (
    <Stack>
      <ImportSection onImportActive={onImportActive} />
      {!importing && <ManualEntrySection />}
    </Stack>
  );
};
```

### Parallel section — manual entry (flat controller)

`ManualEntrySection/hooks/useManualEntryController.ts` composes:

- `useItemFormController` (shared form)
- `useCreateItem` (save handlers)
- `usePricePreviewQuery` (derived query from form values)

Returns `{ controller, preview, saving, onSaveAndFinish, … }` — form workflow variant of Pattern B.

---

## Pattern A — Expo: Orders list sketch

```
app/(seller)/orders.tsx          → re-exports OrdersScreen
screens/Orders/
├── OrdersScreen.tsx
├── hooks/
│   ├── useOrdersController.ts
│   ├── useOrdersFilter.ts
│   └── useOrdersQuery.ts
├── components/
│   ├── OrdersFilterBar.tsx
│   ├── OrderListItem.tsx
│   ├── OrdersEmptyState.tsx
│   └── OrdersNoResultsState.tsx
└── utils/
    └── ordersFilterToVariables.ts
```

**OrdersScreen.tsx** (thin):

```tsx
export function OrdersScreen() {
  const {
    orders,
    loading,
    refetching,
    filter,
    shouldShowList,
    isEmptyWithFilters,
    pagination,
  } = useOrdersController();

  if (!shouldShowList) {
    return (
      <OrdersEmptyState onCreateOrder={() => router.push("/orders/new")} />
    );
  }

  return (
    <View style={styles.container}>
      <OrdersFilterBar
        search={filter.values.search}
        status={filter.values.status}
        onSearchChange={filter.onSearchChange}
        onStatusChange={filter.onStatusChange}
        onClearFilters={filter.onClearFilters}
      />

      {isEmptyWithFilters ? (
        <OrdersNoResultsState onClear={filter.onClearFilters} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <OrderListItem order={item} />}
          refreshing={refetching}
          onRefresh={pagination.onRefresh}
          onEndReached={pagination.onLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loading ? <ActivityIndicator /> : null}
        />
      )}
    </View>
  );
}
```

**useOrdersFilter.ts** — no URL; AsyncStorage optional:

```typescript
export function useOrdersFilter() {
  const [values, setValues] = useState<OrdersFilterValues>(DEFAULTS);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  useEffect(() => {
    setValues((v) => ({
      ...v,
      search: debouncedSearch || undefined,
      cursor: undefined,
    }));
  }, [debouncedSearch]);

  const isFiltering = useMemo(
    () => Boolean(values.search || values.status),
    [values],
  );

  return {
    values,
    args: useMemo(() => ordersFilterToVariables(values), [values]),
    isFiltering,
    onSearchChange: setSearchInput,
    onStatusChange: (status) =>
      setValues((v) => ({ ...v, status, cursor: undefined })),
    onClearFilters: () => {
      setSearchInput("");
      setValues(DEFAULTS);
    },
  };
}
```

## Screen test (mock controller)

```tsx
vi.mock('../hooks/useOrdersController');

const mockController = vi.mocked(useOrdersController);

it('shows no-results when filters match nothing', () => {
  mockController.mockReturnValue({
    orders: [],
    loading: false,
    refetching: false,
    shouldShowList: true,
    isEmptyWithFilters: true,
    filter: { onClearFilters: vi.fn(), … },
    …
  });

  render(<OrdersScreen />);
  expect(screen.getByText(i18n.t('orders.noResults'))).toBeOnTheScreen();
});
```

## Prompt templates

**New screen from scratch:**

> Using @react-list-screen-pattern, create `screens/Products/` with filter by category, search, and infinite scroll. Use React Query. Match existing `screens/Profile/` test conventions.

**Refactor fat page:**

> Refactor `pages/Admin/Users.tsx` to @react-list-screen-pattern: extract `useUsersController`, `useUsersFilter`, `useUsersQuery`, and move table columns only into the page file.

**Cross-project port (list):**

> Port Pattern A to Expo as `InventoryScreen`. FlatList instead of Table; filters in local state, not URL.

**Import / workflow section:**

> Using @react-list-screen-pattern Pattern B, add `components/ImportProducts/` with file pick, preview table, edit modal, and batch create mutation. Namespaced controller `{ source, submit, edit }`. Page only toggles `importing` to hide the manual form.

**Refactor monolithic upload:**

> Split `UploadPage.tsx` into useSourceImport + useSubmitImport + useDraftEdit. Move reconcile logic to `utils/`.
