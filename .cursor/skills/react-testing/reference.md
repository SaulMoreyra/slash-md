# Reference — React Testing

## Test pyramid for controller architecture

```
        ┌─────────────┐
        │ Page spec   │  mock useFeatureController, assert branches
        ├─────────────┤
        │ Section spec│  mock useSectionController, assert wiring
        ├─────────────┤
        │ Hook specs  │  real hook, mock deps / wrapper
        ├─────────────┤
        │ Util specs  │  pure functions
        └─────────────┘
        Optional: few GraphQL integration tests through providers
```

Aligns with `@react-list-screen-pattern`: views stay thin → tests mock orchestrators; hooks get focused specs.

## Runner mapping (Vitest ↔ Jest)

| Concern | Vitest | Jest |
|---------|--------|------|
| Mock function | `vi.fn()` | `jest.fn()` |
| Module mock | `vi.mock('path', factory)` | `jest.mock('path', factory)` |
| Clear mocks | `vi.clearAllMocks()` | `jest.clearAllMocks()` |
| Fake timers | `vi.useFakeTimers()` | `jest.useFakeTimers()` |
| Advance time | `vi.advanceTimersByTime(ms)` | `jest.advanceTimersByTime(ms)` |
| Restore timers | `vi.useRealTimers()` | `jest.useRealTimers()` |
| Hoisted mocks | `vi.hoisted(() => ({ … }))` | Define mocks in factory; or manual `jest.mock` hoisting rules |
| Spy | `vi.spyOn(obj, 'method')` | `jest.spyOn(obj, 'method')` |

Skill examples use `mockFn()` / `mockModule()` verbally — substitute per project.

### Vitest `vi.hoisted` pattern

Needed when mock components reference mock functions declared before `vi.mock`:

```typescript
const { mockController, MockChild } = vi.hoisted(() => ({
  mockController: vi.fn(),
  MockChild: vi.fn((props) => <div data-testid="child" />),
}));

vi.mock('../hooks', () => ({
  useController: (...args: unknown[]) => mockController(...args),
}));
```

### Jest equivalent (conceptual)

```typescript
const mockController = jest.fn();

jest.mock('../hooks', () => ({
  useController: (...args: unknown[]) => mockController(...args),
}));
```

If TDZ errors occur, move mock fn creation inside the factory and export via a shared test-only module.

## Project test-utils pattern

Many repos wrap RTL:

```typescript
// test-utils/index.ts — import real i18n once
import '@/i18n';
export * from '@testing-library/react';
export { render } from './render';        // + ThemeProvider
export { default as AddProviders } from './AddProviders'; // + Router + Apollo
export { default as userEvent } from '@testing-library/user-event';
```

**Always import from project alias** (`@test-utils`, `~/test-utils`) — not directly from `@testing-library/react` unless project has no wrapper.

### Provider wrapper responsibilities

| Provider | When |
|----------|------|
| Theme / UI kit | Default `render()` |
| `MemoryRouter` | Routes, `useNavigate`, URL hooks |
| `MockedProvider` | GraphQL integration tests |
| Context providers | Only when hook under test needs them |

Hook testing router + URL:

```typescript
renderHook(() => useFilter(), {
  wrapper: ({ children }) => (
    <MemoryRouter initialEntries={['/?search=foo']}>{children}</MemoryRouter>
  ),
});
```

## `mocks.ts` conventions

Colocate with page/section spec. Export:

| Export | Purpose |
|--------|---------|
| `mockEntity(overrides?)` | Minimal valid domain object |
| `buildMockController(overrides?)` | Full controller return with sensible defaults |
| `mockXxxQuery()` / `mockXxxMutation()` | GraphQL mock objects for `MockedProvider` |

Controller builder pattern — nested partials:

```typescript
export const buildMockController = (overrides: {
  sales?: Partial<{ values: Item[]; error: Error }>;
  filters?: Partial<{ filtering: boolean }>;
} = {}) => ({
  sales: { values: [], error: undefined, loading: false, ...overrides.sales },
  filters: { filtering: false, onClearFilters: mockFn(), ...overrides.filters },
  pagination: { … },
});
```

Tests override only what differs per case.

## Namespaced controller test helpers

For `{ csv, upsert, edit }` returns:

```typescript
const baseCsv = () => ({ hasData: false, drafts: [], onFileSelect: mockFn(), … });
const baseUpsert = () => ({ isImporting: false, onSubmit: mockFn() });
const baseEdit = () => ({ draft: null, onClose: mockFn(), onEdit: mockFn() });

mockController.mockReturnValue({
  csv: { ...baseCsv(), hasData: true, drafts: [item] },
  upsert: baseUpsert(),
  edit: baseEdit(),
});
```

## Assertion patterns

### User interaction

```typescript
await userEvent.click(screen.getByRole('button', { name: t('key.save') }));
await userEvent.type(screen.getByLabelText(t('key.search')), 'query');
expect(handler).toHaveBeenCalledWith(expected);
```

### Async GraphQL

```typescript
render(<AddProviders graphqlMocks={[queryMock]}><Page /></AddProviders>);
await waitFor(() => {
  expect(screen.getByText(t('items.title'))).toBeInTheDocument();
});
expect(queryMock.result).toHaveBeenCalled();
```

### Prop wiring on mocked child

```typescript
expect(MockPreview).toHaveBeenCalled();
const props = MockPreview.mock.calls.at(-1)![0];
expect(props).toEqual(expect.objectContaining({ canImport: true, onImport: submitFn }));
```

### Conditional render

```typescript
expect(screen.queryByTestId('upload-card')).not.toBeInTheDocument();
expect(screen.getByText(t('empty.title'))).toBeInTheDocument();
```

## Debounce test recipe

```typescript
beforeEach(() => useFakeTimers());
afterEach(() => useRealTimers());

act(() => result.current.onSearchChange('hello'));
expect(urlHasSearch('hello')).toBe(false);

act(() => advanceTimersByTime(DEBOUNCE_MS));
expect(urlHasSearch('hello')).toBe(true);
```

Import `DEBOUNCE_MS` from hook module when exported — avoids magic numbers drifting.

## React Native / Expo

| Web | Native |
|-----|--------|
| `@testing-library/react` | `@testing-library/react-native` |
| `screen.getByRole('button')` | `getByText`, `getByA11yLabel` — roles differ |
| `userEvent` | `fireEvent.press`, `@testing-library/user-event` where supported |
| CSS queries | `UNSAFE_queryByProps` sparingly; prefer accessibility |

Same **defaultProps**, **renderComponent**, **mock controller** patterns apply.

## When to combine tests

Combine when assertions are **same setup, same act, multiple static outputs**:

```typescript
it('renders title and description', () => {
  renderComponent();
  expect(screen.getByText(t('title'))).toBeInTheDocument();
  expect(screen.getByText(t('description'))).toBeInTheDocument();
});
```

Keep separate when **acts differ** or **branches are mutually exclusive** (empty vs list).

## Flaky test fixes

| Symptom | Fix |
|---------|-----|
| State update not reflected | Missing `act()` |
| Debounce race | Fake timers + advance inside `act` |
| GraphQL never resolves | Check mock variables match hook exactly |
| i18n key missing | Import i18n in test setup, not mocked |
| `waitFor` timeout | Use `findBy*` or increase timeout; verify mock return |
