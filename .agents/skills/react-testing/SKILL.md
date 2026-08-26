---
name: react-testing
description: >-
  Writes React tests using Testing Library patterns: component, page, hook, and pure
  util specs with defaultProps, renderComponent/runHook helpers, controller mocks,
  co-located mocks.ts, and i18n-safe assertions. Runner-agnostic (Vitest, Jest,
  Expo/Jest). Use when adding or fixing tests, writing *.spec.tsx files, mocking
  controllers/hooks/GraphQL, or when the user asks for React Testing Library conventions.
---

# React Testing

Opinionated patterns for **React + Testing Library**. Adapt the **test runner** and **project test-utils** import to the repo; keep the **structure and philosophy**.

## Before writing tests

1. Read project rules (`AGENTS.md`, `TESTING.md`) for: file suffix, folder names, test-utils path.
2. Detect stack:

| Detect                         | Use in tests                                                                |
| ------------------------------ | --------------------------------------------------------------------------- |
| `@test-utils` or `test-utils/` | Custom `render`, providers, re-exports                                      |
| Vitest                         | `vi.fn`, `vi.mock`, `vi.hoisted`, fake timers via `vi`                      |
| Jest                           | `jest.fn`, `jest.mock`; hoisting differs — see [reference.md](reference.md) |
| Apollo / GraphQL               | `MockedProvider` + `mocks.ts` factories                                     |
| React Router                   | `MemoryRouter` in wrapper or `AddProviders`                                 |
| i18n                           | **Do not mock** — import real i18n / `t()` for assertions                   |
| React Native                   | `@testing-library/react-native`, same patterns                              |

3. See [examples.md](examples.md) in this skill for full spec patterns.

## File placement & naming

| Target              | Location                                | Suffix                |
| ------------------- | --------------------------------------- | --------------------- |
| Component / section | `Feature/__specs__/Feature.spec.tsx`    | `.spec.tsx`           |
| Page                | `Page/__specs__/Page.page.spec.tsx`     | `.spec.tsx`           |
| Hook                | `hooks/__specs__/useHook.spec.ts(x)`    | `.spec.ts`            |
| Pure utils          | `utils/__specs__/util.spec.ts`          | `.spec.ts`            |
| Compound subpart    | `components/Sub/__tests__/Sub.spec.tsx` | per project exception |

Prefer `__specs__/` and `*.spec.*` — **not** `*.test.*` unless the project explicitly uses that.

## Universal test file skeleton

```typescript
describe('ComponentName', () => {
  const onAction = mockFn();
  const defaultProps: ComponentNameProps = { onAction };

  beforeEach(() => {
    clearAllMocks();
  });

  const renderComponent = (props: Partial<ComponentNameProps> = {}) =>
    render(<ComponentName {...defaultProps} {...props} />);

  it('calls onAction when the button is clicked', async () => {
    renderComponent();
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(onAction).toHaveBeenCalled();
  });
});
```

**`mockFn` / `clearAllMocks`:** map to `vi.*` (Vitest) or `jest.*` (Jest).

## Rules (always)

| Rule                          | Detail                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------- |
| `defaultProps`                | One constant with sensible defaults + mock callbacks                                  |
| `renderComponent` / `runHook` | Merge `{...defaultProps} {...overrides}` — never duplicate render boilerplate         |
| Test names                    | Verb form — **not** "should …" (`it('renders title')` ✓)                              |
| User-visible assertions       | Prefer `getByRole`, `getByLabelText`, accessible name; `getByTestId` only when needed |
| i18n strings                  | `t('key.path')` in expectations — not hardcoded English                               |
| Combine overlap               | One test for title + subtitle if both are static render checks                        |
| `beforeEach`                  | Reset mocks every test                                                                |
| Async UI                      | `await userEvent.*` + `waitFor` for GraphQL / effects                                 |
| State updates                 | Wrap hook calls in `act(() => …)`                                                     |

## Test layers — what to test where

| Layer                        | Test                                        | Mock                                                         |
| ---------------------------- | ------------------------------------------- | ------------------------------------------------------------ |
| **Pure utils**               | Inputs → outputs, edge cases                | Nothing                                                      |
| **Hooks**                    | Return shape, handlers, debounce, URL/state | Dependencies (`useQuery`, router) via wrapper or module mock |
| **Presentational component** | Renders props, fires callbacks              | Nothing or minimal                                           |
| **Section / page view**      | Branches, wiring props to children          | **Controller hook** + heavy children                         |
| **Integration (few)**        | GraphQL + providers end-to-end              | `MockedProvider` in `mocks.ts`                               |

**View tests mock the controller, not the data layer.** Hook tests own filter/query logic.

## Pattern 1 — Presentational component

- Real render via project `render()` (includes theme/providers if needed).
- `defaultProps` + `renderComponent`.
- Click/type with `userEvent`; assert callbacks and DOM.

## Pattern 2 — Page / section view (controller mock)

Mock the orchestrator; assert **branches** and **prop wiring**:

```typescript
const mockUseController = mockFn();

mockModule("../hooks/useFeatureController", () => ({
  useFeatureController: () => mockUseController(),
}));

beforeEach(() => {
  mockUseController.mockReturnValue(buildMockController());
});
```

Cover: loading, error, global empty, filtered empty, happy path, navigation handlers.

**`mocks.ts` alongside spec:** factories `mockItem()`, `buildMockController(overrides?)` with nested partial overrides.

## Pattern 3 — Thin section + namespaced controller

When view destructures `{ csv, upsert, edit }`:

- Mock `useSectionController` to return namespaced groups.
- Helpers: `baseCsv()`, `baseUpsert()`, `baseEdit()` — compose in each test.
- Mock child components with `mockFn` JSX stubs to assert **props passed** (`toHaveBeenCalledWith` / `expect.objectContaining`).
- Use `rerender` when testing open/close toggles.

Reference: see **Pattern 3** in [examples.md](examples.md) (section view + namespaced controller mock).

## Pattern 4 — Page composition

Mock **sibling sections** at module boundary; assert both mount and conditional hide:

```typescript
mockModule('../components', () => ({
  SectionA: () => <div data-testid="section-a" />,
  SectionB: () => <div data-testid="section-b" />,
}));
```

Reference: see **Pattern 4** in examples — page composition with mocked sibling sections.

## Pattern 5 — Hook tests

```typescript
const runHook = (initialProps: Partial<Props> = {}) =>
  renderHook(() => useMyHook({ ...defaultProps, ...initialProps }), {
    wrapper,
  });

it("updates value when onChange is called", () => {
  const { result } = runHook();
  act(() => result.current.onChange({ foo: 1 }));
  expect(result.current.value).toEqual({ foo: 1 });
});
```

- **Router-dependent hooks:** wrapper with `MemoryRouter initialEntries={[url]}`.
- **Debounce:** fake timers → act → advance time → assert → restore real timers.
- **Prop changes:** `rerender({ teamId: 'new' })`.
- Group with nested `describe('onSearchChange', () => …)`.

## Pattern 6 — Pure utils

No RTL. Import functions directly; table-driven `it.each` for variants. Factory helpers for domain objects (`baseRow(overrides)`).

## Pattern 7 — GraphQL / server integration

Keep mocks in **`mocks.ts`** next to the spec:

```typescript
export const mockItemsQuery = () => ({
  request: { query: ItemsDocument, variables: { … } },
  result: mockFn(() => ({ data: { items: { nodes: […] } } })),
});
```

- `result` as **mock function** so tests can assert it was invoked.
- Wrap with provider wrapper: `<AddProviders graphqlMocks={[…]}>` (or project's equivalent).

Prefer controller-mocked page tests; use GraphQL mocks when testing wiring **through** the real hook chain.

## Mocking guidelines

| Mock                         | When                                          |
| ---------------------------- | --------------------------------------------- |
| Controller / section hook    | Page & thin section tests                     |
| Child components             | Assert prop wiring without rendering heavy UI |
| `useNavigate`, layout shells | Page tests — reduce noise                     |
| i18n                         | **Avoid** — use real catalog                  |
| Implementation details       | **Avoid** — test behavior users see           |
| Entire RTL / react           | **Never**                                     |

**Vitest hoisting:** use `vi.hoisted(() => ({ mockFn: vi.fn() }))` when mocks reference each other before `vi.mock`. Jest: assign mocks inside factory or use `jest.requireActual` patterns — see reference.

## Queries priority

1. `getByRole` (+ `name` from visible text or `t()`)
2. `getByLabelText`
3. `getByText` (i18n string)
4. `getByTestId` — layout shells, mocked stubs

## Checklist — new feature tests

```
- [ ] utils/__specs__/*.spec.ts for pure logic
- [ ] hooks/__specs__ for filter/query/action hooks
- [ ] __specs__/Component.spec.tsx with defaultProps + renderComponent
- [ ] Page __specs__/*.page.spec.tsx mocks controller + mocks.ts builders
- [ ] Empty / error / filtered-empty branches covered
- [ ] i18n keys in assertions
- [ ] No duplicate tests merged where sensible
```

## Anti-patterns

- Testing implementation (hook call order, internal state variable names).
- Hardcoded UI strings while project uses i18n.
- Giant integration test for every branch — mock controller at view layer.
- Missing `act` on hook updates → flaky tests.
- Forgetting to restore fake timers in `afterEach`.
- `should` in test titles.
- GraphQL mocks inline in spec file — use `mocks.ts`.

## Additional resources

- [reference.md](reference.md) — runner mapping, providers, mock hoisting, RN notes.
- [examples.md](examples.md) — page, section, hook, and util spec patterns.
