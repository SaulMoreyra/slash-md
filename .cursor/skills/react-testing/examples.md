# Examples — React Testing

Generic patterns — substitute your test-utils import and mock API (`vi` / `jest`).

## Pattern 1 — Presentational component

```typescript
describe('SaveButton', () => {
  const onSave = mockFn();
  const defaultProps = { onSave, disabled: false };

  beforeEach(() => clearAllMocks());

  const renderComponent = (props = {}) =>
    render(<SaveButton {...defaultProps} {...props} />);

  it('calls onSave when clicked', async () => {
    renderComponent();
    await userEvent.click(screen.getByRole('button', { name: t('common.save') }));
    expect(onSave).toHaveBeenCalled();
  });
});
```

## Pattern 2 — Page with mocked controller

```typescript
const mockUseController = mockFn();
mockModule('../hooks', () => ({ useOrdersController: () => mockUseController() }));

describe('OrdersPage', () => {
  beforeEach(() => {
    clearAllMocks();
    mockUseController.mockReturnValue(buildMockOrdersController());
  });

  it('renders title and row from controller', () => {
    mockUseController.mockReturnValue(
      buildMockOrdersController({ orders: { values: [mockOrder()] } })
    );
    render(<OrdersPage />);
    expect(screen.getByRole('heading', { name: t('orders.title') })).toBeInTheDocument();
  });

  it('shows filter empty state and calls onClearFilters', async () => {
    const controller = buildMockOrdersController({ filters: { filtering: true } });
    mockUseController.mockReturnValue(controller);
    render(<OrdersPage />);
    await userEvent.click(screen.getByRole('button', { name: t('orders.emptyFiltered.clear') }));
    expect(controller.filters.onClearFilters).toHaveBeenCalled();
  });
});
```

`mocks.ts`: `mockOrder(overrides?)`, `buildMockOrdersController({ orders?, filters? })`.

## Pattern 3 — Section view + namespaced controller

Mock `useImportSectionController`; use helpers `baseSource()`, `baseSubmit()`, `baseEdit()`.

Mock child components with hoisted stubs; assert props via `expect.objectContaining`.

Test branches: show upload when `!source.hasData`, wire `onSubmit` to preview, modal `opened` toggles with `edit.draft`.

## Pattern 4 — Page composition

```typescript
mockModule('../components', () => ({
  ImportSection: () => <div data-testid="import-section" />,
  ManualEntrySection: () => <div data-testid="manual-section" />,
}));

it('renders both sections', () => {
  render(<CreateItemPage />);
  expect(screen.getByTestId('import-section')).toBeInTheDocument();
  expect(screen.getByTestId('manual-section')).toBeInTheDocument();
});
```

## Pattern 5 — Hook with URL + debounce

```typescript
const runHook = (url = '/') =>
  renderHook(
    () => {
      const filter = useListFilter();
      const { search } = useLocation();
      return { filter, search };
    },
    { wrapper: ({ children }) => <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter> }
  );

it('debounces search into URL', () => {
  useFakeTimers();
  const { result } = runHook('/');
  act(() => result.current.filter.onSearchChange('hello'));
  expect(new URLSearchParams(result.current.search).get('q')).toBeNull();
  act(() => advanceTimersByTime(DEBOUNCE_MS));
  expect(new URLSearchParams(result.current.search).get('q')).toBe('hello');
  useRealTimers();
});
```

## Pattern 6 — Pure utils

Direct imports, factory helpers, `it.each` — no render.

## Pattern 7 — GraphQL integration

```typescript
// mocks.ts
export const mockItemsQuery = () => ({
  request: { query: ItemsDocument, variables: { … } },
  result: mockFn(() => ({ data: { items: { nodes: [] } } })),
});

render(
  <TestProviders graphqlMocks={[mockItemsQuery()]}>
    <ItemDetail id="1" />
  </TestProviders>
);
```

## Prompt templates

> Add `Orders.page.spec.tsx` with @react-testing: mock controller, `mocks.ts`, empty/error/filtered/list branches, `t()` for strings.

> Add `hooks/__specs__/useOrdersFilter.spec.ts` with `runHook`, MemoryRouter, debounce timers.
